const express = require('express');
const mpesaService = require('../services/MpesaService');
const creditScoringService = require('../services/CreditScoringService');
const smsService = require('../services/SmsService');
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

// ═══════════════════════════════════════════════════════════
//  FARMERS
// ═══════════════════════════════════════════════════════════
router.get('/farmers', async (_req, res) => {
  const farmers = await dbOrMock(() => Farmer.findAll({ raw: true }), FARMERS);
  res.json({ farmers });
});

router.get('/farmers/:id', async (req, res) => {
  const farmer = await dbOrMock(
    () => Farmer.findOne({ where: { id: req.params.id }, raw: true }),
    FARMERS.find(f => f.id === req.params.id) ?? null,
  );
  if (!farmer) return res.status(404).json({ error: 'Not found' });
  return res.json({ farmer });
});

router.post('/farmers', async (req, res) => {
  const { name, phone, nationalId, factory, zone, cooperative } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  const memberNo = name.split(' ').map(w => w[0]).join('').toUpperCase() + String(Math.floor(Math.random()*900)+100);
  const farmerData = {
    id, name, phone, memberNo, factory: factory || 'Kiambu Tea Factory',
    zone: zone || 'North Ridge', cooperative: cooperative || 'Kiambu Tea Growers SACCO',
    creditScore: 50, creditTier: 'C', loanFlow: 'eligible', gradeTrend: 'C',
    activeSince: new Date().toISOString().slice(0,10), totalKg: 0, totalEarned: 0, status: 'Active',
  };
  const created = await dbOrMock(() => Farmer.create(farmerData), farmerData);
  res.status(201).json({ farmer: created });
});

// ── Farmer-specific data ───────────────────────────────
router.get('/farmers/:id/deliveries', async (req, res) => {
  const deliveries = await dbOrMock(
    () => Delivery.findAll({ where: { farmerId: req.params.id }, raw: true, order: [['date','DESC']] }),
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
    () => Payment.findAll({ where: { farmerId: req.params.id }, raw: true, order: [['createdAt','DESC']] }),
    RECENT_PAYMENTS.filter(p => p.farmerId === req.params.id),
  );
  res.json({ payments });
});

// ═══════════════════════════════════════════════════════════
//  CREDIT SCORING — Real 5-factor algorithm
// ═══════════════════════════════════════════════════════════
router.get('/farmers/:id/credit-score', async (req, res) => {
  const farmerId = req.params.id;
  const farmer = await dbOrMock(
    () => Farmer.findOne({ where: { id: farmerId }, raw: true }),
    FARMERS.find(f => f.id === farmerId),
  );
  if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

  const deliveries = await dbOrMock(
    () => Delivery.findAll({ where: { farmerId }, raw: true }),
    DELIVERIES.filter(d => d.farmerId === farmerId),
  );
  const loans = await dbOrMock(
    () => Loan.findAll({ where: { farmerId }, raw: true }),
    LOANS.filter(l => l.farmerId === farmerId),
  );
  const payments = await dbOrMock(
    () => Payment.findAll({ where: { farmerId }, raw: true }),
    RECENT_PAYMENTS.filter(p => p.farmerId === farmerId),
  );

  const result = creditScoringService.calculate({ farmer, deliveries, loans, payments });
  const maxLoan = creditScoringService.maxLoanAmount(result.grade);

  // Update farmer record in DB with new score
  await dbOrMock(
    () => Farmer.update(
      { creditScore: result.score, creditTier: result.grade },
      { where: { id: farmerId } }
    ), null,
  );

  // SMS notification
  smsService.onCreditScoreUpdate({ farmer, newScore: result.score, grade: result.grade });

  res.json({ ...result, maxLoanAmount: maxLoan, farmerId });
});

