/**
 * SMS Notification Service
 *
 * Simulates SMS delivery to farmers on key events.
 * In production, this would integrate with Africa's Talking, Twilio, or
 * Safaricom's own SMS API. For the hackathon demo, it logs the SMS and
 * stores it in a notifications array accessible via API.
 */

// In-memory store for demo — in production this would be a DB table
const sentMessages = [];

let atClient = null;
if (process.env.AT_USERNAME && process.env.AT_API_KEY) {
  try {
    const africastalking = require('africastalking')({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });
    atClient = africastalking.SMS;
    console.log('✅ Africa\'s Talking SMS client initialized');
  } catch (err) {
    console.warn('⚠️ Failed to initialize Africa\'s Talking client, falling back to simulated SMS:', err.message);
    atClient = null;
  }
}

class SmsService {
  /**
   * Send SMS when a delivery is recorded
   */
  async onDeliveryRecorded({ farmer, delivery }) {
    const msg = `ChaiConnect: Your ${delivery.kg} kg of Grade ${delivery.grade} tea has been recorded at ${farmer.factory || 'your factory'}. Expected payment: KSh ${Number(delivery.gross).toLocaleString()}. Ref: ${delivery.id}`;
    return this._send(farmer.phone, msg, 'delivery_recorded');
  }

  /**
   * Send SMS when B2C payment is disbursed
   */
  async onPaymentDisbursed({ farmer, amount, deductions, net, ref }) {
    const msg = `ChaiConnect: KSh ${Number(amount).toLocaleString()} gross → KSh ${Number(deductions).toLocaleString()} deductions → KSh ${Number(net).toLocaleString()} net sent to your M-Pesa. Ref: ${ref}`;
    return this._send(farmer.phone, msg, 'payment_disbursed');
  }

  /**
   * Send SMS when loan is disbursed via B2C
   */
  async onLoanDisbursed({ farmer, loanAmount, ref }) {
    const msg = `FlowCredit: KSh ${Number(loanAmount).toLocaleString()} loan disbursed to your M-Pesa. Repayments will be auto-deducted from your next cooperative payments. Ref: ${ref}`;
    return this._send(farmer.phone, msg, 'loan_disbursed');
  }

  /**
   * Send SMS when a loan repayment is deducted
   */
  async onRepaymentDeducted({ farmer, instalment, remaining, net }) {
    const msg = `FlowCredit: KSh ${Number(instalment).toLocaleString()} loan repayment deducted. Remaining loan: KSh ${Number(remaining).toLocaleString()}. Net to M-Pesa: KSh ${Number(net).toLocaleString()}.`;
    return this._send(farmer.phone, msg, 'repayment_deducted');
  }

  /**
   * Send SMS when credit score changes
   */
  async onCreditScoreUpdate({ farmer, newScore, grade }) {
    const msg = `FlowCredit: Your credit score updated to ${newScore} (Grade ${grade}). Higher scores = larger loan limits. Keep delivering!`;
    return this._send(farmer.phone, msg, 'credit_score_update');
  }

  /**
   * Core send method — logs to console + stores in memory for API
   */
  async _send(phone, message, type) {
    const sms = {
      id: `SMS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      phone,
      message,
      type,
      sentAt: new Date().toISOString(),
      status: 'queued',
    };

    // If Africa's Talking client is configured, send real SMS
    if (atClient) {
      try {
        const res = await atClient.send({ to: [phone], message });
        sms.status = 'sent';
        sms.providerResponse = res;
        console.log(`📱 SMS sent via Africa's Talking → ${phone}: ${message.slice(0, 80)}…`);
      } catch (err) {
        sms.status = 'failed';
        sms.error = err.message;
        console.warn('⚠️ Africa\'s Talking SMS failed:', err.message);
      }
    } else {
      // Simulated delivery
      sms.status = 'delivered';
      console.log(`📱 SMS (simulated) → ${phone}: ${message.slice(0, 80)}…`);
    }

    sentMessages.unshift(sms); // newest first
    if (sentMessages.length > 100) sentMessages.splice(100); // cap at 100

    return sms;
  }

  /**
   * Get all sent messages (for the transaction feed / demo)
   */
  getSentMessages() {
    return sentMessages;
  }
}

module.exports = new SmsService();
