const axios = require('axios');
require('dotenv').config();

class MpesaService {
  /**
   * Generates a Daraja Access Token
   */
  async getAccessToken() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    
    // 1. Create the auth string (Key:Secret) and encode to Base64
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
      const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      console.log("🎟️ New Access Token Generated");
      return response.data.access_token;
    } catch (error) {
      console.error('❌ M-Pesa OAuth Error:', error.response ? error.response.data : error.message);
      throw new Error('Failed to generate M-Pesa access token');
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
    "QueueTimeOutURL": `${process.env.BASE_URL}/api/v1/mpesa/b2c/timeout`,
    "ResultURL": `${process.env.BASE_URL}/api/v1/mpesa/b2c/result`,
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