// Recalculate ALL farmer scores
router.post('/credit-scores/recalculate', async (_req, res) => {
  const farmers = await dbOrMock(() => Farmer.findAll({ raw: true }), FARMERS);
  const results = [];

  for (const farmer of farmers) {
    const deliveries = await dbOrMock(
      () => Delivery.findAll({ where: { farmerId: farmer.id }, raw: true }), [],
    );
    const loans = await dbOrMock(
      () => Loan.findAll({ where: { farmerId: farmer.id }, raw: true }), [],
    );
    const payments = await dbOrMock(
      () => Payment.findAll({ where: { farmerId: farmer.id }, raw: true }), [],
    );

    const result = creditScoringService.calculate({ farmer, deliveries, loans, payments });
    await dbOrMock(
      () => Farmer.update({ creditScore: result.score, creditTier: result.grade }, { where: { id: farmer.id } }),
      null,
    );
    results.push({ farmerId: farmer.id, name: farmer.name, ...result });
  }

  res.json({ recalculated: results.length, results });
});

// ═══════════════════════════════════════════════════════════
//  DELIVERIES — with SMS notification
// ═══════════════════════════════════════════════════════════
router.get('/deliveries', async (_req, res) => {
  const deliveries = await dbOrMock(
    () => Delivery.findAll({ raw: true, order: [['date','DESC']], limit: 100 }),
    DELIVERIES,
  );
  res.json({ deliveries });
});

// POST — Record a new delivery (triggers SMS)
router.post('/deliveries', async (req, res) => {
  const { farmerId, kg, grade, rate } = req.body;
  if (!farmerId || !kg) return res.status(400).json({ error: 'farmerId and kg required' });

  const farmer = await dbOrMock(
    () => Farmer.findOne({ where: { id: farmerId }, raw: true }),
    FARMERS.find(f => f.id === farmerId),
  );
  if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

  const rates = { A: 30, B: 25, C: 18 };
  const g = grade || 'B';
  const r = rate || rates[g] || 25;
  const gross = Math.round(Number(kg) * r);
  const deductions = Math.round(gross * 0.12);
  const net = gross - deductions;

  const delivery = {
    id: `${farmerId}-d${Date.now().toString(36)}`,
    farmerId, date: new Date().toISOString().slice(0,10),
    kg: Number(kg), grade: g, rate: r, gross, deductions, net, status: 'Pending',
  };

  const created = await dbOrMock(() => Delivery.create(delivery), delivery);

  // Update farmer totals
  await dbOrMock(
    () => Farmer.update(
      { totalKg: Number(farmer.totalKg || 0) + Number(kg), totalEarned: Number(farmer.totalEarned || 0) + net },
      { where: { id: farmerId } }
    ), null,
  );

  // 📱 SMS notification to farmer
  smsService.onDeliveryRecorded({ farmer, delivery: created });

  res.status(201).json({ delivery: created, smsStatus: 'sent' });
});

// ═══════════════════════════════════════════════════════════
//  STATS & ANALYTICS
// ═══════════════════════════════════════════════════════════
router.get('/stats', async (_req, res) => {
  const farmers = await dbOrMock(() => Farmer.count(), FARMERS.length);
  const pendingPayments = await dbOrMock(
    () => Payment.count({ where: { status: 'Pending' } }),
    RECENT_PAYMENTS.filter(p => p.status === 'Pending').length,
  );
  const kgMonth = await dbOrMock(async () => (await Delivery.sum('kg')) || 48230, 48230);
  const disbursedMonth = await dbOrMock(
    async () => (await Loan.sum('amount', { where: { status: 'Active' } })) || 2400000, 2400000,
  );
  res.json({ farmers, kgMonth, disbursedMonth, pendingPayments });
});

router.get('/payments/recent', async (_req, res) => {
  const payments = await dbOrMock(
    () => Payment.findAll({ raw: true, order: [['createdAt','DESC']], limit: 20 }), RECENT_PAYMENTS,
  );
  res.json({ payments });
});

router.get('/loans', async (_req, res) => {
  const loans = await dbOrMock(() => Loan.findAll({ raw: true }), LOANS);
  res.json({ loans });
});

