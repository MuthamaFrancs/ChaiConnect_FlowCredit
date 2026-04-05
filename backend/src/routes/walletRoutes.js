/**
 * Wallet Routes — /api/wallet
 *
 * GET  /api/wallet/:farmerId            → get or create wallet + balance
 * GET  /api/wallet/:farmerId/txns       → paginated ledger
 * POST /api/wallet/:farmerId/deposit    → credit wallet (used by C2B & cooperative payments)
 * POST /api/wallet/:farmerId/withdraw   → initiate B2C withdrawal via Daraja
 * POST /api/wallet/b2c/result          → Daraja B2C callback — confirm or refund
 */
const express = require('express');
const mpesaService = require('../services/MpesaService');
const smsService   = require('../services/SmsService');
const { requireAuth } = require('../middleware/auth');
const { Wallet, WalletTx, Farmer } = require('../models');

const router = express.Router();

// ── Internal helper: get-or-create wallet ────────────────────
async function getOrCreateWallet(farmerId) {
  let wallet = await Wallet.findOne({ where: { farmerId } });
  if (!wallet) {
    wallet = await Wallet.create({
      id:      `wlt-${farmerId}-${Date.now().toString(36)}`,
      farmerId,
    });
  }
  return wallet;
}

// ── Internal helper: create ledger entry ─────────────────────
async function recordTx(wallet, data) {
  const newBalance = Number(wallet.balance) + (data.delta ?? 0);
  const tx = await WalletTx.create({
    id:           `wtx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    farmerId:     wallet.farmerId,
    walletId:     wallet.id,
    type:         data.type,
    amount:       Math.abs(data.amount),
    grossAmount:  data.grossAmount,
    deduction:    data.deduction ?? 0,
    deductionType:data.deductionType,
    status:       data.status ?? 'completed',
    reference:    data.reference,
    mpesaReceipt: data.mpesaReceipt,
    balanceAfter: newBalance,
    note:         data.note,
  });
  return tx;
}

// ═══════════════════════════════════════════════════════════
//  GET /api/wallet/:farmerId
//  Returns wallet balance + lifetime stats
// ═══════════════════════════════════════════════════════════
router.get('/:farmerId', requireAuth, async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.params.farmerId);
    const farmer = await Farmer.findOne({ where: { id: req.params.farmerId }, raw: true }).catch(() => null);
    res.json({ wallet, farmer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  GET /api/wallet/:farmerId/txns
//  Paginated transaction history
// ═══════════════════════════════════════════════════════════
router.get('/:farmerId/txns', requireAuth, async (req, res) => {
  const limit  = Math.min(Number(req.query.limit)  || 20, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const transactions = await WalletTx.findAll({
      where: { farmerId: req.params.farmerId },
      order: [['createdAt', 'DESC']],
      limit, offset, raw: true,
    });
    res.json({ transactions, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  POST /api/wallet/:farmerId/deposit
//  Credit the wallet — called by C2B webhook & admin tools.
//  Body: { amount, grossAmount?, deduction?, deductionType?, reference?, mpesaReceipt?, note? }
// ═══════════════════════════════════════════════════════════
router.post('/:farmerId/deposit', requireAuth, async (req, res) => {
  const { amount, grossAmount, deduction, deductionType, reference, mpesaReceipt, note } = req.body;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be positive' });

  try {
    const wallet = await getOrCreateWallet(req.params.farmerId);
    const net = Number(amount);

    // Update wallet
    await Wallet.update({
      balance:       Number(wallet.balance) + net,
      totalReceived: Number(wallet.totalReceived) + (Number(grossAmount) || net),
    }, { where: { id: wallet.id } });

    const tx = await recordTx(wallet, {
      type: 'deposit', amount: net, grossAmount: grossAmount || net,
      deduction, deductionType, reference, mpesaReceipt, note,
      status: 'completed', delta: net,
    });

    // SMS notification
    const farmer = await Farmer.findOne({ where: { id: req.params.farmerId }, raw: true }).catch(() => null);
    if (farmer) {
      const newBalance = Number(wallet.balance) + net;
      smsService.send?.({
        to: farmer.phone,
        message: `ChaiConnect: KSh ${net.toLocaleString()} deposited. Wallet balance: KSh ${newBalance.toLocaleString()}. Ref: ${mpesaReceipt || reference || tx.id}`,
        type: 'wallet_deposit',
      });
    }

    const updated = await Wallet.findOne({ where: { id: wallet.id }, raw: true });
    res.json({ ok: true, wallet: updated, tx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  POST /api/wallet/:farmerId/withdraw
//  Initiate B2C withdrawal to farmer's M-Pesa.
//  Flow: reserve funds → call Daraja B2C → wait for callback.
//  Body: { amount, phone? }
// ═══════════════════════════════════════════════════════════
router.post('/:farmerId/withdraw', requireAuth, async (req, res) => {
  const farmerId = req.params.farmerId;
  const amount   = Number(req.body.amount);
  if (!amount || amount < 50)   return res.status(400).json({ error: 'Minimum withdrawal is KSh 50' });
  if (amount > 70000)           return res.status(400).json({ error: 'Maximum withdrawal is KSh 70,000 per transaction' });

  try {
    const wallet = await getOrCreateWallet(farmerId);
    if (Number(wallet.balance) < amount) {
      return res.status(400).json({ error: `Insufficient balance. Available: KSh ${Number(wallet.balance).toLocaleString()}` });
    }

    const farmer = await Farmer.findOne({ where: { id: farmerId }, raw: true });
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    const phone = req.body.phone
      ? `254${String(req.body.phone).replace(/\D/g, '').slice(-9)}`
      : `254${String(farmer.phone).replace(/\D/g, '').slice(-9)}`;

    // 1. Reserve funds (prevent double-spend)
    await Wallet.update({
      balance:        Number(wallet.balance) - amount,
      pendingBalance: Number(wallet.pendingBalance) + amount,
    }, { where: { id: wallet.id } });

    // 2. Create pending ledger entry
    const tx = await recordTx({ ...wallet, balance: Number(wallet.balance) - amount }, {
      type: 'withdrawal', amount, status: 'pending',
      note: `Withdrawal to ${phone} — pending Daraja B2C`,
      delta: -amount,
    });

    // 3. Call Daraja B2C
    let darajaResp;
    try {
      darajaResp = await mpesaService.sendB2C({
        phone, amount,
        remarks: `ChaiConnect wallet withdrawal — ${farmer.name}`,
      });
    } catch (mpesaErr) {
      // Daraja failed — refund reservation immediately
      await Wallet.update({
        balance:        Number(wallet.balance),   // restore original
        pendingBalance: Number(wallet.pendingBalance),
      }, { where: { id: wallet.id } });
      await WalletTx.update({ status: 'failed', note: `Daraja error: ${mpesaErr.message}` }, { where: { id: tx.id } });
      return res.status(502).json({ error: 'M-Pesa unavailable — funds not withdrawn', detail: mpesaErr.message });
    }

    const conversationId = darajaResp.ConversationID;
    const simulated      = !!darajaResp._simulated;

    // 4. Update ledger entry with M-Pesa reference
    await WalletTx.update({ mpesaReceipt: conversationId }, { where: { id: tx.id } });

    // If simulated, auto-confirm immediately
    if (simulated) {
      await Wallet.update({
        pendingBalance: Math.max(0, Number(wallet.pendingBalance)),
        totalWithdrawn: Number(wallet.totalWithdrawn) + amount,
      }, { where: { id: wallet.id } });
      await WalletTx.update({ status: 'completed' }, { where: { id: tx.id } });
    }

    const updated = await Wallet.findOne({ where: { id: wallet.id }, raw: true });

    smsService.send?.({
      to: farmer.phone,
      message: `ChaiConnect: KSh ${amount.toLocaleString()} withdrawal ${simulated ? 'sent (simulated)' : 'initiated'}. Ref: ${conversationId}. New balance: KSh ${Number(updated.balance).toLocaleString()}.`,
      type: 'wallet_withdrawal',
    });

    return res.json({
      ok: true, simulated, ref: conversationId,
      wallet: updated, tx: { ...tx, mpesaReceipt: conversationId, status: simulated ? 'completed' : 'pending' },
      message: simulated
        ? 'Simulated withdrawal — funds released immediately'
        : 'Withdrawal initiated — M-Pesa payment in progress',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  POST /api/wallet/b2c/result
//  Daraja B2C callback — confirm or refund pending withdrawal.
//  Safaricom calls this after processing our B2C request.
// ═══════════════════════════════════════════════════════════
router.post('/b2c/result', async (req, res) => {
  const result = req.body?.Result;
  if (!result) return res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' });

  const { ConversationID, ResultCode, TransactionID } = result;

  try {
    const tx = await WalletTx.findOne({ where: { mpesaReceipt: ConversationID, type: 'withdrawal' } });
    if (!tx) return res.json({ ResultCode: 0, ResultDesc: 'Unknown transaction' });

    if (ResultCode === 0) {
      // ✅ Success — confirm withdrawal
      await WalletTx.update({ status: 'completed', mpesaReceipt: TransactionID || ConversationID }, { where: { id: tx.id } });
      await Wallet.update(
        sequelize => ({
          pendingBalance: sequelize.literal(`GREATEST(0, pendingBalance - ${tx.amount})`),
          totalWithdrawn: sequelize.literal(`totalWithdrawn + ${tx.amount}`),
        }),
        { where: { farmerId: tx.farmerId } },
      );
    } else {
      // ❌ Failed — refund reserved funds
      await WalletTx.update({ status: 'failed', note: `Daraja error code: ${ResultCode}` }, { where: { id: tx.id } });
      await Wallet.update(
        sequelize => ({
          balance:        sequelize.literal(`balance + ${tx.amount}`),
          pendingBalance: sequelize.literal(`GREATEST(0, pendingBalance - ${tx.amount})`),
        }),
        { where: { farmerId: tx.farmerId } },
      );
    }
  } catch (err) {
    console.error('Wallet B2C result error:', err.message);
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;
