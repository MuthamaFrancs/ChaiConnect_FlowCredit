const express = require('express')
const mpesaService = require('../services/MpesaService')
const ledger = require('../services/mpesaLedger')
const daraja = require('../config/daraja')
const { MPESA_FEED } = require('../data/seedPayload')

const router = express.Router()

function useRealB2C() {
  if (String(process.env.MPESA_USE_SIMULATION || '').toLowerCase() === 'true') return false
  return daraja.isB2CConfigured()
}

const SIM_STEPS = [
  { label: 'Request OAuth token from Daraja', ms: 400 },
  { label: 'POST /mpesa/b2c/v1/paymentrequest', ms: 1200 },
  { label: 'Receive webhook callback', ms: 800 },
  { label: 'Record disbursement + activate repayment schedule', ms: 400 },
]

function mapLedgerToFeedRow(e) {
  if (e.channel === 'b2c_init') {
    return {
      id: e.id,
      type: 'B2C',
      farmer: e.meta?.farmerHint || '',
      phone: e.meta?.phone || '',
      amount: e.meta?.amount || 0,
      direction: 'out',
      code: e.meta?.responseCode ?? '',
      ts: e.ts,
      pending: true,
      raw: e.meta?.daraja || {},
    }
  }
  if (e.channel === 'b2c_result') {
    return {
      id: e.id,
      type: 'B2C',
      farmer: e.meta?.farmerHint || '',
      phone: e.meta?.phone || '',
      amount: e.meta?.amount || 0,
      direction: 'out',
      code: String(e.meta?.resultCode ?? ''),
      ts: e.ts,
      pending: false,
      raw: e.meta?.raw || {},
    }
  }
  if (e.channel === 'stk_init') {
    return {
      id: e.id,
      type: 'STK',
      farmer: '',
      phone: e.meta?.phone || '',
      amount: e.meta?.amount || 0,
      direction: 'in',
      code: e.meta?.responseCode ?? '',
      ts: e.ts,
      pending: true,
      raw: e.meta?.daraja || {},
    }
  }
  return {
    id: e.id,
    type: e.channel || 'Event',
    farmer: '',
    phone: '',
    amount: 0,
    direction: 'in',
    code: '',
    ts: e.ts,
    raw: e.meta || {},
  }
}

/** Daraja wiring status (no secrets). */
router.get('/status', (_req, res) => {
  res.json({
    environment: daraja.useProduction() ? 'production' : 'sandbox',
    baseUrl: daraja.getBaseUrl(),
    callbackBaseConfigured: Boolean(daraja.getCallbackBase()),
    features: {
      b2c: daraja.isB2CConfigured(),
      stkPush: daraja.isStkConfigured(),
    },
  })
})

/** Combined demo seed + live in-memory events from this server. */
router.get('/transactions', (_req, res) => {
  const live = ledger.listRecent(40).map(mapLedgerToFeedRow)
  const merged = [...live, ...MPESA_FEED]
  res.json({ transactions: merged })
})

/**
 * Full B2C disbursement (production path).
 * Body: { amount, phone | partyB, remarks?, occasion?, CommandID? }
 */
router.post('/b2c', express.json(), async (req, res) => {
  try {
    if (!useRealB2C()) {
      return res.status(503).json({
        ok: false,
        error: 'B2C not configured',
        hint: 'Set MPESA_CALLBACK_BASE_URL, MPESA_B2C_SHORTCODE, initiator, and SecurityCredential. See .env.example',
      })
    }
    const { amount, remarks, occasion, CommandID } = req.body || {}
    const partyB = req.body.partyB || req.body.phone || req.body.PartyB
    if (!partyB || amount == null) {
      return res.status(400).json({ ok: false, error: 'amount and phone (or partyB) are required' })
    }

    const data = await mpesaService.b2cPaymentRequest({
      amount,
      partyB,
      remarks: remarks || 'ChaiConnect FlowCredit',
      occasion: occasion || 'Disbursement',
      commandId: CommandID || 'BusinessPayment',
    })

    ledger.push({
      channel: 'b2c_init',
      meta: {
        phone: mpesaService.normalizePhone(partyB),
        amount: Number(amount),
        responseCode: data.ResponseCode,
        daraja: data,
      },
    })

    return res.json({
      ok: true,
      mode: 'daraja',
      daraja: data,
      steps: [
        { label: 'Daraja accepted B2C request', ms: 200 },
        { label: 'Awaiting M-Pesa + callback to your Result URL', ms: 200 },
      ],
    })
  } catch (err) {
    const msg = err.response?.data || err.message
    console.error('B2C error:', msg)
    return res.status(err.response?.status || 500).json({
      ok: false,
      error: typeof msg === 'object' ? msg : String(msg),
    })
  }
})

