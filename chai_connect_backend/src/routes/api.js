const express = require('express');
const mpesaService = require('../services/MpesaService');
const {
  FARMERS, RECENT_PAYMENTS, CHART_DELIVERY_ACTIVITY,
  DELIVERIES, LOANS, MPESA_FEED, COMPLAINTS,
} = require('../data/seedPayload');

let Farmer, Delivery, Loan, Payment, MpesaFeed, Complaint;
try {
  const models = require('../models');
  Farmer = models.Farmer; Delivery = models.Delivery;
  Loan = models.Loan; Payment = models.Payment;
  MpesaFeed = models.MpesaFeed; Complaint = models.Complaint;
} catch (e) { console.warn('⚠️  Models unavailable, mock mode'); }

const router = express.Router();

async function dbOrMock(dbFn, fallback) {
  try { return await dbFn(); } catch { return fallback; }
}

// ── Farmers ────────────────────────────────────────────
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

// POST — Register new farmer
router.post('/farmers', async (req, res) => {
  const { name, phone, nationalId, factory, zone, cooperative } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });

  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  const memberNo = name.split(' ').map(w => w[0]).join('').toUpperCase() + String(Math.floor(Math.random() * 900) + 100);

  const farmerData = {
    id, name, phone, memberNo, factory: factory || 'Kiambu Tea Factory',
    zone: zone || 'North Ridge', cooperative: cooperative || 'Kiambu Tea Growers SACCO',
    creditScore: 50, creditTier: 'C', loanFlow: 'eligible', gradeTrend: 'C',
    activeSince: new Date().toISOString().slice(0, 10),
    totalKg: 0, totalEarned: 0, status: 'Active',
  };

  const created = await dbOrMock(() => Farmer.create(farmerData), farmerData);
  res.status(201).json({ farmer: created });
});

// ── Farmer-specific data ──────────────────────────────
router.get('/farmers/:id/deliveries', async (req, res) => {
  const deliveries = await dbOrMock(
    () => Delivery.findAll({ where: { farmerId: req.params.id }, raw: true, order: [['date', 'DESC']] }),
    DELIVERIES.filter(d => d.farmerId === req.params.id),
  );
  res.json({ deliveries });
});

router.get('/farmers/:id/loans', async (req, res) => {
  const loans = await dbOrMock(
    () => Loan.findAll({ where: { farmerId: req.params.id }, raw: true }),
    LOANS.filter(l => l.farmerId === req.params.id),
  );
  res.json({ loans });
});

router.get('/farmers/:id/payments', async (req, res) => {
  const payments = await dbOrMock(
    () => Payment.findAll({ where: { farmerId: req.params.id }, raw: true, order: [['createdAt', 'DESC']] }),
    RECENT_PAYMENTS.filter(p => p.farmerId === req.params.id),
  );
  res.json({ payments });
});

// ── Stats ──────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  const farmers = await dbOrMock(() => Farmer.count(), FARMERS.length);
  const pendingPayments = await dbOrMock(
    () => Payment.count({ where: { status: 'Pending' } }),
    RECENT_PAYMENTS.filter(p => p.status === 'Pending').length,
  );
  const kgMonth = await dbOrMock(
    async () => {
      const sum = await Delivery.sum('kg');
      return sum || 48230;
    }, 48230,
  );
  const disbursedMonth = await dbOrMock(
    async () => {
      const sum = await Loan.sum('amount', { where: { status: 'Active' } });
      return sum || 2400000;
    }, 2400000,
  );
  res.json({ farmers, kgMonth, disbursedMonth, pendingPayments });
});

// ── Payments ───────────────────────────────────────────
router.get('/payments/recent', async (_req, res) => {
  const payments = await dbOrMock(
    () => Payment.findAll({ raw: true, order: [['createdAt', 'DESC']], limit: 20 }),
    RECENT_PAYMENTS,
  );
  res.json({ payments });
});

// ── Deliveries ─────────────────────────────────────────
router.get('/deliveries', async (_req, res) => {
  const deliveries = await dbOrMock(
    () => Delivery.findAll({ raw: true, order: [['date', 'DESC']], limit: 100 }),
    DELIVERIES,
  );
  res.json({ deliveries });
});