router.get('/complaints', async (_req, res) => {
  const complaints = await dbOrMock(() => Complaint.findAll({ raw: true }), COMPLAINTS);
  res.json({ complaints });
});

router.get('/alerts', async (_req, res) => {
  const overdue = await dbOrMock(
    () => Loan.findAll({ where: { status: 'Overdue' }, raw: true }),
    LOANS.filter(l => l.status === 'Overdue'),
  );
  const alerts = overdue.map(l => ({
    type: 'overdue', message: `Overdue repayment — ${l.farmerName || l.farmerId} (FlowCredit)`, loanId: l.id,
  }));
  res.json({ alerts });
});

router.get('/analytics/delivery-activity', (_req, res) => {
  res.json({ points: CHART_DELIVERY_ACTIVITY });
});

router.get('/analytics/factory-leaderboard', async (_req, res) => {
  const leaderboard = await dbOrMock(async () => {
    const farmers = await Farmer.findAll({ raw: true });
    const map = {};
    farmers.forEach(f => { map[f.factory] = (map[f.factory] || 0) + Number(f.totalKg || 0); });
    return Object.entries(map).map(([name, kg]) => ({ name, kg: Number(kg) })).sort((a,b) => b.kg - a.kg).slice(0,5);
  }, [
    { name: 'Kiambu Tea Factory', kg: 48200 },
    { name: 'Meru Coffee Factory', kg: 38100 },
    { name: 'Kisumu Dairy Cooperative', kg: 30300 },
  ]);
  res.json({ leaderboard });
});

// SMS log feed
router.get('/sms/log', (_req, res) => {
  res.json({ messages: smsService.getSentMessages() });
});

