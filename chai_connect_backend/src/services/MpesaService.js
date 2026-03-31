const axios = require('axios');
require('dotenv').config();

const DARAJA_BASE = 'https://sandbox.safaricom.co.ke';

class MpesaService {
  /** ── OAuth Token ─────────────────────────────────────── */
  async getAccessToken() {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    const response = await axios.get(
      `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    console.log('🎟️  Daraja OAuth token acquired');
    return response.data.access_token;
  }

  /** ── B2C — Business to Customer ─────────────────────── */
  async sendB2C({ phone, amount, remarks = 'FlowCredit Disbursement', occasion = 'Loan' }) {
    const token = await this.getAccessToken();
    const baseUrl = process.env.BASE_URL || 'https://example.ngrok.io';
    const shortcode = process.env.MPESA_SHORTCODE || '600984';

    const body = {
      InitiatorName: 'testapi',
      SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL || 'PLACEHOLDER_CREDENTIAL',
      CommandID: 'BusinessPayment',
      Amount: amount,
      PartyA: shortcode,
      PartyB: phone,
      Remarks: remarks,
  QueueTimeOutURL: `${baseUrl}/api/mpesa/b2c/timeout`,
  ResultURL: `${baseUrl}/api/mpesa/b2c/result`,
      Occasion: occasion,
    };

    try {
      const response = await axios.post(
        `${DARAJA_BASE}/mpesa/b2c/v1/paymentrequest`,
        body,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('💸 B2C initiated:', response.data);
      return response.data;
    } catch (err) {
      const simulatedRef = `SIM-${Date.now()}`;
      console.warn('⚠️  B2C sandbox failed, simulated:', err.response?.data?.errorMessage || err.message);
      return {
        ConversationID: simulatedRef,
        OriginatorConversationID: `ORIG-${simulatedRef}`,
        ResponseDescription: 'Simulated — sandbox not configured',
        _simulated: true,
      };
    }
  }

  /** ── Register C2B URLs ──────────────────────────────── */
  async registerC2BUrls() {
    const token = await this.getAccessToken();
    const baseUrl = process.env.BASE_URL || 'https://example.ngrok.io';
    const shortcode = process.env.MPESA_SHORTCODE || '600984';

    const body = {
      ShortCode: shortcode,
      ResponseType: 'Completed',
  ConfirmationURL: `${baseUrl}/api/mpesa/c2b/confirmation`,
  ValidationURL: `${baseUrl}/api/mpesa/c2b/validation`,
    };

    try {
      const response = await axios.post(
        `${DARAJA_BASE}/mpesa/c2b/v1/registerurl`,
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ C2B URLs registered:', response.data);
      return response.data;
    } catch (err) {
      console.warn('⚠️  C2B URL registration failed (sandbox):', err.response?.data || err.message);
      return { _simulated: true, message: 'C2B URL registration simulated' };
    }
  }

  /** ── Transaction Status API ─────────────────────────── */
  async checkTransactionStatus(transactionID) {
    const token = await this.getAccessToken();
    const baseUrl = process.env.BASE_URL || 'https://example.ngrok.io';
    const shortcode = process.env.MPESA_SHORTCODE || '600984';

    const body = {
      Initiator: 'testapi',
      SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL || 'PLACEHOLDER_CREDENTIAL',
      CommandID: 'TransactionStatusQuery',
      TransactionID: transactionID,
      PartyA: shortcode,
      IdentifierType: '4',
  ResultURL: `${baseUrl}/api/mpesa/txstatus/result`,
  QueueTimeOutURL: `${baseUrl}/api/mpesa/txstatus/timeout`,
      Remarks: 'ChaiConnect status check',
      Occasion: 'Status',
    };

    try {
      const response = await axios.post(
        `${DARAJA_BASE}/mpesa/transactionstatus/v1/query`,
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('🔍 Transaction status query sent:', response.data);
      return response.data;
    } catch (err) {
      console.warn('⚠️  Transaction Status API failed:', err.response?.data || err.message);
      return {
        _simulated: true,
        ResultCode: 0,
        ResultDesc: 'Simulated: transaction confirmed',
        TransactionID: transactionID,
      };
    }
  }

  async disburseLoan(phoneNumber, amount, loanId) {
  const token = await this.getAccessToken();
  const url = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest";

  const data = {
    "OriginatorConversationID": loanId, // Track this loan
    "InitiatorName": "testapi", // Sandbox default
    "SecurityCredential": "Your_Sandbox_Security_Credential", // We will get this next
    "CommandID": "BusinessPayment",
    "Amount": amount,
    "PartyA": process.env.MPESA_SHORTCODE, // Your B2C shortcode
    "PartyB": phoneNumber, 
    "Remarks": `FlowCredit Loan Disbursement: ${loanId}`,
    "QueueTimeOutURL": `${process.env.BASE_URL}/api/mpesa/b2c/timeout`,
    "ResultURL": `${process.env.BASE_URL}/api/mpesa/b2c/result`,
    "Occasion": "AgriTechLoan"
  };

  try {
    const response = await axios.post(url, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('❌ B2C Error:', error.response ? error.response.data : error.message);
    throw error;
  }
}
}

module.exports = new MpesaService();
