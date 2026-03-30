const axios = require('axios')
const daraja = require('../config/daraja')
require('dotenv').config() // ensure env before daraja reads it (daraja also loads dotenv)

/**
 * Normalize Kenyan phone to 254XXXXXXXXX.
 * @param {string} phone
 */
function normalizePhone(phone) {
  const d = String(phone || '').replace(/\D/g, '')
  if (d.startsWith('254') && d.length >= 12) return d.slice(0, 12)
  if (d.length === 9) return `254${d}`
  if (d.length === 10 && d.startsWith('0')) return `254${d.slice(1)}`
  return d.length >= 10 ? d : `254${d.slice(-9)}`
}

/**
 * STK Push password: Base64( Shortcode + Passkey + Timestamp )
 */
function stkPassword(shortcode, passkey, timestamp) {
  const str = `${shortcode}${passkey}${timestamp}`
  return Buffer.from(str).toString('base64')
}

function formatTimestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

class MpesaService {
  async getAccessToken() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET
    if (!consumerKey || !consumerSecret) {
      throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are required')
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const base = daraja.getBaseUrl()
    const url = `${base}/oauth/v1/generate?grant_type=client_credentials`

    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 30000,
    })
    return response.data.access_token
  }

  /**
   * B2C Business Payment — send money to a phone (loan disbursement, payouts).
   * @see https://developer.safaricom.co.ke/APIs/BusinessToCustomerPayment
   */
  async b2cPaymentRequest({
    amount,
    partyB,
    remarks = 'ChaiConnect',
    occasion = 'Disbursement',
    commandId = 'BusinessPayment',
  }) {
    if (!daraja.isB2CConfigured()) {
      throw new Error('B2C is not fully configured in environment variables')
    }

    const token = await this.getAccessToken()
    const base = daraja.getBaseUrl()
    const url = `${base}/mpesa/b2c/v1/paymentrequest`

    const body = {
      InitiatorName: process.env.MPESA_B2C_INITIATOR_NAME,
      SecurityCredential: process.env.MPESA_B2C_SECURITY_CREDENTIAL,
      CommandID: commandId,
      Amount: String(Math.round(Number(amount))),
      PartyA: process.env.MPESA_B2C_SHORTCODE,
      PartyB: normalizePhone(partyB),
      Remarks: String(remarks).slice(0, 140),
      QueueTimeOutURL: daraja.callbackPath('b2c-timeout'),
      ResultURL: daraja.callbackPath('b2c-result'),
      Occasion: String(occasion).slice(0, 140),
    }

    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    })
    return response.data
  }

  /**
   * Lipa na M-Pesa Online — STK Push (customer pays business).
   */
  async stkPush({
    amount,
    phoneNumber,
    accountReference = 'ChaiConnect',
    transactionDesc = 'Payment',
    transactionType = 'CustomerPayBillOnline',
  }) {
    if (!daraja.isStkConfigured()) {
      throw new Error('STK Push is not fully configured in environment variables')
    }

    const shortcode = process.env.MPESA_STK_SHORTCODE
    const passkey = process.env.MPESA_PASSKEY
    const timestamp = formatTimestamp()
    const password = stkPassword(shortcode, passkey, timestamp)

    const token = await this.getAccessToken()
    const base = daraja.getBaseUrl()
    const url = `${base}/mpesa/stkpush/v1/processrequest`

    const phone = normalizePhone(phoneNumber)

    const body = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: Math.round(Number(amount)),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: daraja.callbackPath('stk'),
      AccountReference: String(accountReference).slice(0, 12),
      TransactionDesc: String(transactionDesc).slice(0, 13),
    }

    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    })
    return response.data
  }
}

const svc = new MpesaService()
svc.normalizePhone = normalizePhone
module.exports = svc
