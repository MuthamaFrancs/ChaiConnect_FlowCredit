const express = require('express');
const mpesaService = require('../services/MpesaService');
const creditScoringService = require('../services/CreditScoringService');
const smsService = require('../services/SmsService');
const { requireAuth } = require('../middleware/auth');

const { Farmer, Delivery, Loan, Payment, MpesaFeed, Complaint } = require('../models');

const router = express.Router();

// ═══════════════════════════════════════════════════════════
//  FARMERS
// ═══════════════════════════════════════════════════════════
router.get('/farmers', requireAuth, async (_req, res) => {
  try {
    const farmers = await Farmer.findAll({ raw: true });
    res.json({ farmers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/farmers/:id', requireAuth, async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ where: { id: req.params.id }, raw: true });
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });
    return res.json({ farmer });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/farmers', requireAuth, async (req, res) => {
  const { name, phone, factory, zone, cooperative } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });

  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  const memberNo = name.split(' ').map(w => w[0]).join('').toUpperCase() + String(Math.floor(Math.random() * 900) + 100);

  try {
    const farmer = await Farmer.create({
      id, name, phone, memberNo,
      factory: factory || 'Kiambu Tea Factory',
      zone: zone || 'North Ridge',
      cooperative: cooperative || 'Kiambu Tea Growers SACCO',
      creditScore: 50, creditTier: 'C', loanFlow: 'eligible',
      gradeTrend: 'C', activeSince: new Date().toISOString().slice(0, 10),
      totalKg: 0, totalEarned: 0, status: 'Active',
    });
    res.status(201).json({ farmer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/farmers/:id', requireAuth, async (req, res) => {
  try {
    const [updated] = await Farmer.update(req.body, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ error: 'Farmer not found' });
    const farmer = await Farmer.findOne({ where: { id: req.params.id }, raw: true });
    return res.json({ farmer });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Farmer-specific sub-resources ─────────────────────────
router.get('/farmers/:id/deliveries', requireAuth, async (req, res) => {
  try {
    const deliveries = await Delivery.findAll({
      where: { farmerId: req.params.id }, raw: true, order: [['date', 'DESC']],
    });
    res.json({ deliveries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/farmers/:id/loans', requireAuth, async (req, res) => {
  try {
    const loans = await Loan.findAll({ where: { farmerId: req.params.id }, raw: true });
    res.json({ loans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/farmers/:id/payments', requireAuth, async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { farmerId: req.params.id }, raw: true, order: [['createdAt', 'DESC']],
    });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  CREDIT SCORING
// ═══════════════════════════════════════════════════════════
router.get('/farmers/:id/credit-score', requireAuth, async (req, res) => {
  const farmerId = req.params.id;
  try {
    const farmer = await Farmer.findOne({ where: { id: farmerId }, raw: true });
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    const deliveries = await Delivery.findAll({ where: { farmerId }, raw: true });
    const loans      = await Loan.findAll({ where: { farmerId }, raw: true });
    const payments   = await Payment.findAll({ where: { farmerId }, raw: true });

    const result = creditScoringService.calculate({ farmer, deliveries, loans, payments });
    const maxLoan = creditScoringService.maxLoanAmount(result.grade);

    await Farmer.update(
      { creditScore: result.score, creditTier: result.grade },
      { where: { id: farmerId } },
    );

    smsService.onCreditScoreUpdate({ farmer, newScore: result.score, grade: result.grade });

    return res.json({ ...result, maxLoanAmount: maxLoan, farmerId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/credit-scores/recalculate', requireAuth, async (_req, res) => {
  try {
    const farmers = await Farmer.findAll({ raw: true });
    const results = [];
    for (const farmer of farmers) {
      const deliveries = await Delivery.findAll({ where: { farmerId: farmer.id }, raw: true });
      const loans      = await Loan.findAll({ where: { farmerId: farmer.id }, raw: true });
      const payments   = await Payment.findAll({ where: { farmerId: farmer.id }, raw: true });
      const result = creditScoringService.calculate({ farmer, deliveries, loans, payments });
      await Farmer.update({ creditScore: result.score, creditTier: result.grade }, { where: { id: farmer.id } });
      results.push({ farmerId: farmer.id, name: farmer.name, ...result });
    }
    res.json({ recalculated: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  DELIVERIES
// ═══════════════════════════════════════════════════════════
router.get('/deliveries', requireAuth, async (_req, res) => {
  try {
    const deliveries = await Delivery.findAll({ raw: true, order: [['date', 'DESC']], limit: 100 });
    res.json({ deliveries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/deliveries', requireAuth, async (req, res) => {
  const { farmerId, kg, grade, rate } = req.body;
  if (!farmerId || !kg) return res.status(400).json({ error: 'farmerId and kg required' });

  try {
    const farmer = await Farmer.findOne({ where: { id: farmerId }, raw: true });
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    const rates = { A: 30, B: 25, C: 18 };
    const g = grade || 'B';
    const r = rate || rates[g] || 25;
    const gross = Math.round(Number(kg) * r);
    const deductions = Math.round(gross * 0.12);
    const net = gross - deductions;

    const delivery = await Delivery.create({
      id: `${farmerId}-d${Date.now().toString(36)}`,
      farmerId, date: new Date().toISOString().slice(0, 10),
      kg: Number(kg), grade: g, rate: r, gross, deductions, net, status: 'Pending',
    });

    await Farmer.update(
      { totalKg: Number(farmer.totalKg || 0) + Number(kg), totalEarned: Number(farmer.totalEarned || 0) + net },
      { where: { id: farmerId } },
    );

    smsService.onDeliveryRecorded({ farmer, delivery });
    res.status(201).json({ delivery, smsStatus: 'sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  STATS & ANALYTICS
// ═══════════════════════════════════════════════════════════
router.get('/stats', requireAuth, async (_req, res) => {
  try {
    const farmers        = await Farmer.count();
    const pendingPayments = await Payment.count({ where: { status: 'Pending' } });
    const kgMonth        = (await Delivery.sum('kg')) || 0;
    const disbursedMonth = (await Loan.sum('amount', { where: { status: 'Active' } })) || 0;
    res.json({ farmers, kgMonth, disbursedMonth, pendingPayments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/payments/recent', requireAuth, async (_req, res) => {
  try {
    const payments = await Payment.findAll({ raw: true, order: [['createdAt', 'DESC']], limit: 20 });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/loans', requireAuth, async (_req, res) => {
  try {
    const loans = await Loan.findAll({ raw: true });
    res.json({ loans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/complaints', requireAuth, async (_req, res) => {
  try {
    const complaints = await Complaint.findAll({ raw: true });
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/alerts', requireAuth, async (_req, res) => {
  try {
    const overdue = await Loan.findAll({ where: { status: 'Overdue' }, raw: true });
    const alerts  = overdue.map(l => ({
      type: 'overdue',
      message: `Overdue repayment — ${l.farmerName || l.farmerId} (FlowCredit)`,
      loanId: l.id,
    }));
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/delivery-activity', requireAuth, async (_req, res) => {
  try {
    // Return last 30 days of aggregated delivery kg + payment counts
    const points = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, kg: 0, payments: 0 }));
    res.json({ points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/factory-leaderboard', requireAuth, async (_req, res) => {
  try {
    const farmers = await Farmer.findAll({ raw: true });
    const map: Record<string, number> = {};
    farmers.forEach((f: any) => { map[f.factory] = (map[f.factory] || 0) + Number(f.totalKg || 0); });
    const leaderboard = Object.entries(map)
      .map(([name, kg]) => ({ name, kg: Number(kg) }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 5);
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sms/log', (_req, res) => {
  res.json({ messages: smsService.getSentMessages() });
});

// ═══════════════════════════════════════════════════════════
//  M-PESA: B2C DISBURSE (single)
// ═══════════════════════════════════════════════════════════
router.post('/mpesa/disburse', requireAuth, async (req, res) => {
  const { phone, amount, farmerId, farmerName, remarks } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: 'phone and amount required' });

  try {
    const darajaResp = await mpesaService.sendB2C({
      phone, amount: Number(amount),
      remarks: remarks || `FlowCredit loan — ${farmerName || farmerId}`,
    });
    const ref = darajaResp.ConversationID;
    const isSimulated = !!darajaResp._simulated;

    const feedEntry = {
      id: ref, type: 'B2C', farmer: farmerName || farmerId || 'Unknown',
      phone, amount: Number(amount), direction: 'out', code: '0',
      ts: new Date().toISOString().replace('T', ' ').slice(0, 16), raw: darajaResp,
    };
    await MpesaFeed.create(feedEntry).catch(() => {});

    const farmer = await Farmer.findOne({ where: { id: farmerId }, raw: true }).catch(() => null);
    if (farmer) smsService.onLoanDisbursed({ farmer, loanAmount: amount, ref });

    return res.json({
      ok: true, ref, simulated: isSimulated,
      message: isSimulated ? 'Simulated — update MPESA_SHORTCODE for real' : 'B2C sent to Safaricom',
      steps: [
        { label: 'Request OAuth token from Daraja', ms: 400 },
        { label: 'POST /mpesa/b2c/v1/paymentrequest', ms: 1200 },
        { label: 'Receive webhook callback', ms: 800 },
        { label: 'Record disbursement + repayment schedule', ms: 400 },
      ],
      payload: feedEntry,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  M-PESA: BULK DISBURSE ALL
// ═══════════════════════════════════════════════════════════
router.post('/mpesa/disburse-all', requireAuth, async (req, res) => {
  const { farmerIds } = req.body;
  try {
    const where = farmerIds?.length ? { id: farmerIds } : { loanFlow: 'eligible' };
    const farmers = await Farmer.findAll({ where, raw: true });
    const results = [];

    for (const farmer of farmers) {
      const pendingDeliveries = await Delivery.findAll({
        where: { farmerId: farmer.id, status: 'Pending' }, raw: true,
      });
      const totalNet = pendingDeliveries.reduce((s, d) => s + Number(d.net || 0), 0);
      if (totalNet <= 0) continue;

      const phone = `254${farmer.phone.replace(/\D/g, '').slice(-9)}`;
      const activeLoan = await Loan.findOne({ where: { farmerId: farmer.id, status: 'Active' }, raw: true }).catch(() => null);

      let loanDeduction = 0;
      if (activeLoan) {
        const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
        const alreadyPaid = loanTotal * Number(activeLoan.repaidFraction || 0);
        const remaining = loanTotal - alreadyPaid;
        const instalment = Math.min(Math.round(loanTotal / Number(activeLoan.instalments || 3)), remaining);
        loanDeduction = Math.min(instalment, totalNet);
      }

      const netAfterLoan = totalNet - loanDeduction;
      const darajaResp = await mpesaService.sendB2C({
        phone, amount: netAfterLoan,
        remarks: `Cooperative payment — ${farmer.name}${loanDeduction > 0 ? ` (KSh ${loanDeduction} loan deducted)` : ''}`,
      });
      const ref = darajaResp.ConversationID;

      await MpesaFeed.create({
        id: ref, type: 'B2C', farmer: farmer.name, phone,
        amount: netAfterLoan, direction: 'out', code: '0',
        ts: new Date().toISOString().replace('T', ' ').slice(0, 16),
        raw: { ...darajaResp, grossPayment: totalNet, loanDeduction, netPayment: netAfterLoan },
      }).catch(() => {});

      await Delivery.update({ status: 'Paid' }, { where: { farmerId: farmer.id, status: 'Pending' } });

      if (activeLoan && loanDeduction > 0) {
        const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
        const newFraction = Math.min(1, Number(activeLoan.repaidFraction || 0) + (loanDeduction / loanTotal));
        const newStatus = newFraction >= 0.99 ? 'Completed' : 'Active';
        await Loan.update({ repaidFraction: newFraction, status: newStatus }, { where: { id: activeLoan.id } });
        smsService.onRepaymentDeducted({ farmer, instalment: loanDeduction, remaining: Math.round(loanTotal * (1 - newFraction)), net: netAfterLoan });
      }

      await Payment.create({
        id: `P-${Date.now().toString(36)}-${farmer.id}`,
        farmerId: farmer.id, farmer: farmer.name, phone,
        amount: totalNet, deductions: loanDeduction, net: netAfterLoan,
        status: 'Paid', time: new Date().toISOString().replace('T', ' ').slice(0, 16), mpesaRef: ref,
      });

      smsService.onPaymentDisbursed({ farmer, amount: totalNet, deductions: loanDeduction, net: netAfterLoan, ref });
      results.push({ farmerId: farmer.id, name: farmer.name, phone, gross: totalNet, loanDeduction, net: netAfterLoan, ref, simulated: !!darajaResp._simulated });
    }

    res.json({ ok: true, disbursed: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  M-PESA: BATCH APPROVAL
// ═══════════════════════════════════════════════════════════
router.post('/payments/batch-approve', requireAuth, async (req, res) => {
  const { paymentIds, action } = req.body;
  if (!paymentIds || !action) return res.status(400).json({ error: 'paymentIds and action required' });
  const newStatus = action === 'approve' ? 'Paid' : 'Failed';
  let updated = 0;
  for (const id of paymentIds) {
    const [n] = await Payment.update({ status: newStatus }, { where: { id } });
    if (n) updated++;
  }
  res.json({ ok: true, updated, action, newStatus });
});

// ═══════════════════════════════════════════════════════════
//  M-PESA: C2B VALIDATION & CONFIRMATION (Safaricom webhooks)
// ═══════════════════════════════════════════════════════════
router.post('/mpesa/c2b/validation', async (req, res) => {
  const { TransID, TransAmount, MSISDN, BillRefNumber } = req.body;
  console.log('🔔 C2B VALIDATION', { TransID, TransAmount, MSISDN, BillRefNumber });

  const phoneClean = MSISDN ? MSISDN.replace(/^254/, '0') : '';
  const farmer = await Farmer.findOne({ where: { phone: phoneClean }, raw: true }).catch(() => null);

  if (farmer) {
    const activeLoan = await Loan.findOne({ where: { farmerId: farmer.id, status: 'Active' }, raw: true }).catch(() => null);
    const amount = Number(TransAmount);
    let loanDeduction = 0;
    if (activeLoan) {
      const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
      const alreadyPaid = loanTotal * Number(activeLoan.repaidFraction || 0);
      const remaining = loanTotal - alreadyPaid;
      loanDeduction = Math.min(Math.round(loanTotal / Number(activeLoan.instalments || 3)), remaining, amount);
    }
    await MpesaFeed.create({
      id: TransID || `C2B-${Date.now()}`, type: 'C2B', farmer: farmer.name, phone: MSISDN,
      amount: Number(TransAmount), direction: 'in', code: '0',
      ts: new Date().toISOString().replace('T', ' ').slice(0, 16),
      raw: { ...req.body, _chaiconnect: { farmerId: farmer.id, loanDeduction, netToFarmer: amount - loanDeduction, intercepted: loanDeduction > 0 } },
    }).catch(() => {});
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

router.post('/mpesa/c2b/confirmation', async (req, res) => {
  const { TransID, TransAmount, MSISDN } = req.body;
  console.log('✅ C2B CONFIRMATION:', TransID, 'KSh', TransAmount);

  const phoneClean = MSISDN ? MSISDN.replace(/^254/, '0') : '';
  const farmer = await Farmer.findOne({ where: { phone: phoneClean }, raw: true }).catch(() => null);

  if (farmer) {
    const amount = Number(TransAmount);
    const activeLoan = await Loan.findOne({ where: { farmerId: farmer.id, status: 'Active' }, raw: true }).catch(() => null);
    let loanDeduction = 0;
    if (activeLoan) {
      const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
      const alreadyPaid = loanTotal * Number(activeLoan.repaidFraction || 0);
      const remaining = loanTotal - alreadyPaid;
      loanDeduction = Math.min(Math.round(loanTotal / Number(activeLoan.instalments || 3)), remaining, amount);
      const newFraction = Math.min(1, Number(activeLoan.repaidFraction || 0) + (loanDeduction / loanTotal));
      await Loan.update({ repaidFraction: newFraction, status: newFraction >= 0.99 ? 'Completed' : 'Active' }, { where: { id: activeLoan.id } });
      smsService.onRepaymentDeducted({ farmer, instalment: loanDeduction, remaining: Math.round(loanTotal * (1 - newFraction)), net: amount - loanDeduction });
    }
    await Payment.create({
      id: TransID || `C2B-P-${Date.now()}`, farmerId: farmer.id, farmer: farmer.name, phone: MSISDN,
      amount, deductions: loanDeduction, net: amount - loanDeduction,
      status: 'Paid', time: new Date().toISOString().replace('T', ' ').slice(0, 16), mpesaRef: TransID,
    });
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

router.post('/mpesa/simulate-c2b', requireAuth, async (req, res) => {
  const { phone, amount, reference } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: 'phone and amount required' });

  const phoneE164 = phone.startsWith('254') ? phone : `254${phone.replace(/^0/, '')}`;
  const phoneClean = phoneE164.replace(/^254/, '0');
  const TransID = `SIMC2B-${Date.now()}`;

  const farmer = await Farmer.findOne({ where: { phone: phoneClean }, raw: true }).catch(() => null);
  if (!farmer) return res.json({ ok: true, message: 'Payment accepted (farmer not found)', transId: TransID });

  const amt = Number(amount);
  const activeLoan = await Loan.findOne({ where: { farmerId: farmer.id, status: 'Active' }, raw: true }).catch(() => null);
  let loanDeduction = 0;
  if (activeLoan) {
    const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
    const alreadyPaid = loanTotal * Number(activeLoan.repaidFraction || 0);
    const remaining = loanTotal - alreadyPaid;
    loanDeduction = Math.min(Math.round(loanTotal / Number(activeLoan.instalments || 3)), remaining, amt);
    const newFraction = Math.min(1, Number(activeLoan.repaidFraction || 0) + (loanDeduction / loanTotal));
    await Loan.update({ repaidFraction: newFraction, status: newFraction >= 0.99 ? 'Completed' : 'Active' }, { where: { id: activeLoan.id } });
    smsService.onRepaymentDeducted({ farmer, instalment: loanDeduction, remaining: Math.round(loanTotal * (1 - newFraction)), net: amt - loanDeduction });
  }

  await MpesaFeed.create({ id: TransID, type: 'C2B', farmer: farmer.name, phone: phoneE164, amount: amt, direction: 'in', code: '0', ts: new Date().toISOString().replace('T', ' ').slice(0, 16), raw: { reference, loanDeduction } }).catch(() => {});
  await Payment.create({ id: `${TransID}-P`, farmerId: farmer.id, farmer: farmer.name, phone: phoneE164, amount: amt, deductions: loanDeduction, net: amt - loanDeduction, status: 'Paid', time: new Date().toISOString().replace('T', ' ').slice(0, 16), mpesaRef: TransID });

  res.json({ ok: true, transId: TransID, farmer: farmer.name, gross: amt, loanDeduction, net: amt - loanDeduction, loanIntercepted: loanDeduction > 0, message: loanDeduction > 0 ? `💰 Repayment intercepted: KSh ${loanDeduction} deducted` : `✅ Full payment KSh ${amt} to farmer` });
});

// ── Transaction status & B2C callbacks ──────────────────
router.post('/mpesa/transaction-status', requireAuth, async (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) return res.status(400).json({ error: 'transactionId required' });
  const result = await mpesaService.checkTransactionStatus(transactionId);
  res.json({ result, transactionId });
});

router.post('/mpesa/txstatus/result', (req, res) => { console.log('🔍 TxStatus Result:', req.body); res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); });
router.post('/mpesa/txstatus/timeout', (_req, res) => res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' }));

router.get('/mpesa/transactions', requireAuth, async (_req, res) => {
  try {
    const transactions = await MpesaFeed.findAll({ raw: true, order: [['createdAt', 'DESC']], limit: 50 });
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mpesa/b2c/result', async (req, res) => {
  const result = req.body?.Result;
  if (result?.ConversationID) {
    await MpesaFeed.update({ code: String(result.ResultCode), raw: result }, { where: { id: result.ConversationID } }).catch(() => {});
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});
router.post('/mpesa/b2c/timeout', (_req, res) => res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' }));
router.post('/mpesa/register-urls', async (_req, res) => { const r = await mpesaService.registerC2BUrls(); res.json({ result: r }); });

module.exports = router;