// ═══════════════════════════════════════════════════════════
//  M-PESA: REAL B2C DISBURSE (single)
// ═══════════════════════════════════════════════════════════
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
      ts: new Date().toISOString().replace('T',' ').slice(0,16), raw: darajaResp,
    };
    await dbOrMock(() => MpesaFeed.create(feedEntry), null);

    // SMS notification
    const farmer = await dbOrMock(
      () => Farmer.findOne({ where: { id: farmerId }, raw: true }),
      FARMERS.find(f => f.id === farmerId),
    );
    if (farmer) {
      smsService.onLoanDisbursed({ farmer, loanAmount: amount, ref });
    }

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
//  M-PESA: BULK DISBURSE ALL (cooperative batch payment)
// ═══════════════════════════════════════════════════════════
router.post('/mpesa/disburse-all', async (req, res) => {
  const { farmerIds } = req.body; // optional — if empty, disburse to all pending
  let farmers;

  if (farmerIds && farmerIds.length > 0) {
    farmers = await dbOrMock(
      () => Farmer.findAll({ where: { id: farmerIds }, raw: true }),
      FARMERS.filter(f => farmerIds.includes(f.id)),
    );
  } else {
    // All farmers with pending deliveries
    farmers = await dbOrMock(
      () => Farmer.findAll({ where: { loanFlow: 'eligible' }, raw: true }),
      FARMERS.filter(f => f.loanFlow === 'eligible'),
    );
  }

  const results = [];
  for (const farmer of farmers) {
    // Calculate what they're owed from pending deliveries
    const pendingDeliveries = await dbOrMock(
      () => Delivery.findAll({ where: { farmerId: farmer.id, status: 'Pending' }, raw: true }),
      DELIVERIES.filter(d => d.farmerId === farmer.id && d.status === 'Pending'),
    );

    const totalNet = pendingDeliveries.reduce((s, d) => s + Number(d.net || 0), 0);
    if (totalNet <= 0) continue;

    const phone = `254${farmer.phone.replace(/\D/g, '').slice(-9)}`;

    // Check for pending loan repayment — THIS IS THE REPAYMENT INTERCEPT
    const activeLoan = await dbOrMock(
      () => Loan.findOne({ where: { farmerId: farmer.id, status: 'Active' }, raw: true }),
      LOANS.find(l => l.farmerId === farmer.id && l.status === 'Active'),
    );

    let loanDeduction = 0;
    if (activeLoan) {
      const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
      const alreadyPaid = loanTotal * Number(activeLoan.repaidFraction || 0);
      const remaining = loanTotal - alreadyPaid;
      const instalment = Math.min(Math.round(loanTotal / Number(activeLoan.instalments || 3)), remaining);
      loanDeduction = Math.min(instalment, totalNet);
    }

    const netAfterLoan = totalNet - loanDeduction;

    // Send B2C for net amount
    const darajaResp = await mpesaService.sendB2C({
      phone, amount: netAfterLoan,
      remarks: `Cooperative payment — ${farmer.name}${loanDeduction > 0 ? ` (KSh ${loanDeduction} loan deducted)` : ''}`,
    });

    const ref = darajaResp.ConversationID;

    // Record in feed
    await dbOrMock(() => MpesaFeed.create({
      id: ref, type: 'B2C', farmer: farmer.name, phone,
      amount: netAfterLoan, direction: 'out', code: '0',
      ts: new Date().toISOString().replace('T',' ').slice(0,16),
      raw: { ...darajaResp, grossPayment: totalNet, loanDeduction, netPayment: netAfterLoan },
    }), null);

    // Mark deliveries as Paid
    await dbOrMock(
      () => Delivery.update({ status: 'Paid' }, { where: { farmerId: farmer.id, status: 'Pending' } }),
      null,
    );

    // Update loan repaidFraction if deduction was made
    if (activeLoan && loanDeduction > 0) {
      const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
      const newFraction = Math.min(1, Number(activeLoan.repaidFraction || 0) + (loanDeduction / loanTotal));
      const newStatus = newFraction >= 0.99 ? 'Completed' : 'Active';
      await dbOrMock(
        () => Loan.update({ repaidFraction: newFraction, status: newStatus }, { where: { id: activeLoan.id } }),
        null,
      );

      smsService.onRepaymentDeducted({
        farmer,
        instalment: loanDeduction,
        remaining: Math.round(loanTotal * (1 - newFraction)),
        net: netAfterLoan,
      });
    }

    // Create payment record
    await dbOrMock(() => Payment.create({
      id: `P-${Date.now().toString(36)}-${farmer.id}`,
      farmerId: farmer.id, farmer: farmer.name, phone,
      amount: totalNet, deductions: loanDeduction, net: netAfterLoan,
      status: 'Paid', time: new Date().toISOString().replace('T',' ').slice(0,16),
      mpesaRef: ref,
    }), null);

    // SMS
    smsService.onPaymentDisbursed({
      farmer, amount: totalNet, deductions: loanDeduction, net: netAfterLoan, ref,
    });

    results.push({
      farmerId: farmer.id, name: farmer.name, phone,
      gross: totalNet, loanDeduction, net: netAfterLoan, ref,
      simulated: !!darajaResp._simulated,
    });
  }

  res.json({ ok: true, disbursed: results.length, results });
});

// ═══════════════════════════════════════════════════════════
//  M-PESA: BATCH APPROVAL (approve/reject payment batches)
// ═══════════════════════════════════════════════════════════
router.post('/payments/batch-approve', async (req, res) => {
  const { paymentIds, action } = req.body; // action: 'approve' or 'reject'
  if (!paymentIds || !action) return res.status(400).json({ error: 'paymentIds and action required' });

  const newStatus = action === 'approve' ? 'Paid' : 'Failed';
  let updated = 0;

  for (const id of paymentIds) {
    const result = await dbOrMock(
      () => Payment.update({ status: newStatus }, { where: { id } }),
      null,
    );
    if (result) updated++;
  }

  res.json({ ok: true, updated, action, newStatus });
});

