import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MpesaBadge } from '../components/MpesaBadge'
import { fetchFarmers, registerFarmer } from '../lib/api'
import { FARMERS } from '../data/seed'
import { useApp } from '../context/AppProvider'

export function FarmersPage() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [farmers, setFarmers] = useState(FARMERS)
  const [form, setForm] = useState({ name: '', phone: '', nationalId: '', factory: '', zone: '', crop: '' })
  const { pushToast } = useApp()

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const data = await fetchFarmers()
      setFarmers(data as typeof FARMERS)
      setLoading(false)
    })()
  }, [])

  const list = useMemo(
    () => farmers.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()) || f.memberNo?.toLowerCase().includes(q.toLowerCase()) || f.phone?.includes(q)),
    [q, farmers],
  )

  async function handleSubmit() {
    if (step < 3) { setStep(s => s + 1); return }
    const result = await registerFarmer({
      name: form.name, phone: form.phone, nationalId: form.nationalId,
      factory: form.factory || 'Kiambu Tea Factory', zone: form.zone || 'North Ridge',
    })
    if (result?.farmer) {
      setFarmers(prev => [result.farmer as typeof FARMERS[0], ...prev])
      pushToast(`✅ Farmer "${form.name}" registered successfully`)
    } else {
      pushToast('❌ Registration failed — check backend')
    }
    setOpen(false); setStep(0)
    setForm({ name: '', phone: '', nationalId: '', factory: '', zone: '', crop: '' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Farmer registry</h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            {loading ? 'Loading from database…' : `${farmers.length} farmers · Credit tiers · M-Pesa readiness`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>Register new farmer</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search name, member no, phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ width: 180 }}>
          <option>All factories</option>
          {[...new Set(farmers.map(f => f.factory))].map(x => <option key={x}>{x}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={async () => { setLoading(true); setFarmers(await fetchFarmers() as typeof FARMERS); setLoading(false) }}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginTop: 18 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card-surface" style={{ padding: 16, height: 220 }}>
              <div style={{ height: 48, width: 48, borderRadius: 999, background: 'rgba(0,0,0,0.06)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: 14, width: '70%', background: 'rgba(0,0,0,0.06)', borderRadius: 8, marginTop: 12, animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: 10, width: '50%', background: 'rgba(0,0,0,0.04)', borderRadius: 8, marginTop: 8, animation: 'pulse 1.5s infinite' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginTop: 18 }}>
          {list.map((f) => (
            <div key={f.id} className="card-surface" style={{ padding: 16, transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 999, background: f.creditTier === 'A' ? 'rgba(82,183,136,0.25)' : f.creditTier === 'B' ? 'rgba(217,119,6,0.18)' : 'rgba(185,28,28,0.18)', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
                  {f.name.split(' ').map((x: string) => x[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontFamily: 'var(--font-display)' }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.memberNo} · {f.phone}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>{f.cooperative} · {f.zone}</div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                  <span>Credit score</span><span className="mono">{f.creditScore}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ width: `${f.creditScore}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #b91c1c, #f59e0b, var(--fresh))' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <span className="chip" style={{ background: 'rgba(82,183,136,0.18)' }}>Grade {f.gradeTrend} deliveries</span>
                <span className="chip" style={{ background: 'rgba(212,160,23,0.18)', color: '#6a4b00' }}>{String(f.loanFlow).replace('_', ' ')}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Link className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} to={`/app/farmers/${f.id}`}>View profile</Link>
                {f.loanFlow === 'eligible' && (
                  <button className="btn btn-gold" type="button" style={{ flex: 1, justifyContent: 'center' }}><MpesaBadge /> Disburse</button>
                )}
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              No farmers found matching "{q}"
            </div>
          )}
        </div>
      )}

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 120, display: 'flex', justifyContent: 'flex-end' }} onMouseDown={() => setOpen(false)}>
          <div className="card-surface" style={{ width: 'min(520px, 100%)', height: '100%', borderRadius: 0, padding: 22, overflow: 'auto' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Register farmer</strong>
              <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ flex: 1, height: 8, borderRadius: 999, background: i <= step ? 'var(--fresh)' : 'rgba(0,0,0,0.08)' }} />
              ))}
            </div>
            {step === 0 && (
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                <Field label="Full name" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} />
                <Field label="National ID" value={form.nationalId} onChange={v => setForm(f => ({...f, nationalId: v}))} />
                <Field label="Phone (M-Pesa)" value={form.phone} onChange={v => setForm(f => ({...f, phone: v}))} />
              </div>
            )}
            {step === 1 && (
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                <Field label="Factory" value={form.factory} onChange={v => setForm(f => ({...f, factory: v}))} />
                <Field label="Zone" value={form.zone} onChange={v => setForm(f => ({...f, zone: v}))} />
                <Field label="Crop" value={form.crop} onChange={v => setForm(f => ({...f, crop: v}))} />
              </div>
            )}
            {step === 2 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ color: 'var(--muted)' }}>OTP sent (simulated) to farmer phone. Enter 4829 to verify.</p>
                <Field label="OTP" value="" onChange={() => {}} />
              </div>
            )}
            {step === 3 && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 600 }}>
                  <input type="checkbox" style={{ marginTop: 4 }} />
                  <span>I consent to cooperative data use and M-Pesa transaction scoring for FlowCredit — English / Ninakubali matumizi ya data na uchambuzi wa M-Pesa — Kiswahili.</span>
                </label>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="btn btn-ghost" type="button" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>Back</button>
              <button className="btn btn-primary" type="button" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSubmit}>
                {step < 3 ? 'Next' : 'Submit registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', fontFamily: 'var(--font-display)' }}>{label}</span>
      <input className="input" style={{ marginTop: 6 }} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}
