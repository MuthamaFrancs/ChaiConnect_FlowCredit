const express = require('express');
const router = express.Router();
const mpesaController = require('../controllers/mpesaController');

// 1. Trigger the loan disbursement (Internal/Admin use)
router.post('/disburse', mpesaController.disburseLoan);
// Mock disbursement for local testing without calling Daraja
router.post('/disburse-mock', mpesaController.disburseLoanMock);

// 2. Safaricom B2C Callback (Publicly accessible via Ngrok)
router.post('/b2c/result', mpesaController.handleB2CResult);
router.post('/b2c/timeout', mpesaController.handleB2CTimeout);
router.post('/pay-farmer', mpesaController.payFarmerForProduce);

module.exports = router;