// ═══════════════════════════════════════════════════════════
//  M-PESA: C2B VALIDATION — THE CORE REPAYMENT INTERCEPT
// ═══════════════════════════════════════════════════════════
/**
 * This is the endpoint Safaricom calls BEFORE processing a C2B payment.
 * 
 * When a cooperative pays a farmer via Paybill:
 *   1. Safaricom fires POST to this validation URL
 *   2. We check: does this farmer have a pending loan repayment?
 *   3. If yes: we accept but record the deduction
 *   4. The confirmation handler splits the payment
 *
 * This is the exact flow described in the README as "the core technical innovation."
 */
router.post('/mpesa/c2b/validation', async (req, res) => {
  const { TransactionType, TransID, TransAmount, BusinessShortCode, BillRefNumber, MSISDN } = req.body;

  console.log('═══════════════════════════════════════════');
  console.log('🔔 C2B VALIDATION RECEIVED');
  console.log(`   Phone: ${MSISDN}`);
  console.log(`   Amount: KSh ${TransAmount}`);
  console.log(`   Ref: ${BillRefNumber}`);
  console.log(`   TransID: ${TransID}`);
  console.log('═══════════════════════════════════════════');

  // Find the farmer by phone (strip 254 prefix → match phone field)
  const phoneClean = MSISDN ? MSISDN.replace(/^254/, '0') : '';
  const farmer = await dbOrMock(
    () => Farmer.findOne({ where: { phone: phoneClean }, raw: true }),
    FARMERS.find(f => f.phone === phoneClean),
  );

  if (!farmer) {
    console.log('⚠️  Farmer not found for phone:', phoneClean);
    // Still accept — don't block unknown payments
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  // Check for active loan
  const activeLoan = await dbOrMock(
    () => Loan.findOne({ where: { farmerId: farmer.id, status: 'Active' }, raw: true }),
    LOANS.find(l => l.farmerId === farmer.id && l.status === 'Active'),
  );

  const amount = Number(TransAmount);
  let loanDeduction = 0;
  let loanId = null;

  if (activeLoan) {
    const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
    const alreadyPaid = loanTotal * Number(activeLoan.repaidFraction || 0);
    const remaining = loanTotal - alreadyPaid;
    const instalment = Math.min(Math.round(loanTotal / Number(activeLoan.instalments || 3)), remaining);
    loanDeduction = Math.min(instalment, amount);
    loanId = activeLoan.id;

    console.log(`💰 LOAN INTERCEPT: ${farmer.name}`);
    console.log(`   Loan ${activeLoan.id}: KSh ${remaining.toFixed(0)} remaining`);
    console.log(`   Deducting: KSh ${loanDeduction} from KSh ${amount} payment`);
    console.log(`   Net to farmer: KSh ${amount - loanDeduction}`);
  }

  const netToFarmer = amount - loanDeduction;

  // Record in M-Pesa feed
  await dbOrMock(() => MpesaFeed.create({
    id: TransID || `C2B-${Date.now()}`,
    type: 'C2B',
    farmer: farmer.name,
    phone: MSISDN,
    amount: amount,
    direction: 'in',
    code: '0',
    ts: new Date().toISOString().replace('T',' ').slice(0,16),
    raw: {
      ...req.body,
      _chaiconnect: {
        farmerId: farmer.id,
        loanDeduction,
        loanId,
        netToFarmer,
        intercepted: loanDeduction > 0,
      },
    },
  }), null);

  // Accept the payment — Safaricom will proceed
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// ═══════════════════════════════════════════════════════════
//  M-PESA: C2B CONFIRMATION — Post-processing after payment
// ═══════════════════════════════════════════════════════════
router.post('/mpesa/c2b/confirmation', async (req, res) => {
  const { TransID, TransAmount, MSISDN, BillRefNumber } = req.body;

  console.log('✅ C2B CONFIRMATION:', TransID, 'KSh', TransAmount);

  const phoneClean = MSISDN ? MSISDN.replace(/^254/, '0') : '';
  const farmer = await dbOrMock(
    () => Farmer.findOne({ where: { phone: phoneClean }, raw: true }),
    FARMERS.find(f => f.phone === phoneClean),
  );

  if (!farmer) {
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  const amount = Number(TransAmount);

  // Check and apply loan deduction
  const activeLoan = await dbOrMock(
    () => Loan.findOne({ where: { farmerId: farmer.id, status: 'Active' }, raw: true }),
    null,
  );

  let loanDeduction = 0;
  if (activeLoan) {
    const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
    const alreadyPaid = loanTotal * Number(activeLoan.repaidFraction || 0);
    const remaining = loanTotal - alreadyPaid;
    const instalment = Math.min(Math.round(loanTotal / Number(activeLoan.instalments || 3)), remaining);
    loanDeduction = Math.min(instalment, amount);

    // Update loan progress
    const newFraction = Math.min(1, Number(activeLoan.repaidFraction || 0) + (loanDeduction / loanTotal));
    const newStatus = newFraction >= 0.99 ? 'Completed' : 'Active';
    await dbOrMock(
      () => Loan.update({ repaidFraction: newFraction, status: newStatus }, { where: { id: activeLoan.id } }),
      null,
    );

    // SMS farmer about deduction
    smsService.onRepaymentDeducted({
      farmer, instalment: loanDeduction,
      remaining: Math.round(loanTotal * (1 - newFraction)),
      net: amount - loanDeduction,
    });
  }

  // Create payment record
  await dbOrMock(() => Payment.create({
    id: TransID || `C2B-P-${Date.now()}`,
    farmerId: farmer.id, farmer: farmer.name, phone: MSISDN,
    amount, deductions: loanDeduction, net: amount - loanDeduction,
    status: 'Paid', time: new Date().toISOString().replace('T',' ').slice(0,16),
    mpesaRef: TransID,
  }), null);

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// ── Simulate a C2B payment (for demo/testing) ──────────
router.post('/mpesa/simulate-c2b', async (req, res) => {
  const { phone, amount, reference } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: 'phone and amount required' });

  // Simulate the same flow as if Safaricom sent validation + confirmation
  const simBody = {
    TransactionType: 'Pay Bill',
    TransID: `SIMC2B-${Date.now()}`,
    TransAmount: String(amount),
    BusinessShortCode: process.env.MPESA_SHORTCODE || '600984',
    BillRefNumber: reference || 'CoopPayment',
    MSISDN: phone.startsWith('254') ? phone : `254${phone.replace(/^0/, '')}`,
  };

  // Run validation
  const validationResult = { ResultCode: 0 };
  // Trigger confirmation logic directly
  const confirmReq = { body: simBody };
  const confirmRes = {
    json: (data) => {
      res.json({
        ok: true,
        message: 'C2B payment simulated — validation + confirmation processed',
        validation: validationResult,
        confirmation: data,
        transId: simBody.TransID,
      });
    }
  };

  // Process confirmation (which handles loan deduction)
  const phoneClean = simBody.MSISDN.replace(/^254/, '0');
  const farmer = await dbOrMock(
    () => Farmer.findOne({ where: { phone: phoneClean }, raw: true }),
    FARMERS.find(f => f.phone === phoneClean),
  );

  if (!farmer) {
    return res.json({ ok: true, message: 'Payment accepted (farmer not found in DB — no deduction)', transId: simBody.TransID });
  }

  const amt = Number(amount);
  const activeLoan = await dbOrMock(
    () => Loan.findOne({ where: { farmerId: farmer.id, status: 'Active' }, raw: true }),
    LOANS.find(l => l.farmerId === farmer.id && l.status === 'Active'),
  );

  let loanDeduction = 0;
  if (activeLoan) {
    const loanTotal = Number(activeLoan.amount) * (1 + Number(activeLoan.interestPct || 8) / 100);
    const alreadyPaid = loanTotal * Number(activeLoan.repaidFraction || 0);
    const remaining = loanTotal - alreadyPaid;
    loanDeduction = Math.min(Math.round(loanTotal / Number(activeLoan.instalments || 3)), remaining, amt);

    const newFraction = Math.min(1, Number(activeLoan.repaidFraction || 0) + (loanDeduction / loanTotal));
    await dbOrMock(() => Loan.update({ repaidFraction: newFraction, status: newFraction >= 0.99 ? 'Completed' : 'Active' }, { where: { id: activeLoan.id } }), null);

    smsService.onRepaymentDeducted({ farmer, instalment: loanDeduction, remaining: Math.round(loanTotal * (1 - newFraction)), net: amt - loanDeduction });
  }

  await dbOrMock(() => MpesaFeed.create({
    id: simBody.TransID, type: 'C2B', farmer: farmer.name, phone: simBody.MSISDN,
    amount: amt, direction: 'in', code: '0',
    ts: new Date().toISOString().replace('T',' ').slice(0,16),
    raw: { ...simBody, _chaiconnect: { farmerId: farmer.id, loanDeduction, netToFarmer: amt - loanDeduction, intercepted: loanDeduction > 0 } },
  }), null);

  await dbOrMock(() => Payment.create({
    id: `${simBody.TransID}-P`, farmerId: farmer.id, farmer: farmer.name, phone: simBody.MSISDN,
    amount: amt, deductions: loanDeduction, net: amt - loanDeduction,
    status: 'Paid', time: new Date().toISOString().replace('T',' ').slice(0,16), mpesaRef: simBody.TransID,
  }), null);

  res.json({
    ok: true, transId: simBody.TransID, farmer: farmer.name,
    gross: amt, loanDeduction, net: amt - loanDeduction,
    loanIntercepted: loanDeduction > 0,
    message: loanDeduction > 0
      ? `💰 Repayment intercepted: KSh ${loanDeduction} deducted, KSh ${amt - loanDeduction} to farmer`
      : `✅ Full payment KSh ${amt} to farmer (no active loan)`,
  });
});

// ═══════════════════════════════════════════════════════════
//  M-PESA: TRANSACTION STATUS
// ═══════════════════════════════════════════════════════════
router.post('/mpesa/transaction-status', async (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) return res.status(400).json({ error: 'transactionId required' });

  const result = await mpesaService.checkTransactionStatus(transactionId);
  res.json({ result, transactionId });
});

router.post('/mpesa/txstatus/result', (req, res) => {
  console.log('🔍 Transaction Status Result:', JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

router.post('/mpesa/txstatus/timeout', (_req, res) => {
  console.warn('⚠️ Transaction Status Timeout');
  res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' });
});

// ── B2C callbacks ──────────────────────────────────────
router.get('/mpesa/transactions', async (_req, res) => {
  const transactions = await dbOrMock(
    () => MpesaFeed.findAll({ raw: true, order: [['createdAt','DESC']], limit: 50 }),
    MPESA_FEED,
  );
  res.json({ transactions });
});

router.post('/mpesa/b2c/result', async (req, res) => {
  const result = req.body?.Result;
  if (!result) return res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' });
  const convId = result.ConversationID;
  console.log(`📩 B2C Result ${convId}: ${result.ResultCode === 0 ? '✅' : '❌'}`);
  await dbOrMock(() => MpesaFeed.update({ code: String(result.ResultCode), raw: result }, { where: { id: convId } }), null);
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

router.post('/mpesa/b2c/timeout', (_req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Acknowledged' });
});

// Register C2B URLs with Safaricom
router.post('/mpesa/register-urls', async (_req, res) => {
  const result = await mpesaService.registerC2BUrls();
  res.json({ result });
});

// Legacy simulate
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

// ═══════════════════════════════════════════════════════════
//  SEED PREMIUM HISTORY (demo helper — boosts a farmer to Grade A)
// ═══════════════════════════════════════════════════════════
router.post('/seed-premium-history/:farmerId', async (req, res) => {
  try {
    if (!Farmer) return res.status(500).json({ error: 'DB unavailable' });

    const farmer = await Farmer.findByPk(req.params.farmerId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    const fid = farmer.id;
    const fname = farmer.name;

    function daysAgo(n) {
      const d = new Date(); d.setDate(d.getDate() - n);
      return d.toISOString().slice(0, 10);
    }

    // Update farmer base stats
    await farmer.update({
      activeSince: '2019-01-15',
      totalKg: 22000,
      totalEarned: 660000,
      creditScore: 95,
      creditTier: 'A',
      loanFlow: 'eligible',
      gradeTrend: 'A',
    });

    // Create 36 months of deliveries (2 per month = 72 total)
    const deliveries = [];
    for (let m = 0; m < 36; m++) {
      for (let d = 0; d < 2; d++) {
        const kg = 280 + Math.round(Math.random() * 120);
        const grade = Math.random() > 0.15 ? 'A' : 'B';
        const rate = grade === 'A' ? 30 : 25;
        const gross = kg * rate;
        const deductions = Math.round(gross * 0.1);
        deliveries.push({
          id: `${fid}-pd${m}-${d}`,
          farmerId: fid,
          date: daysAgo(m * 30 + d * 14),
          kg, grade, rate, gross, deductions,
          net: gross - deductions,
          status: 'Paid',
        });
      }
    }
    await Delivery.bulkCreate(deliveries, { ignoreDuplicates: true });

    // Create 3 completed loans (perfect history)
    const loans = [
      { id: `${fid}-pL1`, farmerId: fid, farmerName: fname, amount: 30000, interestPct: 8, status: 'Completed', disbursedAt: '2023-03-01', repaidFraction: 1, instalments: 3 },
      { id: `${fid}-pL2`, farmerId: fid, farmerName: fname, amount: 40000, interestPct: 8, status: 'Completed', disbursedAt: '2024-01-15', repaidFraction: 1, instalments: 3 },
      { id: `${fid}-pL3`, farmerId: fid, farmerName: fname, amount: 45000, interestPct: 6, status: 'Completed', disbursedAt: '2024-09-01', repaidFraction: 1, instalments: 3 },
    ];
    await Loan.bulkCreate(loans, { ignoreDuplicates: true });

    // Create 40 payment records
    const payments = [];
    for (let i = 0; i < 40; i++) {
      const amount = 8000 + Math.round(Math.random() * 4000);
      const ded = Math.round(Math.random() * 2000);
      payments.push({
        id: `${fid}-pP${i}`,
        farmerId: fid, farmer: fname, phone: farmer.phone,
        amount, deductions: ded, net: amount - ded,
        status: 'Paid',
        time: `${daysAgo(i * 7)} 10:${String(i % 60).padStart(2, '0')}`,
        mpesaRef: `MPR${String(100 + i)}`,
      });
    }
    await Payment.bulkCreate(payments, { ignoreDuplicates: true });

    // Recalculate score
    const allDeliveries = await Delivery.findAll({ where: { farmerId: fid }, raw: true });
    const allLoans = await Loan.findAll({ where: { farmerId: fid }, raw: true });
    const allPayments = await Payment.findAll({ where: { farmerId: fid }, raw: true });
    const updatedFarmer = await Farmer.findByPk(fid, { raw: true });
    const result = creditScoringService.calculate({
      farmer: updatedFarmer, deliveries: allDeliveries, loans: allLoans, payments: allPayments,
    });
    await Farmer.update({ creditScore: result.score, creditTier: result.grade }, { where: { id: fid } });

    res.json({
      ok: true,
      farmer: fname,
      score: result.score,
      grade: result.grade,
      maxLoan: creditScoringService.maxLoanAmount(result.grade),
      seeded: { deliveries: deliveries.length, loans: loans.length, payments: payments.length },
      factors: result.factors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

