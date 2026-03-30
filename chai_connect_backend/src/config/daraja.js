/**
 * Safaricom Daraja API base URLs and configuration helpers.
 * @see https://developer.safaricom.co.ke
 */
require('dotenv').config()

const PRODUCTION_BASE = 'https://api.safaricom.co.ke'
const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke'

function useProduction() {
  return String(process.env.MPESA_ENV || '').toLowerCase() === 'production'
}

function getBaseUrl() {
  if (process.env.MPESA_BASE_URL) return process.env.MPESA_BASE_URL.replace(/\/$/, '')
  return useProduction() ? PRODUCTION_BASE : SANDBOX_BASE
}

/** Public HTTPS base for callbacks (ngrok / deployed API). No trailing slash. */
function getCallbackBase() {
  const raw = process.env.MPESA_CALLBACK_BASE_URL || ''
  return raw.replace(/\/$/, '')
}

function callbackPath(suffix) {
  const base = getCallbackBase()
  if (!base) return ''
  return `${base}/api/mpesa/callback/${suffix}`
}

/** B2C: PartyA shortcode, initiator, encrypted security credential from Daraja portal. */
function isB2CConfigured() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_B2C_SHORTCODE &&
      process.env.MPESA_B2C_INITIATOR_NAME &&
      process.env.MPESA_B2C_SECURITY_CREDENTIAL &&
      getCallbackBase(),
  )
}

/** STK Push: till / paybill shortcode + Lipa na M-Pesa passkey. */
function isStkConfigured() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_STK_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      getCallbackBase(),
  )
}

module.exports = {
  getBaseUrl,
  useProduction,
  getCallbackBase,
  callbackPath,
  isB2CConfigured,
  isStkConfigured,
}
