import { useEffect, useRef, useState } from 'react'
import { MpesaBadge } from '../../components/MpesaBadge'
import { postDisburse, fetchFarmers, fetchCreditScore } from '../../lib/api'
import { useApp } from '../../context/AppProvider'

type FarmerRow = { id: string; name: string; phone: string; creditScore: number; creditTier: string; memberNo: string; factory: string }

export function FlowCreditDisbursePage() {
  const { queueStaffB2CForFarmer, t, pushToast } = useApp()
  const [farmers, setFarmers] = useState<FarmerRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creditData, setCreditData] = useState<{ score: number; grade: string; maxLoanAmount: number; factors: Record<string, { score: number; max: number; detail: string }> } | null>(null)
  const [amount, setAmount] = useState(25000)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [mpesaRef, setMpesaRef] = useState<string | null>(null)
  const [isSimulated, setIsSimulated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiLog, setApiLog] = useState<{ step: string; status: 'pending' | 'done' | 'error'; detail?: string; ms?: number }[]>([])
  const [rawResponse, setRawResponse] = useState<Record<string, unknown> | null>(null)
  const termsRef = useRef<HTMLDivElement>(null)

  // Load farmers from DB
  useEffect(() => {
    void (async () => {
      const data = await fetchFarmers()
      setFarmers(data as FarmerRow[])
      if (data.length > 0) setSelectedId((data as FarmerRow[])[0].id)
    })()
  }, [])

  const farmer = farmers.find(f => f.id === selectedId) ?? null

  // Load real credit score when farmer changes
  useEffect(() => {
    if (!selectedId) return
    setCreditData(null)
    void fetchCreditScore(selectedId).then(data => {
      if (data) {
        setCreditData(data)
        setAmount(Math.min(data.maxLoanAmount, 50000))
      }
    })
  }, [selectedId])

  async function confirm() {
    if (!farmer) return
    setOpen(true)
    setStep(0)
    setLoading(true)
    setMpesaRef(null)
    setRawResponse(null)
    setApiLog([
      { step: '1. Request OAuth token from Daraja', status: 'pending' },
      { step: '2. POST /mpesa/b2c/v1/paymentrequest', status: 'pending' },
      { step: '3. Receive webhook callback (ResultURL)', status: 'pending' },
      { step: '4. Record in DB + create repayment schedule', status: 'pending' },
    ])

    const phone = `254${farmer.phone.replace(/\D/g, '').slice(-9)}`
    const result = await postDisburse({
      phone,
      amount,
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
    setRawResponse(result.payload as Record<string, unknown>)

    // Animate through steps using real timings from backend
    const steps = result.steps
    let acc = 0
    steps.forEach((s, idx) => {
      acc += s.ms
      window.setTimeout(() => {
        setStep(idx + 1)
        setApiLog(prev => prev.map((item, i) =>
          i === idx ? { ...item, status: 'done', detail: s.label, ms: s.ms } : item
        ))
      }, acc)
    })

    // After all steps complete, mark as done
    window.setTimeout(() => {
      setApiLog(prev => prev.map(item => ({ ...item, status: item.status === 'pending' ? 'done' : item.status })))
    }, acc + 200)
  }

  function completeDisbursement() {
    if (!farmer) return
    queueStaffB2CForFarmer({
      amount,
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

  const phone254 = farmer ? `254${farmer.phone.replace(/\D/g, '').slice(-9)}` : ''

  return (
    <div>
      <h2 style={{ color: 'var(--gold)' }}>Disbursement</h2>

      {/* ── Farmer Selector ── */}
      <div className="card-surface" style={{ padding: 16, marginTop: 12 }}>
        <label>{t('Select farmer', 'Chagua mkulima')}</label>
        <select
          className="input"
          value={selectedId ?? ''}
          onChange={e => setSelectedId(e.target.value)}
          style={{ marginBottom: 12 }}
        >
          {farmers.map(f => (
            <option key={f.id} value={f.id}>{f.name} — {f.memberNo} — Score {f.creditScore}</option>
          ))}
        </select>
        <label>{t('Disbursement amount (KSh)', 'Kiasi cha kutolewa (KSh)')}</label>
        <input
          type="number"
          className="input"
          value={amount}
          min={1000}
          max={creditData?.maxLoanAmount ?? 50000}
          step={1000}
          onChange={e => setAmount(Number(e.target.value))}
        />
        {creditData && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            Max allowed for Grade {creditData.grade}: KSh {creditData.maxLoanAmount.toLocaleString()}
          </div>
        )}
      </div>

      {/* ── Loan Offer Card ── */}
      {farmer && (
        <div
          className="page-enter"
          style={{
            marginTop: 16, borderRadius: 22, padding: 22,
            background: 'linear-gradient(135deg, var(--fresh) 0%, var(--forest) 100%)',
            color: '#fff',
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {t('Loan offer', 'Ofa ya mkopo')} — {farmer.name}
          </div>
          <div className="mono" style={{ fontSize: 42, fontWeight: 900, marginTop: 8 }}>
            KSh {amount.toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 13, opacity: 0.95 }}>
            <span>8% flat</span>
            <span>3 repayments</span>
            <span>{t('Score', 'Alama')} {creditData?.score ?? farmer.creditScore} ({creditData?.grade ?? farmer.creditTier})</span>
            <span>{phone254}</span>
          </div>

          {/* Real credit factors */}
          {creditData && (
            <div style={{ marginTop: 14, display: 'grid', gap: 6, fontSize: 12 }}>
              {Object.entries(creditData.factors).map(([key, f]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.85 }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="mono">{f.score}/{f.max}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 999, overflow: 'hidden', marginTop: 3 }}>
                      <div style={{ width: `${(f.score / f.max) * 100}%`, height: '100%', borderRadius: 999, background: 'rgba(255,255,255,0.7)', transition: 'width 0.5s ease' }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-gold" type="button" disabled={loading || !farmer} onClick={() => void confirm()}>
              <MpesaBadge /> {loading ? t('Connecting to Daraja…', 'Inaungana na Daraja…') : t('Send via M-Pesa B2C', 'Tuma M-Pesa B2C')}
            </button>
            <button
              className="btn btn-ghost" type="button"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
              onClick={() => termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              {t('Review terms', 'Soma masharti')}
            </button>
          </div>
        </div>
      )}

      <div ref={termsRef} className="card-surface" style={{ padding: 16, marginTop: 16 }}>
        <strong>{t('Loan terms (summary)', 'Masharti (muhtasari)')}</strong>
        <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--muted)', lineHeight: 1.6 }}>
          <li>{t(`Principal KSh ${amount.toLocaleString()}; flat 8% for this cycle.`, `Msingi KSh ${amount.toLocaleString()}; 8% flat.`)}</li>
          <li>{t('Three equal repayments auto-deducted from next cooperative payments via C2B validation.', 'Malipo matatu yatakatwa kiotomatiki kupitia C2B validation.')}</li>
          <li>{t('After B2C completes, farmer confirms receipt in Portal → Wallet.', 'Baada ya B2C, mkulima anathibitisha kwenye Wallet.')}</li>
          <li>{t('SMS notification sent to farmer on disbursement.', 'SMS inatumwa kwa mkulima.')}</li>
        </ul>
      </div>

      {/* ── Live B2C API Payload ── */}
      {farmer && (
        <div className="card-surface" style={{ padding: 16, marginTop: 16 }}>
          <strong>B2C API payload (live)</strong>
          <pre style={{ marginTop: 12, padding: 14, background: '#0b1220', color: '#baf7cf', borderRadius: 12, overflow: 'auto', fontSize: 12, lineHeight: 1.6 }}>
            {JSON.stringify({
              CommandID: 'BusinessPayment',
              Amount: amount,
              PartyA: '600984',
              PartyB: phone254,
              Remarks: `FlowCredit loan — ${farmer.name}`,
              ResultURL: `${window.location.origin}/api/mpesa/b2c/result`,
              QueueTimeOutURL: `${window.location.origin}/api/mpesa/b2c/timeout`,
              Occasion: 'Loan',
            }, null, 2)}
          </pre>
        </div>
      )}

      {/* ── Disbursement modal with live Daraja interaction ── */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 160, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div className="card-surface" style={{ width: 'min(620px,100%)', padding: 20, maxHeight: '90vh', overflow: 'auto' }}>
            <strong style={{ fontSize: 18 }}>{t('Daraja B2C — Live API Interaction', 'Daraja B2C — Mwingiliano wa API')}</strong>

            <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: 'var(--forest)', color: '#fff' }}>
              <div className="mono" style={{ fontSize: 30, fontWeight: 900 }}>KSh {amount.toLocaleString()}</div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>{t('via M-Pesa Business Payment', 'kupitia M-Pesa Business')}</div>
              <div className="mono" style={{ marginTop: 8 }}>{phone254} · {farmer?.name}</div>
              {mpesaRef && (
                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.75 }}>
                  ConversationID: {mpesaRef} {isSimulated && '(sandbox simulation)'}
                </div>
              )}
            </div>

            {/* ── API Step-by-step log ── */}
            <div style={{ marginTop: 16 }}>
              <strong style={{ fontSize: 13 }}>{t('API Call Sequence', 'Hatua za API')}</strong>
              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                {apiLog.map((entry, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 10, fontSize: 13, fontFamily: 'var(--font-mono)',
                    background: entry.status === 'done' ? 'rgba(82,183,136,0.08)' : entry.status === 'error' ? 'rgba(185,28,28,0.08)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${entry.status === 'done' ? 'rgba(82,183,136,0.2)' : 'rgba(0,0,0,0.06)'}`,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {entry.status === 'done' ? '✅' : entry.status === 'error' ? '❌' : step === i ? '⏳' : '⬜'}
                    </span>
                    <span style={{ flex: 1, fontWeight: entry.status === 'done' ? 700 : 400 }}>{entry.step}</span>
                    {entry.ms && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{entry.ms}ms</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Raw Daraja response ── */}
            {rawResponse && (
              <div style={{ marginTop: 14 }}>
                <strong style={{ fontSize: 13 }}>Daraja API Response (raw JSON)</strong>
                <pre style={{ marginTop: 8, padding: 12, background: '#0b1220', color: '#baf7cf', borderRadius: 12, overflow: 'auto', fontSize: 11, lineHeight: 1.5, maxHeight: 200 }}>
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </div>
            )}

            {/* ── SMS notification preview ── */}
            {step >= 4 && farmer && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(0,165,80,0.08)', border: '1px solid rgba(0,165,80,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#00a550' }}>
                  📱 SMS sent to {farmer.phone}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>
                  "FlowCredit: KSh {amount.toLocaleString()} loan disbursed to your M-Pesa. Repayments will be auto-deducted from your next cooperative payments. Ref: {mpesaRef}"
                </div>
              </div>
            )}

            <button
              className="btn btn-gold" type="button"
              disabled={step < 4}
              style={{ width: '100%', marginTop: 14, justifyContent: 'center', opacity: step < 4 ? 0.65 : 1 }}
              onClick={completeDisbursement}
            >
              {step < 4 ? t('Processing Daraja call…', 'Inachakata Daraja…') : t('Done — notify farmer in Wallet', 'Maliza — arifu mkulima Wallet')}
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
