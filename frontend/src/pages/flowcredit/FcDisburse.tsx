import { useRef, useState } from 'react'
import { MpesaBadge } from '../../components/MpesaBadge'
import { postSimulateB2C } from '../../lib/api'
import { FARMERS } from '../../data/seed'
import { useApp } from '../../context/AppProvider'

/** Demo path: same farmer as portal login (Wanjiku) so B2C → accept in Wallet is end-to-end. */
const DEMO_FARMER = FARMERS.find((f) => f.id === 'wanjiku') ?? FARMERS[0]

export function FlowCreditDisbursePage() {
  const farmer = DEMO_FARMER
  const { queueStaffB2CForFarmer, t, pushToast } = useApp()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const termsRef = useRef<HTMLDivElement>(null)

  const payload = {
    CommandID: 'BusinessPayment',
    Amount: 25000,
    PartyA: '600984',
    PartyB: `254${farmer.phone.replace(/\D/g, '').slice(-9)}`,
    Remarks: `FlowCredit loan — ${farmer.name}`,
    ResultURL: 'https://chaiconnect.co.ke/api/b2c/result',
  }

  async function confirm() {
    setOpen(true)
    setStep(0)
    const plan = await postSimulateB2C(payload)
    if (plan.ok === false) {
      const msg =
        typeof plan.error === 'object' && plan.error && 'error' in (plan.error as object)
          ? String((plan.error as { error?: string }).error)
          : JSON.stringify(plan.error ?? plan)
      pushToast(t(`Daraja: ${msg}`, `Daraja: ${msg}`))
      setOpen(false)
      return
    }
    const delays = (plan?.steps ?? [
      { label: 'OAuth', ms: 400 },
      { label: 'B2C', ms: 1200 },
      { label: 'Webhook', ms: 800 },
      { label: 'Ledger', ms: 400 },
    ]).map((s) => s.ms)
    let acc = 0
    delays.forEach((ms, idx) => {
      acc += ms
      window.setTimeout(() => setStep(idx + 1), acc)
    })
  }

  function scrollToTerms() {
    termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function completeDisbursement() {
    queueStaffB2CForFarmer({
      amount: payload.Amount,
      label: `FlowCredit loan — ${farmer.name}`,
      ref: `B2C-${String(Date.now()).slice(-8)}`,
    })
    setOpen(false)
  }

  return (
    <div>
      <h2 style={{ color: 'var(--gold)' }}>Disbursement</h2>
      <div
        className="page-enter"
        style={{
          marginTop: 16,
          borderRadius: 22,
          padding: 22,
          background: 'linear-gradient(135deg, var(--fresh) 0%, var(--forest) 100%)',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.9 }}>
          {t('Loan offer', 'Ofa ya mkopo')} — {farmer.name}
        </div>
        <div className="mono" style={{ fontSize: 42, fontWeight: 900, marginTop: 8 }}>KSh 25,000</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 13, opacity: 0.95 }}>
          <span>8% flat</span>
          <span>3 repayments</span>
          <span>
            {t('Score', 'Alama')} {farmer.creditScore}
          </span>
          <span>0{farmer.phone}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-gold" type="button" onClick={() => void confirm()}>
            <MpesaBadge /> {t('Send via M-Pesa B2C', 'Tuma M-Pesa B2C')}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
            onClick={scrollToTerms}
          >
            {t('Review terms', 'Soma masharti')}
          </button>
        </div>
      </div>

      <div ref={termsRef} className="card-surface" style={{ padding: 16, marginTop: 16 }}>
        <strong>{t('Loan terms (summary)', 'Masharti (muhtasari)')}</strong>
        <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--muted)', lineHeight: 1.6 }}>
          <li>{t('Principal KSh 25,000; flat 8% for this demo cycle.', 'Msingi KSh 25,000; 8% flat kwa ajili ya maonyesho.')}</li>
          <li>{t('Three equal repayments via M-Pesa until cleared.', 'Malipo matatu kwa M-Pesa.')}</li>
          <li>
            {t(
              'After B2C completes, the farmer confirms receipt in Portal → Wallet; ledger + score update.',
              'Baada ya B2C, mkulima anathibitisha kwenye Portal → Wallet; historia na alama huboreshwa.',
            )}
          </li>
        </ul>
      </div>

      <div className="card-surface" style={{ padding: 16, marginTop: 16 }}>
        <strong>B2C API payload</strong>
        <pre style={{ marginTop: 12, padding: 14, background: '#0b1220', color: '#baf7cf', borderRadius: 12, overflow: 'auto', fontSize: 12, lineHeight: 1.6 }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 160,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
        >
          <div className="card-surface" style={{ width: 'min(560px,100%)', padding: 18 }}>
            <strong>{t('Confirm B2C', 'Thibitisha B2C')}</strong>
            <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: 'var(--forest)', color: '#fff' }}>
              <div className="mono" style={{ fontSize: 30, fontWeight: 900 }}>KSh 25,000</div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>{t('via M-Pesa Business Payment', 'kupitia M-Pesa Business')}</div>
              <div className="mono" style={{ marginTop: 8 }}>254{farmer.phone.replace(/\D/g, '').slice(-9)}</div>
            </div>
            <ol style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>
              <li style={{ fontWeight: step >= 1 ? 800 : 500, color: step >= 1 ? 'var(--text)' : undefined }}>OAuth token</li>
              <li style={{ fontWeight: step >= 2 ? 800 : 500, color: step >= 2 ? 'var(--text)' : undefined }}>B2C request</li>
              <li style={{ fontWeight: step >= 3 ? 800 : 500, color: step >= 3 ? 'var(--text)' : undefined }}>Webhook</li>
              <li style={{ fontWeight: step >= 4 ? 800 : 500, color: step >= 4 ? 'var(--text)' : undefined }}>Ledger update</li>
            </ol>
            <button
              className="btn btn-gold"
              type="button"
              disabled={step < 4}
              style={{ width: '100%', marginTop: 12, justifyContent: 'center', opacity: step < 4 ? 0.65 : 1 }}
              onClick={completeDisbursement}
            >
              {step < 4 ? t('Processing…', 'Inachakata…') : t('Done — notify farmer in Wallet', 'Maliza — arifu mkulima Wallet')}
            </button>
            {step < 4 && (
              <button className="btn btn-ghost" type="button" style={{ width: '100%', marginTop: 8 }} onClick={() => setOpen(false)}>
                {t('Cancel', 'Ghairi')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
