import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MpesaBadge } from '../components/MpesaBadge'
import { Money } from '../components/Money'
import { PaymentStatusPill } from '../components/PaymentStatusPill'
import { fetchFarmer, fetchFarmerDeliveries, fetchMpesaFeed, fetchCreditScore } from '../lib/api'
import { FARMERS, MPESA_FEED } from '../data/seed'

const TABS = ['Deliveries', 'Payment ledger', 'Credit profile', 'M-Pesa activity'] as const

export function FarmerProfilePage() {
  const { id } = useParams()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Deliveries')
  const [farmer, setFarmer] = useState<(typeof FARMERS)[0] | null>(null)
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [mpesaFeed, setMpesaFeed] = useState<typeof MPESA_FEED>([])
  const [creditData, setCreditData] = useState<{
    score: number; grade: string; maxLoanAmount: number;
    factors: Record<string, { score: number; max: number; detail: string }>;
  } | null>(null)
  const [loadingCredit, setLoadingCredit] = useState(false)

  useEffect(() => {
    void (async () => {
      if (!id) return
      const [f, d, m] = await Promise.all([
        fetchFarmer(id),
        fetchFarmerDeliveries(id),
        fetchMpesaFeed(),
      ])
      setFarmer(f as typeof FARMERS[0])
      setDeliveries(d)
      setMpesaFeed(m as typeof MPESA_FEED)
    })()
  }, [id])

  // Fetch credit score when tab switches to Credit profile
  useEffect(() => {
    if (tab === 'Credit profile' && id && !creditData) {
      setLoadingCredit(true)
      void fetchCreditScore(id).then(data => {
        setCreditData(data)
        setLoadingCredit(false)
      })
    }
  }, [tab, id])

  if (!farmer) {
    return (
      <div>
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 220, marginTop: 12 }} />
      </div>
    )
  }

  const monthly = [1,2,3,4,5,6].map(m => ({ m: `M${m}`, kg: 800 + ((farmer.creditScore + m * 37) % 500) }))
  const score = creditData?.score ?? farmer.creditScore
  const tier = creditData?.grade ?? farmer.creditTier

  return (
    <div>
      <div style={{ borderRadius: 18, padding: 22, background: 'var(--forest)', color: '#fff', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 999, background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 26 }}>
            {farmer.name.split(' ').map((x: string) => x[0]).join('')}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26 }}>{farmer.name}</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>{farmer.memberNo} · {farmer.factory} · {farmer.zone}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Chip>{Math.round(farmer.totalKg).toLocaleString()} kg total</Chip>
              <Chip><Money amount={farmer.totalEarned} /> earned</Chip>
              <Chip>Active since {farmer.activeSince}</Chip>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Donut score={score} tier={tier} />
          <div style={{ marginTop: 10 }}>
            <Link className="btn btn-gold" to="/flowcredit/disburse"><MpesaBadge /> Disburse</Link>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} type="button" className="btn"
            style={{ borderRadius: 999, background: tab === t ? 'rgba(82,183,136,0.18)' : '#fff', borderColor: tab === t ? 'var(--fresh)' : 'rgba(0,0,0,0.08)' }}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Deliveries' && (
        <div className="card-surface page-enter" style={{ padding: 16, marginTop: 16 }}>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}><XAxis dataKey="m"/><YAxis/><Tooltip/><Bar dataKey="kg" fill="var(--leaf)" radius={[6,6,0,0]}/></BarChart>
            </ResponsiveContainer>
          </div>
          <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 12 }}>
              <th style={{ padding: 10 }}>Date</th><th>Kg</th><th>Grade</th><th>Rate</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th>
            </tr></thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No deliveries found</td></tr>
              ) : deliveries.slice(0,10).map(r => (
                <tr key={r.id}>
                  <td style={{ padding: 10 }}>{r.date}</td>
                  <td className="mono">{Number(r.kg).toFixed(0)}</td>
                  <td>{r.grade}</td>
                  <td className="mono">{r.rate}</td>
                  <td className="mono"><Money amount={Number(r.gross)}/></td>
                  <td className="mono" title="SACCO · loan · levy"><Money amount={Number(r.deductions)}/></td>
                  <td className="mono"><Money amount={Number(r.net)}/></td>
                  <td><PaymentStatusPill status={r.status as any} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Payment ledger' && (
        <div className="card-surface page-enter" style={{ padding: 16, marginTop: 16 }}>
          <Timeline farmerId={id!} />
        </div>
      )}

      {tab === 'Credit profile' && (
        <div className="card-surface page-enter" style={{ padding: 16, marginTop: 16 }}>
          <Speedometer value={score} />
          {loadingCredit ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Calculating score from 5 real factors…</div>
          ) : creditData ? (
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              {Object.entries(creditData.factors).map(([key, factor]) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                    <span className="mono">{factor.score}/{factor.max}</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ width: `${(factor.score / factor.max) * 100}%`, height: '100%', background: 'var(--fresh)', borderRadius: 999, transition: 'width 0.6s ease' }}/>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{factor.detail}</div>
                </div>
              ))}
              <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="chip" style={{ background: 'rgba(212,160,23,0.18)', color: '#6a4b00' }}>
                  Max loan: KSh {creditData.maxLoanAmount.toLocaleString()} · Grade {creditData.grade}
                </div>
                <Link className="btn btn-gold" to="/flowcredit">Apply for loan</Link>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--muted)', marginTop: 16 }}>Unable to load credit data</div>
          )}
        </div>
      )}

      {tab === 'M-Pesa activity' && (
        <div className="card-surface page-enter" style={{ padding: 0, marginTop: 16, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['All', 'Inflow', 'Outflow', 'Repayment', 'Disbursement'].map(x => (
              <button key={x} className="btn btn-ghost" type="button" style={{ padding: '6px 10px' }}>{x}</button>
            ))}
          </div>
          <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
              <th style={{ padding: 10 }}>ID</th><th>Type</th><th>Amount</th><th>Time</th><th>Status</th>
            </tr></thead>
            <tbody>
              {mpesaFeed.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No M-Pesa activity</td></tr>
              ) : mpesaFeed.map(t => (
                <tr key={t.id}>
                  <td style={{ padding: 10 }} className="mono">{t.id}</td>
                  <td>{t.type}</td>
                  <td className="mono"><Money amount={t.amount} gold={t.direction === 'out'}/></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{t.ts}</td>
                  <td><PaymentStatusPill status={t.pending ? 'Pending' : t.code === '0' ? 'Paid' : 'Failed'}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', fontSize: 12, fontWeight: 700 }}>{children}</span>
}

function Donut({ score, tier }: { score: number; tier: string }) {
  return (
    <div style={{ width: 110, marginLeft: 'auto' }}>
      <svg viewBox="0 0 36 36" style={{ width: 110, height: 110 }}>
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3"/>
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={tier === 'A' ? 'var(--fresh)' : tier === 'B' ? '#f59e0b' : '#fca5a5'} strokeWidth="3" strokeDasharray={`${score}, 100`} strokeLinecap="round"/>
        <text x="18" y="20.35" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="900">{score}</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.85 }}>Grade {tier}</div>
    </div>
  )
}

function Timeline({ farmerId: _farmerId }: { farmerId: string }) {
  const items = [
    { dt: '2025-03-28 14:22', status: 'Paid' as const, amt: 18500, id: 'SLQCOOP01' },
    { dt: '2025-03-10 09:05', status: 'Pending' as const, amt: 3200, id: 'PEND-303' },
    { dt: '2025-02-26 18:51', status: 'Failed' as const, amt: 9800, id: 'ERR-991' },
  ]
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map(it => (
        <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '160px 10px 1fr', gap: 12, alignItems: 'start' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{it.dt}</div>
          <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: it.status === 'Paid' ? 'var(--fresh)' : it.status === 'Pending' ? '#f59e0b' : '#ef4444' }}/>
          <div className="card-surface" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div><div className="mono" style={{ fontWeight: 800 }}><Money amount={it.amt}/></div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>M-Pesa {it.id}</div></div>
              <PaymentStatusPill status={it.status}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Speedometer({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width="220" height="120" viewBox="0 0 220 120">
        <path d="M20 100 A90 90 0 0 1 200 100" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="14" strokeLinecap="round"/>
        <path d="M20 100 A90 90 0 0 1 200 100" fill="none" stroke="url(#g)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(value / 100) * 283} 283`}/>
        <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0%" stopColor="#b91c1c"/><stop offset="50%" stopColor="#f59e0b"/><stop offset="100%" stopColor="var(--fresh)"/></linearGradient></defs>
        <text x="110" y="88" textAnchor="middle" fontWeight="900" fontSize="18" fill="var(--text)">{value}</text>
      </svg>
      <div style={{ color: 'var(--muted)', maxWidth: 420 }}>
        Score calculated from 5 real factors: delivery consistency, buyer relationship, payment volume, repayment history & transaction frequency. Verified through Daraja Transaction Status API.
      </div>
    </div>
  )
}
