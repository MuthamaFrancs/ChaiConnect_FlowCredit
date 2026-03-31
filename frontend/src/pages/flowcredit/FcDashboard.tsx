import { useEffect, useState } from 'react'
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { CountUpNumber } from '../../components/CountUp'
import { Money } from '../../components/Money'
import { fetchLoans, fetchFarmers, fetchRecentPayments, fetchMpesaFeed } from '../../lib/api'

export function FlowCreditDashboardPage() {
  const [stats, setStats] = useState({ totalDisbursed: 0, activeLoans: 0, repaymentRate: 0, eligible: 0 })
  const [repayments, setRepayments] = useState<{ name: string; due: string; amt: number; status: string }[]>([])
  const [chartData, setChartData] = useState<{ d: string; disb: number; rep: number }[]>([])
  const [alerts, setAlerts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [loans, farmers, payments, mpesa] = await Promise.all([
        fetchLoans(), fetchFarmers(), fetchRecentPayments(), fetchMpesaFeed(),
      ])

      // Stats from real DB data
      const active = (loans as any[]).filter(l => l.status === 'Active')
      const completed = (loans as any[]).filter(l => l.status === 'Completed')
      const overdue = (loans as any[]).filter(l => l.status === 'Overdue')
      const totalDisbursed = (loans as any[]).reduce((s: number, l: any) => s + Number(l.amount || 0), 0)
      const repRate = (loans as any[]).length > 0
        ? Math.round((completed.length / (loans as any[]).length) * 100)
        : 0
      const eligible = (farmers as any[]).filter((f: any) => f.creditScore >= 50 && !active.find((l: any) => l.farmerId === f.id)).length

      setStats({ totalDisbursed, activeLoans: active.length, repaymentRate: repRate, eligible })

      // Repayment timeline from real loans
      const repItems = [...active, ...overdue].map((l: any) => ({
        name: l.farmerName || l.farmerId,
        due: l.nextDue || '—',
        amt: Math.round(Number(l.amount || 0) / Number(l.instalments || 3)),
        status: l.status,
      }))
      setRepayments(repItems)

      // Alerts from real overdue loans
      const alertList = overdue.map((l: any) => `Overdue repayment — ${l.farmerName || l.farmerId} (KSh ${Number(l.amount).toLocaleString()})`)
      setAlerts(alertList)

      // Chart data from real payments/mpesa
      const days: { d: string; disb: number; rep: number }[] = []
      for (let i = 1; i <= 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (14 - i))
        const dateStr = d.toISOString().slice(0, 10)
        const dayDisb = (payments as any[]).filter((p: any) => (p.time || '').startsWith(dateStr)).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
        const dayRep = (mpesa as any[]).filter((t: any) => t.type === 'C2B' && (t.ts || '').startsWith(dateStr)).reduce((s: number, t: any) => s + Number(t.amount || 0), 0)
        days.push({ d: `${d.getMonth() + 1}/${d.getDate()}`, disb: dayDisb / 1000, rep: dayRep / 1000 })
      }
      setChartData(days)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div>
        <h2 style={{ color: 'var(--gold)' }}>FlowCredit dashboard</h2>
        <div className="skeleton" style={{ height: 100, marginTop: 16 }} />
        <div className="skeleton" style={{ height: 300, marginTop: 12 }} />
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ color: 'var(--gold)' }}>FlowCredit dashboard</h2>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>Live data from Neon DB + Daraja API</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginTop: 16 }}>
        <div className="card-surface" style={{ padding: 14, borderTop: '4px solid var(--gold)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Total loans disbursed</div>
          <div className="money" style={{ fontWeight: 900, fontSize: 26, color: 'var(--gold)', marginTop: 6 }}>
            <CountUpNumber value={stats.totalDisbursed} formatter={(n) => `KSh ${Math.round(n).toLocaleString()}`} />
          </div>
        </div>
        <div className="card-surface" style={{ padding: 14, borderTop: '4px solid var(--gold)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Active loans</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, marginTop: 6 }}>
            <CountUpNumber value={stats.activeLoans} />
          </div>
        </div>
        <div className="card-surface" style={{ padding: 14, borderTop: '4px solid var(--gold)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Repayment rate</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, marginTop: 6 }}>
            <CountUpNumber value={stats.repaymentRate} formatter={(n) => `${Math.round(n)}%`} />
          </div>
        </div>
        <div className="card-surface" style={{ padding: 14, borderTop: '4px solid var(--gold)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Farmers eligible (first loan)</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, marginTop: 6 }}>
            <CountUpNumber value={stats.eligible} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginTop: 16 }}>
        <div className="card-surface" style={{ padding: 16 }}>
          <strong>Loan activity (14 days · KSh thousands)</strong>
          <div style={{ height: 260, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="d" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="disb" name="Disbursements (k)" fill="var(--gold)" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="rep" name="Repayments (k)" stroke="var(--fresh)" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface" style={{ padding: 16 }}>
          <strong>Repayment timeline</strong>
          <div style={{ marginTop: 12, maxHeight: 320, overflow: 'auto', display: 'grid', gap: 10 }}>
            {repayments.length === 0 ? (
              <div style={{ padding: 12, color: 'var(--muted)', fontSize: 13 }}>No active loans with upcoming repayments</div>
            ) : repayments.map(r => (
              <div key={r.name} className="card-surface" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: r.status === 'Overdue' ? '#ef4444' : 'var(--gold)' }} />
                  <div>
                    <div style={{ fontWeight: 800 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Due {r.due} · {r.status}</div>
                  </div>
                </div>
                <Money amount={r.amt} gold />
              </div>
            ))}
          </div>
          {alerts.length > 0 && alerts.map((a, i) => (
            <div key={i} className="card-surface" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(185,28,28,0.4)' }}>
              <strong style={{ color: '#991b1b' }}>⚠️ Alert</strong>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
