const express = require('express');
const router = express.Router();

// 1. POST /api/mpesa/stkpush (To trigger a payment FROM a farmer)
router.post('/stkpush', async (req, res) => {
    try {
        // Logic to get Access Token from Safaricom
        // Logic to send STK Push request
        res.status(200).json({ message: "STK Push initiated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. POST /api/mpesa/disburse (B2C: Sending money TO a farmer)
router.post('/disburse', async (req, res) => {
    const { phoneNumber, amount, remarks } = req.body;
    console.log(`💸 Initiating B2C to ${phoneNumber} for KES ${amount}`);
    
    // TODO: Implement M-PESA B2C Logic here
    res.status(200).json({ status: "Processing Disbursement" });
});

// 3. POST /api/mpesa/b2c/result (Callback for B2C)
// This is the endpoint Safaricom calls to tell you if the money reached the farmer
router.post('/b2c/result', async (req, res) => {
    const result = req.body.Result;
    console.log("📩 B2C Result Received:", JSON.stringify(result, null, 2));

    if (result.ResultCode === 0) {
        console.log("✅ Payment Successful!");
        // TODO: Update your Payment model status to 'Completed' in the DB
    } else {
        console.log("❌ Payment Failed:", result.ResultDesc);
    }

    res.json({ ResultCode: 0, ResultDesc: "Success" });
});

// 4. POST /api/mpesa/b2c/timeout (In case Safaricom systems are slow)
router.post('/b2c/timeout', (req, res) => {
    console.warn("⚠️ B2C Request Timed Out");
    res.json({ ResultCode: 0, ResultDesc: "Acknowledged" });
});

module.exports = router;