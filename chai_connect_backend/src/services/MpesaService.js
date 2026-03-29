const axios = require('axios');
require('dotenv').config();

class MpesaService {
  /** Get OAuth token from Daraja */
  async getAccessToken() {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } }
    );
    console.log('🎟️  Daraja OAuth token acquired');
    return response.data.access_token;
  }

  /**
   * B2C — Business to Customer (send money to a farmer's phone)
   * @param {object} p
   * @param {string} p.phone     - 2547XXXXXXXX format
   * @param {number} p.amount    - KSh amount
   * @param {string} p.remarks   - e.g. "FlowCredit loan — Wanjiku"
   * @param {string} p.occasion  - optional
   */
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
        'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
        body,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('💸 B2C initiated:', response.data);
      return response.data;
    } catch (err) {
      // If real B2C fails (e.g. sandbox credentials not configured),
      // return a simulated response so the UI still works in demo mode
      const simulatedRef = `SIM-${Date.now()}`;
      console.warn('⚠️  B2C sandbox call failed, returning simulated response:', err.response?.data?.errorMessage || err.message);
      return {
        ConversationID: simulatedRef,
        OriginatorConversationID: `ORIG-${simulatedRef}`,
        ResponseDescription: 'Simulated — sandbox not configured',
        _simulated: true,
      };
    }
  }
}

module.exports = new MpesaService();