// ── Loans ──────────────────────────────────────────────
router.get('/loans', async (_req, res) => {
  const loans = await dbOrMock(() => Loan.findAll({ raw: true }), LOANS);
  res.json({ loans });
});

// ── Complaints ─────────────────────────────────────────
router.get('/complaints', async (_req, res) => {
  const complaints = await dbOrMock(() => Complaint.findAll({ raw: true }), COMPLAINTS);
  res.json({ complaints });
});

// ── Alerts ─────────────────────────────────────────────
router.get('/alerts', async (_req, res) => {
  const overdue = await dbOrMock(
    () => Loan.findAll({ where: { status: 'Overdue' }, raw: true }),
    LOANS.filter(l => l.status === 'Overdue'),
  );
  const alerts = overdue.map(l => ({
    type: 'overdue',
    message: `Overdue repayment — ${l.farmerName || l.farmerId} (FlowCredit)`,
    loanId: l.id,
  }));
  res.json({ alerts });
});

// ── Analytics ──────────────────────────────────────────
router.get('/analytics/delivery-activity', (_req, res) => {
  res.json({ points: CHART_DELIVERY_ACTIVITY });
});

router.get('/analytics/factory-leaderboard', async (_req, res) => {
  const leaderboard = await dbOrMock(
    async () => {
      const farmers = await Farmer.findAll({ raw: true });
      const factoryMap = {};
      farmers.forEach(f => {
        factoryMap[f.factory] = (factoryMap[f.factory] || 0) + Number(f.totalKg || 0);
      });
      return Object.entries(factoryMap)
        .map(([name, kg]) => ({ name, kg: Number(kg) }))
        .sort((a, b) => b.kg - a.kg)
        .slice(0, 5);
    },
    [
      { name: 'Kiambu Tea Factory', kg: 48200 },
      { name: 'Meru Coffee Factory', kg: 38100 },
      { name: 'Kisumu Dairy Cooperative', kg: 30300 },
    ],
  );
  res.json({ leaderboard });
});

// ── M-Pesa: Transactions ───────────────────────────────
router.get('/mpesa/transactions', async (_req, res) => {
  const transactions = await dbOrMock(
    () => MpesaFeed.findAll({ raw: true, order: [['createdAt', 'DESC']], limit: 50 }),
    MPESA_FEED,
  );
  res.json({ transactions });
});

// ── M-Pesa: REAL B2C Disburse ──────────────────────────
router.post('/mpesa/disburse', async (req, res) => {
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
      ts: new Date().toISOString().replace('T', ' ').slice(0, 16),
      raw: darajaResp,
    };
    await dbOrMock(() => MpesaFeed.create(feedEntry), null);

    return res.json({
      ok: true, ref, simulated: isSimulated,
      message: isSimulated ? 'Simulated — update MPESA_SHORTCODE for real calls' : 'B2C sent to Safaricom',
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

// ── M-Pesa: B2C Callbacks ──────────────────────────────
router.post('/mpesa/b2c/result', async (req, res) => {
  const result = req.body?.Result;
  if (!result) return res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' });
  const convId = result.ConversationID;
  console.log(`📩 B2C Result ${convId}: ${result.ResultCode === 0 ? '✅' : '❌'} — ${result.ResultDesc}`);
  await dbOrMock(() => MpesaFeed.update({ code: String(result.ResultCode), raw: result }, { where: { id: convId } }), null);
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

router.post('/mpesa/b2c/timeout', (_req, res) => {
  console.warn('⚠️ B2C Timeout');
  res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' });
});

router.post('/mpesa/simulate-b2c', express.json(), (req, res) => {
  res.json({
    ok: true, payload: req.body || {},
    steps: [
      { label: 'Request OAuth token from Daraja', ms: 400 },
      { label: 'POST /mpesa/b2c/v3/paymentrequest', ms: 1200 },
      { label: 'Receive webhook callback', ms: 800 },
      { label: 'Record disbursement + repayment schedule', ms: 400 },
    ],
  });
});

module.exports = router;
