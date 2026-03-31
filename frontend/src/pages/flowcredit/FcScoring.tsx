import { useEffect, useState } from 'react'
import { fetchFarmers, fetchCreditScore, fetchMpesaFeed, recalculateAllScores } from '../../lib/api'
import { Money } from '../../components/Money'

type FarmerRow = { id: string; name: string; memberNo: string; creditScore: number; creditTier: string; phone: string }
type CreditData = { score: number; grade: string; maxLoanAmount: number; factors: Record<string, { score: number; max: number; detail: string }> }

export function FlowCreditScoringPage() {
  const [farmers, setFarmers] = useState<FarmerRow[]>([])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<FarmerRow | null>(null)
  const [creditData, setCreditData] = useState<CreditData | null>(null)
  const [loadingScore, setLoadingScore] = useState(false)
  const [mpesaFeed, setMpesaFeed] = useState<any[]>([])
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    void (async () => {
      const [f, m] = await Promise.all([fetchFarmers(), fetchMpesaFeed()])
      const farmersData = f as FarmerRow[]
      setFarmers(farmersData)
      setMpesaFeed(m as any[])
      if (farmersData.length > 0) {
        setSel(farmersData[0])
      }
    })()
  }, [])

  // Fetch real credit score when farmer changes
  useEffect(() => {
    if (!sel) return
    setLoadingScore(true)
    setCreditData(null)
    void fetchCreditScore(sel.id).then(data => {
      setCreditData(data)
      setLoadingScore(false)
    })
  }, [sel?.id])

  const filtered = farmers.filter(f => f.name.toLowerCase().includes(q.toLowerCase()))
  const grade = creditData?.grade ?? sel?.creditTier ?? 'B'
  const ring = creditData?.score ?? sel?.creditScore ?? 0

  async function handleRecalculate() {
    setRecalculating(true)
    const result = await recalculateAllScores()
    if (result) {
      // Refresh farmers list
      const f = await fetchFarmers()
      setFarmers(f as FarmerRow[])
      // Re-select current farmer to refresh score
      if (sel) {
        const data = await fetchCreditScore(sel.id)
        setCreditData(data)
      }
    }
    setRecalculating(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: 'var(--gold)', margin: 0 }}>Credit scoring</h2>
        <button className="btn btn-gold" disabled={recalculating} onClick={() => void handleRecalculate()}>
          {recalculating ? '⏳ Recalculating all…' : '🔄 Recalculate all farmers'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 380 }} placeholder="Search farmer…" value={q} onChange={e => setQ(e.target.value)} />
        <div className="card-surface" style={{ padding: 8, maxHeight: 200, overflow: 'auto', minWidth: 260 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 10, color: 'var(--muted)', fontSize: 13 }}>No farmers found</div>
          ) : filtered.map(f => (
            <button key={f.id} className="btn btn-ghost" type="button"
              style={{ width: '100%', justifyContent: 'flex-start', fontWeight: sel?.id === f.id ? 900 : 500, background: sel?.id === f.id ? 'rgba(82,183,136,0.1)' : undefined }}
              onClick={() => setSel(f)}>
              {f.name} · {f.memberNo} · Score {f.creditScore}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 14, marginTop: 16 }}>
        {/* Score Ring */}
        <div className="card-surface page-enter" style={{ padding: 16 }}>
          {loadingScore ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>⏳ Calculating score from 5 factors…</div>
          ) : (
            <>
              <svg viewBox="0 0 36 36" style={{ width: 160, height: 160, margin: '0 auto', display: 'block' }}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="3"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                  stroke={grade === 'A' ? 'var(--fresh)' : grade === 'B' ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3" strokeDasharray={`${ring}, 100`} strokeLinecap="round"/>
                <text x="18" y="20.35" textAnchor="middle" fill="var(--text)" fontSize="9" fontWeight="900">{ring}</text>
              </svg>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <div style={{ fontWeight: 900 }}>
                  Grade {grade} — {grade === 'A' ? 'Low risk' : grade === 'B' ? 'Moderate' : 'Elevated'}
                </div>
                {creditData && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    Max loan: KSh {creditData.maxLoanAmount.toLocaleString()}
                  </div>
                )}
                <button className="btn btn-gold" type="button" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                  onClick={() => { if (sel) window.location.href = `/flowcredit/disburse` }}>
                  Generate loan offer
                </button>
              </div>
            </>
          )}
        </div>

        {/* Factor Breakdown — REAL from API */}
        <div className="card-surface page-enter" style={{ padding: 16 }}>
          <strong>Factor breakdown {sel ? `— ${sel.name}` : ''}</strong>
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            {!creditData ? (
              <div style={{ color: 'var(--muted)' }}>Select a farmer to see breakdown</div>
            ) : Object.entries(creditData.factors).map(([key, factor]) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800 }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div>
                  <div className="mono" style={{ fontSize: 13 }}>{factor.score}/{factor.max}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{factor.detail}</div>
                <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                  <div style={{
                    width: `${(factor.score / factor.max) * 100}%`, height: '100%', borderRadius: 999,
                    background: (factor.score / factor.max) > 0.7 ? 'var(--fresh)' : (factor.score / factor.max) > 0.4 ? 'var(--gold)' : '#ef4444',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* M-Pesa Transaction Basis — REAL from DB */}
      <div className="card-surface" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ padding: 16, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <strong>M-Pesa transaction basis (from Daraja API)</strong>
        </div>
        <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
              <th style={{ padding: 12 }}>Date</th>
              <th>Source</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Credit signal</th>
            </tr>
          </thead>
          <tbody>
            {mpesaFeed.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
                No M-Pesa transactions — disburse a loan to generate entries
              </td></tr>
            ) : mpesaFeed.map((t: any) => (
              <tr key={t.id}>
                <td style={{ padding: 12 }}>{t.ts}</td>
                <td>{t.farmer ?? '—'}</td>
                <td><span className="chip" style={{ fontSize: 10 }}>{t.type}</span></td>
                <td className="mono"><Money amount={Number(t.amount)} /></td>
                <td>
                  <span className="chip" style={{ background: t.direction === 'in' ? 'rgba(82,183,136,0.15)' : 'rgba(239,68,68,0.15)', color: t.direction === 'in' ? '#065f46' : '#991b1b' }}>
                    {t.direction === 'in' ? '+ Inflow signal' : '− Outflow'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 14, background: 'rgba(212,160,23,0.12)', fontSize: 13 }}>
          Score is calculated from real delivery, payment, and loan data stored in Neon DB. M-Pesa history verified via Daraja Transaction Status API.
        </div>
      </div>
    </div>
  )
}