/**
 * Same shape as the FlowCredit UI "simulate" call (Daraja payload).
 * Uses real Daraja when B2C is configured; otherwise returns sandbox simulation steps.
 */
router.post('/simulate-b2c', express.json(), async (req, res) => {
  const body = req.body || {}

  if (useRealB2C()) {
    try {
      const amount = body.Amount ?? body.amount
      const partyB = body.PartyB ?? body.partyB ?? body.phone
      const remarks = body.Remarks ?? body.remarks ?? 'FlowCredit'
      const CommandID = body.CommandID ?? 'BusinessPayment'

      const data = await mpesaService.b2cPaymentRequest({
        amount,
        partyB,
        remarks,
        occasion: 'FlowCredit',
        commandId: CommandID,
      })

      ledger.push({
        channel: 'b2c_init',
        meta: {
          phone: mpesaService.normalizePhone(partyB),
          amount: Number(amount),
          responseCode: data.ResponseCode,
          daraja: data,
        },
      })

      return res.json({
        ok: true,
        mode: 'daraja',
        payload: body,
        daraja: data,
        steps: [
          { label: 'OAuth + B2C request accepted by Safaricom', ms: 300 },
          { label: 'M-Pesa processing + ResultURL callback', ms: 500 },
        ],
      })
    } catch (err) {
      const msg = err.response?.data || err.message
      console.error('simulate-b2c (real) error:', msg)
      return res.status(err.response?.status || 500).json({
        ok: false,
        mode: 'daraja',
        error: typeof msg === 'object' ? msg : String(msg),
      })
    }
  }

  return res.json({
    ok: true,
    mode: 'simulation',
    payload: body,
    steps: SIM_STEPS,
  })
})

/** STK Push — collect payment from customer phone. */
router.post('/stk-push', express.json(), async (req, res) => {
  try {
    if (!daraja.isStkConfigured()) {
      return res.status(503).json({
        ok: false,
        error: 'STK not configured',
        hint: 'Set MPESA_STK_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_BASE_URL',
      })
    }
    const { amount, phoneNumber, accountReference, transactionDesc, transactionType } = req.body || {}
    if (!phoneNumber || amount == null) {
      return res.status(400).json({ ok: false, error: 'amount and phoneNumber are required' })
    }

    const data = await mpesaService.stkPush({
      amount,
      phoneNumber,
      accountReference,
      transactionDesc,
      transactionType,
    })

    ledger.push({
      channel: 'stk_init',
      meta: {
        phone: mpesaService.normalizePhone(phoneNumber),
        amount: Number(amount),
        responseCode: data.ResponseCode,
        daraja: data,
      },
    })

    return res.json({ ok: true, mode: 'daraja', daraja: data })
  } catch (err) {
    const msg = err.response?.data || err.message
    console.error('STK error:', msg)
    return res.status(err.response?.status || 500).json({
      ok: false,
      error: typeof msg === 'object' ? msg : String(msg),
    })
  }
})

/** Safaricom B2C result callback (set as Result URL in Daraja portal). */
router.post('/callback/b2c-result', express.json(), (req, res) => {
  const body = req.body || {}
  console.log('Daraja B2C result callback:', JSON.stringify(body).slice(0, 2000))

  const result = body.Result || body.result
  const resultCode = result?.ResultCode
  ledger.push({
    channel: 'b2c_result',
    meta: {
      resultCode,
      resultDesc: result?.ResultDesc,
      raw: body,
    },
  })

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})

router.post('/callback/b2c-timeout', express.json(), (req, res) => {
  console.warn('Daraja B2C timeout:', JSON.stringify(req.body || {}).slice(0, 1500))
  ledger.push({ channel: 'b2c_timeout', meta: { raw: req.body } })
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})

/** STK Lipa na M-Pesa callback */
router.post('/callback/stk', express.json(), (req, res) => {
  const body = req.body || {}
  console.log('Daraja STK callback:', JSON.stringify(body).slice(0, 2500))

  ledger.push({
    channel: 'stk_callback',
    meta: { raw: body },
  })

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})

module.exports = router
