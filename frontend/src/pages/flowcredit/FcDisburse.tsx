import { useRef, useState } from 'react'
import { MpesaBadge } from '../../components/MpesaBadge'
import { postDisburse } from '../../lib/api'
import { FARMERS } from '../../data/seed'
import { useApp } from '../../context/AppProvider'

const DEMO_FARMER = FARMERS.find((f) => f.id === 'wanjiku') ?? FARMERS[0]

export function FlowCreditDisbursePage() {
  const farmer = DEMO_FARMER
  const { queueStaffB2CForFarmer, t, pushToast } = useApp()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [mpesaRef, setMpesaRef] = useState<string | null>(null)
  const [isSimulated, setIsSimulated] = useState(false)
  const [loading, setLoading] = useState(false)
  const termsRef = useRef<HTMLDivElement>(null)

  const disbureseAmount = 25000

  async function confirm() {
    setOpen(true)
    setStep(0)
    setLoading(true)
    setMpesaRef(null)

    const phone = `254${farmer.phone.replace(/\D/g, '').slice(-9)}`

    const result = await postDisburse({
      phone,
      amount: disbureseAmount,
      farmerId: farmer.id,
      farmerName: farmer.name,
      remarks: `FlowCredit loan — ${farmer.name}`,
    })

    setLoading(false)

    if (!result) {
      pushToast('❌ Could not reach backend — check that npm run dev is running')
      setOpen(false)
      return
    }

    setMpesaRef(result.ref)
    setIsSimulated(result.simulated)

    // Animate through steps using real timings from backend
    const delays = result.steps.map((s) => s.ms)
    let acc = 0
    delays.forEach((ms, idx) => {
      acc += ms
      window.setTimeout(() => setStep(idx + 1), acc)
    })
  }

  function completeDisbursement() {
    queueStaffB2CForFarmer({
      amount: disbureseAmount,
      label: `FlowCredit loan — ${farmer.name}`,
      ref: mpesaRef ?? `B2C-${String(Date.now()).slice(-8)}`,
    })
    pushToast(
      isSimulated
        ? '✅ Simulated B2C queued — update MPESA_SHORTCODE in .env for real calls'
        : `✅ B2C ${mpesaRef} sent to Safaricom — farmer will receive funds shortly`,
    )
    setOpen(false)
    setStep(0)
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
        <div className="mono" style={{ fontSize: 42, fontWeight: 900, marginTop: 8 }}>
          KSh {disbureseAmount.toLocaleString()}
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 13, opacity: 0.95 }}>
          <span>8% flat</span>
          <span>3 repayments</span>
          <span>{t('Score', 'Alama')} {farmer.creditScore}</span>
          <span>254{farmer.phone.replace(/\D/g, '').slice(-9)}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-gold" type="button" disabled={loading} onClick={() => void confirm()}>
            <MpesaBadge /> {loading ? t('Connecting…', 'Inaungana…') : t('Send via M-Pesa B2C', 'Tuma M-Pesa B2C')}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
            onClick={() => termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {t('Review terms', 'Soma masharti')}
          </button>
        </div>
      </div>

      <div ref={termsRef} className="card-surface" style={{ padding: 16, marginTop: 16 }}>
        <strong>{t('Loan terms (summary)', 'Masharti (muhtasari)')}</strong>
        <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--muted)', lineHeight: 1.6 }}>
          <li>{t('Principal KSh 25,000; flat 8% for this demo cycle.', 'Msingi KSh 25,000; 8% flat.')}</li>
          <li>{t('Three equal repayments via M-Pesa until cleared.', 'Malipo matatu kwa M-Pesa.')}</li>
          <li>{t('After B2C completes, farmer confirms receipt in Portal → Wallet.', 'Baada ya B2C, mkulima anathibitisha kwenye Wallet.')}</li>
        </ul>
      </div>

      <div className="card-surface" style={{ padding: 16, marginTop: 16 }}>
        <strong>B2C API payload</strong>
        <pre style={{ marginTop: 12, padding: 14, background: '#0b1220', color: '#baf7cf', borderRadius: 12, overflow: 'auto', fontSize: 12, lineHeight: 1.6 }}>
          {JSON.stringify({
            CommandID: 'BusinessPayment',
            Amount: disbureseAmount,
            PartyA: process.env.MPESA_SHORTCODE ?? '600984',
            PartyB: `254${farmer.phone.replace(/\D/g, '').slice(-9)}`,
            Remarks: `FlowCredit loan — ${farmer.name}`,
            ResultURL: `${window.location.origin}/api/mpesa/b2c/result`,
          }, null, 2)}
        </pre>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 160, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div className="card-surface" style={{ width: 'min(560px,100%)', padding: 18 }}>
            <strong>{t('Confirm B2C', 'Thibitisha B2C')}</strong>
            <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: 'var(--forest)', color: '#fff' }}>
              <div className="mono" style={{ fontSize: 30, fontWeight: 900 }}>KSh {disbureseAmount.toLocaleString()}</div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>{t('via M-Pesa Business Payment', 'kupitia M-Pesa Business')}</div>
              <div className="mono" style={{ marginTop: 8 }}>254{farmer.phone.replace(/\D/g, '').slice(-9)}</div>
              {mpesaRef && (
                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.75 }}>
                  Ref: {mpesaRef} {isSimulated && '(simulated)'}
                </div>
              )}
            </div>
            <ol style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>
              {['OAuth token', 'B2C request', 'Webhook', 'Ledger update'].map((label, i) => (
                <li key={label} style={{ fontWeight: step >= i + 1 ? 800 : 500, color: step >= i + 1 ? 'var(--text)' : undefined }}>
                  {step >= i + 1 ? '✅ ' : step === i ? '⏳ ' : ''}{label}
                </li>
              ))}
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
