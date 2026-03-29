/**
 * API routes — reads from Neon Postgres via Sequelize.
 * Falls back to seedPayload mock data if DB is unavailable.
 * Real Daraja B2C disburse + webhook result handling.
 */
const express = require('express');
const mpesaService = require('../services/MpesaService');
const {
  FARMERS, RECENT_PAYMENTS, CHART_DELIVERY_ACTIVITY,
  DELIVERIES, LOANS, MPESA_FEED, COMPLAINTS,
} = require('../data/seedPayload');

let Farmer, Delivery, Loan, Payment, MpesaFeed, Complaint;
try {
  const models = require('../models');
  Farmer    = models.Farmer;
  Delivery  = models.Delivery;
  Loan      = models.Loan;
  Payment   = models.Payment;
  MpesaFeed = models.MpesaFeed;
  Complaint = models.Complaint;
} catch (e) {
  console.warn('⚠️  Models unavailable, running in mock mode');
}

const router = express.Router();

async function dbOrMock(dbFn, fallback) {
  try { return await dbFn(); } catch { return fallback; }
}

// ── Farmers ──────────────────────────────────────────────
router.get('/farmers', async (_req, res) => {
  const farmers = await dbOrMock(() => Farmer.findAll({ raw: true }), FARMERS);
  res.json({ farmers });
});

router.get('/farmers/:id', async (req, res) => {
  const farmer = await dbOrMock(
    () => Farmer.findOne({ where: { id: req.params.id }, raw: true }),
    FARMERS.find((f) => f.id === req.params.id) ?? null,
  );
  if (!farmer) return res.status(404).json({ error: 'Not found' });
  return res.json({ farmer });
});

// ── Stats ─────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  const farmers = await dbOrMock(() => Farmer.count(), FARMERS.length);
  const pendingPayments = await dbOrMock(
    () => Payment.count({ where: { status: 'Pending' } }),
    RECENT_PAYMENTS.filter((p) => p.status === 'Pending').length,
  );
  res.json({ farmers, kgMonth: 48230, disbursedMonth: 2400000, pendingPayments });
});

// ── Payments ──────────────────────────────────────────────
router.get('/payments/recent', async (_req, res) => {
  const payments = await dbOrMock(
    () => Payment.findAll({ raw: true, order: [['createdAt', 'DESC']], limit: 20 }),
    RECENT_PAYMENTS,
  );
  res.json({ payments });
});

// ── Deliveries ────────────────────────────────────────────
router.get('/deliveries', async (_req, res) => {
  const deliveries = await dbOrMock(
    () => Delivery.findAll({ raw: true, order: [['date', 'DESC']] }),
    DELIVERIES,
  );
  res.json({ deliveries });
});

// ── Loans ─────────────────────────────────────────────────
router.get('/loans', async (_req, res) => {
  const loans = await dbOrMock(() => Loan.findAll({ raw: true }), LOANS);
  res.json({ loans });
});

// ── Complaints ────────────────────────────────────────────
router.get('/complaints', async (_req, res) => {
  const complaints = await dbOrMock(() => Complaint.findAll({ raw: true }), COMPLAINTS);
  res.json({ complaints });
});

// ── Analytics ─────────────────────────────────────────────
router.get('/analytics/delivery-activity', (_req, res) => {
  res.json({ points: CHART_DELIVERY_ACTIVITY });
});

// ── M-Pesa: Live Transactions Feed ────────────────────────
router.get('/mpesa/transactions', async (_req, res) => {
  const transactions = await dbOrMock(
    () => MpesaFeed.findAll({ raw: true, order: [['createdAt', 'DESC']], limit: 50 }),
    MPESA_FEED,
  );
  res.json({ transactions });
});

// ── M-Pesa: REAL B2C Disburse ─────────────────────────────
router.post('/mpesa/disburse', async (req, res) => {
  const { phone, amount, farmerId, farmerName, remarks } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ error: 'phone and amount are required' });
  }

  try {
    // Call Daraja (falls back to simulated response if credentials not set)
    const darajaResp = await mpesaService.sendB2C({
      phone,
      amount: Number(amount),
      remarks: remarks || `FlowCredit loan — ${farmerName || farmerId}`,
    });

    const ref = darajaResp.ConversationID;
    const isSimulated = !!darajaResp._simulated;

    // Save to Neon MpesaFeed table
    const feedEntry = {
      id: ref,
      type: 'B2C',
      farmer: farmerName || farmerId || 'Unknown',
      phone,
      amount: Number(amount),
      direction: 'out',
      code: '0',
      ts: new Date().toISOString().replace('T', ' ').slice(0, 16),
      raw: darajaResp,
    };

    await dbOrMock(() => MpesaFeed.create(feedEntry), null);

    return res.json({
      ok: true,
      ref,
      simulated: isSimulated,
      message: isSimulated
        ? 'Sandbox credentials not fully configured — simulated response returned'
        : 'B2C payment request sent to Safaricom',
      steps: [
        { label: 'Request OAuth token from Daraja', ms: 400 },
        { label: 'POST /mpesa/b2c/v1/paymentrequest', ms: 1200 },
        { label: 'Receive webhook callback', ms: 800 },
        { label: 'Record disbursement + activate repayment schedule', ms: 400 },
      ],
      payload: feedEntry,
    });
  } catch (err) {
    console.error('❌ Disburse error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── M-Pesa: B2C Result Callback (Safaricom webhook) ──────
router.post('/mpesa/b2c/result', async (req, res) => {
  const result = req.body?.Result;
  if (!result) return res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' });

  const convId = result.ConversationID;
  const success = result.ResultCode === 0;

  console.log(`📩 B2C Result for ${convId}: ${success ? '✅ SUCCESS' : '❌ FAILED'} — ${result.ResultDesc}`);

  // Update the MpesaFeed row in Neon
  await dbOrMock(
    () => MpesaFeed.update(
      { code: String(result.ResultCode), raw: result },
      { where: { id: convId } },
    ),
    null,
  );

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// ── M-Pesa: B2C Timeout Callback ─────────────────────────
router.post('/mpesa/b2c/timeout', (req, res) => {
  console.warn('⚠️ B2C Timeout received');
  res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' });
});

// ── M-Pesa: Simulate (legacy demo mode) ──────────────────
router.post('/mpesa/simulate-b2c', express.json(), (req, res) => {
  const payload = req.body || {};
  return res.json({
    ok: true,
    payload,
    steps: [
      { label: 'Request OAuth token from Daraja', ms: 400 },
      { label: 'POST /mpesa/b2c/v3/paymentrequest', ms: 1200 },
      { label: 'Receive webhook callback', ms: 800 },
      { label: 'Record disbursement + activate repayment schedule', ms: 400 },
    ],
  });
});

module.exports = router;
