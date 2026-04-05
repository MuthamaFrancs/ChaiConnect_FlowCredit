const mpesaService = require('../services/MpesaService');
const { Farmer, Loan, Payment } = require('../models');

exports.disburseLoan = async (req, res) => {
  const { farmerId, amount } = req.body;

  try {
    // 1. Find Farmer
    const farmer = await Farmer.findOne({ where: { farmerId } });
    if (!farmer) return res.status(404).json({ message: "Farmer not found" });

    // 2. Create the Loan record in DB (Status: Pending)
    const totalRepayable = parseFloat(amount) * 1.08; // 8% interest
    const loan = await Loan.create({
      FarmerId: farmer.id,
      loanAmount: amount,
      totalRepayable: totalRepayable,
      remainingBalance: totalRepayable,
      status: 'Active' // We assume it works, or update on callback
    });

    // 3. Trigger M-Pesa B2C
    const mpesaResponse = await mpesaService.disburseLoan(
      farmer.phoneNumber, 
      amount, 
      loan.id // We use the Loan UUID as the ConversationID
    );

    res.status(200).json({ 
      message: "Disbursement initiated", 
      loanId: loan.id, 
      mpesaResponse 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.handleB2CResult = async (req, res) => {
  const result = req.body.Result;
  console.log("📩 B2C Callback Received:", JSON.stringify(result, null, 2));

  // ResultCode 0 means SUCCESS
  if (result.ResultCode === 0) {
    const loanId = result.OriginatorConversationID;
    const mpesaReceipt = result.ResultParameters.ResultParameter.find(p => p.Key === 'TransactionID').Value;

    // Update the record to show money actually moved
    await Payment.create({
      LoanId: loanId,
      amount: result.ResultParameters.ResultParameter.find(p => p.Key === 'TransactionAmount').Value,
      transactionId: mpesaReceipt,
      status: 'Completed',
      paymentType: 'Loan_Disbursement'
    });
  }

  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
};

exports.handleB2CTimeout = (req, res) => {
  console.error("⏰ B2C Request Timed Out:", req.body);
  res.status(200).send("OK");
};


exports.payFarmerForProduce = async (req, res) => {
  const { farmerId, kgs } = req.body;
  const RATE_PER_KG = 30; // KES 30 per kg

  try {
    const farmer = await Farmer.findOne({ where: { farmerId }, include: [Loan] });
    let grossPay = kgs * RATE_PER_KG;
    let deduction = 0;

    // FIND ACTIVE LOAN
    const activeLoan = await Loan.findOne({ 
        where: { FarmerId: farmer.id, status: 'Active' } 
    });

    if (activeLoan && activeLoan.remainingBalance > 0) {
      // Deduct 50% of gross pay or the remaining balance (whichever is smaller)
      deduction = Math.min(grossPay * 0.5, activeLoan.remainingBalance);
      
      // Update Loan Balance
      activeLoan.remainingBalance -= deduction;
      if (activeLoan.remainingBalance <= 0) activeLoan.status = 'Paid';
      await activeLoan.save();

      // Record Repayment
      await Payment.create({
        FarmerId: farmer.id,
        LoanId: activeLoan.id,
        amount: deduction,
        status: 'Completed',
        paymentType: 'Loan_Repayment'
      });
    }

    const netPay = grossPay - deduction;

    // SEND NET PAY VIA B2C
    await mpesaService.disburseLoan(farmer.phoneNumber, netPay, `PAY-${Date.now()}`);

    res.json({ 
        farmer: farmer.fullName,
        gross: grossPay, 
        deducted: deduction, 
        netSent: netPay 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mock disbursement handler for local testing without Daraja
exports.disburseLoanMock = async (req, res) => {
  const { farmerId, amount } = req.body;
  try {
    const farmer = await Farmer.findOne({ where: { farmerId } });
    if (!farmer) return res.status(404).json({ message: 'Farmer not found' });

    const totalRepayable = parseFloat(amount) * 1.08;
    const loan = await Loan.create({
      FarmerId: farmer.id,
      loanAmount: amount,
      totalRepayable,
      remainingBalance: totalRepayable,
      status: 'Active'
    });

    // Record a simulated payment to represent money moved
    const payment = await Payment.create({
      FarmerId: farmer.id,
      LoanId: loan.id,
      amount,
      transactionId: `SIM-${Date.now()}`,
      status: 'Completed',
      paymentType: 'Loan_Disbursement'
    });

    // Optionally update loan as disbursed (we keep status Active)

    res.status(200).json({
      message: 'Mock disbursement completed',
      loanId: loan.id,
      payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// List recent MPESA transactions (fallback to seeded data when DB not available)
exports.listTransactions = async (req, res) => {
  try {
    const models = require('../models');
    const MpesaFeed = models.MpesaFeed;
    const transactions = await MpesaFeed.findAll({ raw: true, order: [['createdAt','DESC']], limit: 50 });
    return res.json({ transactions });
  } catch (err) {
    // Fallback to seeded mock data
    try {
      const { MPESA_FEED } = require('../data/seedPayload');
      return res.json({ transactions: MPESA_FEED });
    } catch (e) {
      return res.json({ transactions: [] });
    }
  }
};
