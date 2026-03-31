import { useEffect, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { CountUpNumber } from '../components/CountUp'
import { MpesaBadge } from '../components/MpesaBadge'
import { Money } from '../components/Money'
import { PaymentStatusPill } from '../components/PaymentStatusPill'
import {
  fetchChartActivity, fetchRecentPayments, fetchStats,
  fetchFarmers, fetchAlerts, fetchFactoryLeaderboard,
  postDisburseAll, batchApprovePayments,
} from '../lib/api'
import { useApp } from '../context/AppProvider'

export function DashboardPage() {
  const [stats, setStats] = useState({ farmers: 0, kgMonth: 0, disbursedMonth: 0, pendingPayments: 0 })
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof fetchRecentPayments>>>([])
  const [chart, setChart] = useState<{ day: number; kg: number; payments: number }[]>([])
  const [eligibleFarmers, setEligibleFarmers] = useState<any[]>([])
  const [alerts, setAlerts] = useState<{ type: string; message: string }[]>([])
  const [leaderboard, setLeaderboard] = useState<{ name: string; kg: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [disbursing, setDisbursing] = useState(false)
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set())
  const { pushToast } = useApp()

  async function reload() {
    setLoading(true)
    const [s, p, c, f, a, lb] = await Promise.all([
      fetchStats(), fetchRecentPayments(), fetchChartActivity(),
      fetchFarmers(), fetchAlerts(), fetchFactoryLeaderboard(),
    ])
    setStats(s)
    setPayments(p)
    setChart(c)
    setEligibleFarmers((f as any[]).filter((x: any) => x.loanFlow === 'eligible').slice(0, 6))
    setAlerts(a)
    setLeaderboard(lb)
    setLoading(false)
  }

  useEffect(() => { void reload() }, [])

  // ── DISBURSE ALL ──
  async function handleDisburseAll() {
    setDisbursing(true)
    const result = await postDisburseAll()
    setDisbursing(false)
    if (result?.ok) {
      pushToast(`✅ Bulk disbursement complete: ${result.disbursed} farmers paid via M-Pesa B2C`)
      void reload()
    } else {
      pushToast('❌ Bulk disbursement failed — check backend logs')
    }
  }

  // ── BATCH APPROVE/REJECT ──
  async function handleBatchAction(action: 'approve' | 'reject') {
    const ids = [...selectedPayments]
    if (ids.length === 0) { pushToast('Select payments first'); return }
    const result = await batchApprovePayments(ids, action)
    if (result?.ok) {
      pushToast(`✅ ${result.updated} payments ${action === 'approve' ? 'approved' : 'rejected'}`)
      setSelectedPayments(new Set())
      void reload()
    }
  }

  function togglePayment(id: string) {
    setSelectedPayments(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Operations overview</h2>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>
            {loading ? 'Loading live data from Neon DB…' : 'Live cooperative intake, quality and M-Pesa settlements.'}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => void reload()}>↻ Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14, marginTop: 18 }}>
        <StatCard label="Registered farmers" value={stats.farmers} />
        <StatCard label="Kg delivered (month)" value={stats.kgMonth} format={(n) => `${Math.round(n).toLocaleString()} kg`} />
        <StatCard label="Disbursed (month)" value={stats.disbursedMonth} format={(n) => { const m = n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : `${Math.round(n/1000)}k`; return `KSh ${m}` }} gold />
        <div className="card-surface" style={{ padding: 16, border: stats.pendingPayments > 0 ? '2px solid rgba(217,119,6,0.55)' : undefined }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Pending payments</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, marginTop: 6 }}>
            <CountUpNumber value={stats.pendingPayments} formatter={x => String(Math.round(x))} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Awaiting B2C confirmation</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginTop: 18 }}>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)' }}>Delivery & payment activity</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Last 30 days · Live from Neon DB</div>
            </div>
            <MpesaBadge />
          </div>
          <div style={{ height: 260, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs><linearGradient id="kg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--fresh)" stopOpacity={0.55} /><stop offset="100%" stopColor="var(--fresh)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)"/><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/>
                <Area type="monotone" dataKey="kg" stroke="var(--leaf)" fill="url(#kg)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Payment queue</div>
          <button
            className="btn btn-gold"
            disabled={disbursing || eligibleFarmers.length === 0}
            style={{ width: '100%', marginBottom: 10, justifyContent: 'center', opacity: disbursing ? 0.6 : 1 }}
            onClick={() => void handleDisburseAll()}
          >
            <MpesaBadge /> {disbursing ? 'Disbursing…' : `Disburse all (${eligibleFarmers.length} farmers)`}
          </button>
          {eligibleFarmers.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(82,183,136,0.18)', display: 'grid', placeItems: 'center', fontWeight: 900, fontFamily: 'var(--font-display)' }}>
                {f.name.split(' ').map((x:string) => x[0]).join('').slice(0,2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700 }}>{f.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.memberNo}</div></div>
              <Money amount={15000 + f.creditScore * 120} />
              <button className="btn btn-primary" style={{ padding: '8px 10px' }}><MpesaBadge /></button>
            </div>
          ))}
          {eligibleFarmers.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>No eligible farmers pending</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)' }}>Recent payments</div>
            {selectedPayments.size > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => void handleBatchAction('approve')}>
                  ✓ Approve {selectedPayments.size}
                </button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, color: '#dc2626' }} onClick={() => void handleBatchAction('reject')}>
                  ✗ Reject
                </button>
              </div>
            )}
          </div>
          <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
              <th style={{ padding: 12, width: 30 }}></th><th>Farmer</th><th>Phone</th><th>Amount</th><th>Deductions</th><th>Net</th><th>Status</th><th>Time</th>
            </tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ background: selectedPayments.has(p.id) ? 'rgba(82,183,136,0.08)' : undefined }}>
                  <td style={{ padding: '6px 12px' }}>
                    <input type="checkbox" checked={selectedPayments.has(p.id)} onChange={() => togglePayment(p.id)} />
                  </td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{p.farmer}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{p.phone}</td>
                  <td className="mono"><Money amount={p.amount}/></td>
                  <td className="mono"><Money amount={p.deductions}/></td>
                  <td className="mono"><Money amount={p.net}/></td>
                  <td><PaymentStatusPill status={p.status}/></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.time}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No payments yet</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="card-surface" style={{ padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Factory leaderboard</div>
            {leaderboard.map((lb, i) => (
              <div key={lb.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontWeight: 600 }}>{i+1}. {lb.name}</span>
                <span className="mono">{lb.kg >= 1000 ? `${(lb.kg/1000).toFixed(1)}t` : `${lb.kg}kg`}</span>
              </div>
            ))}
          </div>
          <div className="card-surface" style={{ padding: 14, borderColor: alerts.length > 0 ? 'rgba(185,28,28,0.35)' : undefined }}>
            <div style={{ fontWeight: 900, color: '#991b1b', marginBottom: 8 }}>Alerts</div>
            {alerts.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)', fontSize: 13 }}>
                {alerts.map((a,i) => <li key={i}>{a.message}</li>)}
              </ul>
            ) : <div style={{ color: 'var(--muted)', fontSize: 13 }}>No active alerts</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, format, gold }: { label: string; value: number; format?: (n: number) => string; gold?: boolean }) {
  return (
    <div className="card-surface" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{label}</div>
      <div className={gold ? 'money' : ''} style={{ fontFamily: gold ? 'var(--font-mono)' : 'var(--font-display)', fontWeight: 800, fontSize: 28, marginTop: 6, color: gold ? 'var(--gold)' : undefined }}>
        <CountUpNumber value={value} formatter={format ?? ((n) => Math.round(n).toLocaleString())} />
      </div>
    </div>
  )
}
