import { useEffect, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Pie, PieChart, Cell,
} from 'recharts'
import { CountUpNumber } from '../components/CountUp'
import { MpesaBadge } from '../components/MpesaBadge'
import { Money } from '../components/Money'
import { PaymentStatusPill } from '../components/PaymentStatusPill'
import {
  fetchChartActivity, fetchRecentPayments, fetchStats,
  fetchFarmers, fetchAlerts, fetchFactoryLeaderboard,
  postDisburseAll, batchApprovePayments, fetchLoans,
  fetchDeliveries, fetchCreditScore,
} from '../lib/api'
import { useApp } from '../context/AppProvider'
import type { Farmer, Loan, Delivery } from '../types'

export function DashboardPage() {
  const { auth } = useApp()

  if (auth?.role === 'clerk')   return <ClerkDashboard />
  if (auth?.role === 'officer') return <OfficerDashboard />
  return <AdminDashboard />
}

// ═══════════════════════════════════════════════════════════
//  ADMIN DASHBOARD — Platform command centre
// ═══════════════════════════════════════════════════════════
function AdminDashboard() {
  const { pushToast, auth } = useApp()
  const [stats, setStats]           = useState({ farmers: 0, kgMonth: 0, disbursedMonth: 0, pendingPayments: 0 })
  const [payments, setPayments]     = useState<Awaited<ReturnType<typeof fetchRecentPayments>>>([])
  const [chart, setChart]           = useState<{ day: number; kg: number; payments: number }[]>([])
  const [eligibleFarmers, setEligibleFarmers] = useState<Farmer[]>([])
  const [alerts, setAlerts]         = useState<{ type: string; message: string }[]>([])
  const [leaderboard, setLeaderboard] = useState<{ name: string; kg: number }[]>([])
  const [loans, setLoans]           = useState<Loan[]>([])
  const [loading, setLoading]       = useState(true)
  const [disbursing, setDisbursing] = useState(false)
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set())

  async function reload() {
    setLoading(true)
    const [s, p, c, f, a, lb, l] = await Promise.all([
      fetchStats(), fetchRecentPayments(), fetchChartActivity(),
      fetchFarmers(), fetchAlerts(), fetchFactoryLeaderboard(), fetchLoans(),
    ])
    setStats(s); setPayments(p); setChart(c)
    setEligibleFarmers((f as Farmer[]).filter(x => x.loanFlow === 'eligible').slice(0, 6))
    setAlerts(a); setLeaderboard(lb); setLoans(l as Loan[])
    setLoading(false)
  }
  useEffect(() => { void reload() }, [])

  const activeLoans = loans.filter(l => l.status === 'Active').length
  const overdueLoans = loans.filter(l => l.status === 'Overdue').length
  const totalDisbursed = loans.reduce((s, l) => s + Number(l.amount || 0), 0)

  async function handleDisburseAll() {
    setDisbursing(true)
    const result = await postDisburseAll()
    setDisbursing(false)
    if (result?.ok) { pushToast(`✅ Bulk disbursement: ${result.disbursed} farmers paid via M-Pesa B2C`); void reload() }
    else pushToast('❌ Bulk disbursement failed — check backend logs')
  }

  async function handleBatchAction(action: 'approve' | 'reject') {
    const ids = [...selectedPayments]
    if (!ids.length) { pushToast('Select payments first'); return }
    const result = await batchApprovePayments(ids, action)
    if (result?.ok) { pushToast(`✅ ${result.updated} payments ${action === 'approve' ? 'approved' : 'rejected'}`); setSelectedPayments(new Set()); void reload() }
  }

  const loanPieData = [
    { name: 'Active',    value: activeLoans,  color: 'var(--fresh)' },
    { name: 'Overdue',   value: overdueLoans, color: '#ef4444' },
    { name: 'Completed', value: loans.filter(l => l.status === 'Completed').length, color: '#94a3b8' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--forest)', display: 'grid', placeItems: 'center', fontSize: 18 }}>🏛️</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Platform Overview</h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
                Welcome back, <strong>{auth?.name}</strong> · Admin · {loading ? 'Loading…' : 'All systems live'}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => void reload()}>↻ Refresh</button>
          <button className="btn btn-gold" onClick={() => void handleDisburseAll()} disabled={disbursing || eligibleFarmers.length === 0}>
            <MpesaBadge /> {disbursing ? 'Disbursing…' : `Disburse All (${eligibleFarmers.length})`}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard icon="👥" label="Registered Farmers" value={stats.farmers} color="var(--fresh)" loading={loading} />
        <KpiCard icon="🌿" label="Kg Delivered (Month)" value={stats.kgMonth} format={n => `${Math.round(n).toLocaleString()} kg`} color="#3b82f6" loading={loading} />
        <KpiCard icon="💰" label="Total Disbursed" value={totalDisbursed} format={n => `KSh ${n >= 1e6 ? (n/1e6).toFixed(1)+'M' : Math.round(n/1000)+'k'}`} color="var(--gold)" loading={loading} />
        <KpiCard icon="⚡" label="Pending Payments" value={stats.pendingPayments} color={stats.pendingPayments > 0 ? '#f59e0b' : 'var(--fresh)'} loading={loading} />
      </div>

      {/* Loan health strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
        {[
          { label: 'Active Loans',   value: activeLoans,  color: 'var(--fresh)', bg: 'rgba(82,183,136,0.1)' },
          { label: 'Overdue Loans',  value: overdueLoans, color: '#ef4444',      bg: 'rgba(239,68,68,0.08)' },
          { label: 'FlowCredit KSh Disbursed', value: totalDisbursed, fmt: (n: number) => `KSh ${n.toLocaleString()}`, color: 'var(--gold)', bg: 'rgba(212,160,23,0.1)' },
        ].map(c => (
          <div key={c.label} className="card-surface" style={{ padding: '12px 16px', border: `1.5px solid ${c.bg}`, background: c.bg }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: c.color, marginTop: 4 }}>
              {c.fmt ? c.fmt(c.value) : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Loan Pie + Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginTop: 16 }}>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Delivery & Payment Activity</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Last 30 days · Live from DB</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="kgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--fresh)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--fresh)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="kg" stroke="var(--leaf)" fill="url(#kgGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Loan Portfolio</div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={loanPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {loanPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
            {loanPieData.map(d => (
              <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: d.color, display: 'inline-block' }} />
                  {d.name}
                </span>
                <strong>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Factory Leaderboard</div>
          {leaderboard.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>No data yet</div>
            : leaderboard.map((lb, i) => (
              <div key={lb.name} style={{ padding: '7px 0', borderTop: i ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{i + 1}. {lb.name}</span>
                  <span className="mono">{lb.kg >= 1000 ? `${(lb.kg/1000).toFixed(1)}t` : `${lb.kg}kg`}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${leaderboard[0] ? (lb.kg / leaderboard[0].kg) * 100 : 0}%`, height: '100%', background: 'var(--fresh)', borderRadius: 999 }} />
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Payments + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)' }}>Recent Payments</div>
            {selectedPayments.size > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => void handleBatchAction('approve')}>✓ Approve {selectedPayments.size}</button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, color: '#dc2626' }} onClick={() => void handleBatchAction('reject')}>✗ Reject</button>
              </div>
            )}
          </div>
          <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
              <th style={{ padding: 12, width: 30 }} />
              <th>Farmer</th><th>Phone</th><th>Amount</th><th>Net</th><th>Status</th><th>Time</th>
            </tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ background: selectedPayments.has(p.id) ? 'rgba(82,183,136,0.08)' : undefined }}>
                  <td style={{ padding: '6px 12px' }}><input type="checkbox" checked={selectedPayments.has(p.id)} onChange={() => setSelectedPayments(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })} /></td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{p.farmer}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{p.phone}</td>
                  <td className="mono"><Money amount={p.amount} /></td>
                  <td className="mono" style={{ fontWeight: 700 }}><Money amount={p.net} /></td>
                  <td><PaymentStatusPill status={p.status} /></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.time}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No payments yet</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div className="card-surface" style={{ padding: 14, border: alerts.length > 0 ? '1.5px solid rgba(185,28,28,0.35)' : undefined }}>
            <div style={{ fontWeight: 900, color: '#991b1b', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>⚠ System Alerts</span>
              {alerts.length > 0 && <span style={{ fontSize: 11, background: '#dc2626', color: '#fff', borderRadius: 999, padding: '2px 8px' }}>{alerts.length}</span>}
            </div>
            {alerts.length ? alerts.map((a, i) => (
              <div key={i} style={{ fontSize: 13, padding: '6px 0', borderTop: i ? '1px solid rgba(0,0,0,0.06)' : 'none', color: 'var(--muted)' }}>🔴 {a.message}</div>
            )) : <div style={{ color: 'var(--muted)', fontSize: 13 }}>✅ No active alerts</div>}
          </div>

          <div className="card-surface" style={{ padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Quick Actions</div>
            {[
              { label: 'Manage Users', href: '/app/settings', icon: '👤' },
              { label: 'Generate Report', href: '/app/reports', icon: '📊' },
              { label: 'FlowCredit Hub', href: '/flowcredit', icon: '💳' },
            ].map(a => (
              <a key={a.label} href={a.href} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4 }}>
                {a.icon} {a.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  CLERK DASHBOARD — Daily ops workbench
// ═══════════════════════════════════════════════════════════
function ClerkDashboard() {
  const { pushToast, auth } = useApp()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [payments, setPayments]     = useState<Awaited<ReturnType<typeof fetchRecentPayments>>>([])
  const [stats, setStats]           = useState({ farmers: 0, kgMonth: 0, disbursedMonth: 0, pendingPayments: 0 })
  const [loading, setLoading]       = useState(true)

  async function reload() {
    setLoading(true)
    const [d, p, s] = await Promise.all([fetchDeliveries(), fetchRecentPayments(), fetchStats()])
    setDeliveries(d.slice(0, 10))
    setPayments(p.filter(p => p.status === 'Pending'))
    setStats(s)
    setLoading(false)
  }
  useEffect(() => { void reload() }, [])

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayDeliveries = deliveries.filter(d => d.date === todayStr)
  const todayKg = todayDeliveries.reduce((s, d) => s + Number(d.kg || 0), 0)

  const gradeBreakdown = ['A', 'B', 'C'].map(g => ({
    grade: g,
    count: deliveries.filter(d => d.grade === g).length,
    kg: deliveries.filter(d => d.grade === g).reduce((s, d) => s + Number(d.kg || 0), 0),
  }))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.15)', border: '2px solid rgba(59,130,246,0.3)', display: 'grid', placeItems: 'center', fontSize: 20 }}>📋</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Clerk Workbench</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
              Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, <strong>{auth?.name}</strong> · Today's intake & payment queue
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => void reload()}>↻ Refresh</button>
          <a href="/app/farmers" className="btn btn-primary">+ Register Farmer</a>
        </div>
      </div>

      {/* Today stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard icon="🌿" label="Today's Deliveries" value={todayDeliveries.length} color="#3b82f6" loading={loading} />
        <KpiCard icon="⚖️" label="Today's Kg" value={todayKg} format={n => `${Math.round(n).toLocaleString()} kg`} color="var(--fresh)" loading={loading} />
        <KpiCard icon="⏳" label="Pending Payments" value={stats.pendingPayments} color="#f59e0b" loading={loading} />
        <KpiCard icon="👥" label="Total Farmers" value={stats.farmers} color="var(--forest)" loading={loading} />
      </div>

      {/* Grade breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
        {gradeBreakdown.map(g => (
          <div key={g.grade} className="card-surface" style={{ padding: 14, borderLeft: `4px solid ${g.grade === 'A' ? 'var(--fresh)' : g.grade === 'B' ? '#f59e0b' : '#ef4444'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Grade {g.grade}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26 }}>{g.count} batches</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Kg</div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 18 }}>{g.kg.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              Rate: KSh {g.grade === 'A' ? '30' : g.grade === 'B' ? '25' : '18'}/kg
            </div>
          </div>
        ))}
      </div>

      {/* Recent deliveries + pending payments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)' }}>Recent Deliveries</div>
            <a href="/app/deliveries" style={{ fontSize: 12, color: 'var(--fresh)', fontWeight: 700 }}>View all →</a>
          </div>
          <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
              <th style={{ padding: 12 }}>Date</th><th>Farmer ID</th><th>Kg</th><th>Grade</th><th>Gross</th><th>Status</th>
            </tr></thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td style={{ padding: 12, fontSize: 12 }}>{d.date}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{d.farmerId}</td>
                  <td className="mono">{Number(d.kg).toFixed(0)}</td>
                  <td><span className="chip" style={{ background: d.grade === 'A' ? 'rgba(82,183,136,0.18)' : d.grade === 'B' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.12)' }}>Grade {d.grade}</span></td>
                  <td className="mono"><Money amount={Number(d.gross)} /></td>
                  <td><PaymentStatusPill status={d.status as any} /></td>
                </tr>
              ))}
              {deliveries.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No deliveries yet today</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div className="card-surface" style={{ padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>⏳ Pending Payments</span>
              <span style={{ fontSize: 12, background: 'rgba(245,158,11,0.15)', color: '#92400e', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>{payments.length}</span>
            </div>
            {payments.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.farmer}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.time}</div>
                </div>
                <div className="mono" style={{ fontWeight: 700, color: 'var(--gold)' }}><Money amount={p.amount} /></div>
              </div>
            ))}
            {payments.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>All payments settled ✅</div>}
            {payments.length > 0 && <a href="/app/payments" style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--fresh)', fontWeight: 700 }}>View all →</a>}
          </div>

          <div className="card-surface" style={{ padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Quick Entry</div>
            {[
              { label: '📦 Log New Delivery', href: '/app/deliveries' },
              { label: '👤 Register Farmer',  href: '/app/farmers' },
              { label: '📱 Record Complaint', href: '/app/communications' },
            ].map(a => (
              <a key={a.label} href={a.href} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4, fontSize: 13 }}>{a.label}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  OFFICER DASHBOARD — Field intelligence
// ═══════════════════════════════════════════════════════════
function OfficerDashboard() {
  const { auth } = useApp()
  const [farmers, setFarmers]   = useState<Farmer[]>([])
  const [loans, setLoans]       = useState<Loan[]>([])
  const [alerts, setAlerts]     = useState<{ type: string; message: string }[]>([])
  const [loading, setLoading]   = useState(true)

  async function reload() {
    setLoading(true)
    const [f, l, a] = await Promise.all([fetchFarmers(), fetchLoans(), fetchAlerts()])
    setFarmers(f as Farmer[])
    setLoans(l as Loan[])
    setAlerts(a)
    setLoading(false)
  }
  useEffect(() => { void reload() }, [])

  const tierCount = {
    A: farmers.filter(f => f.creditTier === 'A').length,
    B: farmers.filter(f => f.creditTier === 'B').length,
    C: farmers.filter(f => f.creditTier === 'C').length,
  }
  const overdueLoans = loans.filter(l => l.status === 'Overdue')
  const eligibleFarmers = farmers.filter(f => f.loanFlow === 'eligible')
  const riskFarmers = farmers.filter(f => f.creditTier === 'C').slice(0, 5)
  const topFarmers  = farmers.filter(f => f.creditTier === 'A').sort((a, b) => b.creditScore - a.creditScore).slice(0, 5)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.15)', border: '2px solid rgba(139,92,246,0.3)', display: 'grid', placeItems: 'center', fontSize: 20 }}>🌾</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Field Intelligence</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
              <strong>{auth?.name}</strong> · Extension Officer · {loading ? 'Loading…' : `${farmers.length} farmers in portfolio`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => void reload()}>↻ Refresh</button>
          <a href="/flowcredit/scoring" className="btn btn-primary" style={{ background: 'rgba(139,92,246,0.85)' }}>Run Credit Scoring</a>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard icon="📊" label="Portfolio Farmers" value={farmers.length} color="rgba(139,92,246,0.85)" loading={loading} />
        <KpiCard icon="✅" label="Loan Eligible" value={eligibleFarmers.length} color="var(--fresh)" loading={loading} />
        <KpiCard icon="🔴" label="Overdue Loans" value={overdueLoans.length} color="#ef4444" loading={loading} />
        <KpiCard icon="⚠️" label="Active Alerts" value={alerts.length} color="#f59e0b" loading={loading} />
      </div>

      {/* Credit tier breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
        {[
          { tier: 'A', count: tierCount.A, label: 'Top Performers', color: 'var(--fresh)',           bg: 'rgba(82,183,136,0.08)',  desc: 'Eligible for max loan (KSh 50,000+)' },
          { tier: 'B', count: tierCount.B, label: 'Developing',     color: '#f59e0b',                bg: 'rgba(245,158,11,0.08)',  desc: 'Eligible for standard loan (KSh 30,000)' },
          { tier: 'C', count: tierCount.C, label: 'High Risk',      color: '#ef4444',                bg: 'rgba(239,68,68,0.06)',   desc: 'Needs field visit — extension outreach' },
        ].map(t => (
          <div key={t.tier} className="card-surface" style={{ padding: 16, background: t.bg, borderLeft: `4px solid ${t.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Credit Tier {t.tier} · {t.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: t.color }}>{t.count}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.desc}</div>
              </div>
              <div style={{ fontSize: 28 }}>{t.tier === 'A' ? '🏆' : t.tier === 'B' ? '📈' : '⚠️'}</div>
            </div>
            {farmers.length > 0 && (
              <div style={{ marginTop: 10, height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${(t.count / farmers.length) * 100}%`, height: '100%', background: t.color, borderRadius: 999 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Overdue + Top farmers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 16 }}>

        {/* Overdue loans */}
        <div className="card-surface" style={{ padding: 0, overflow: 'hidden', border: overdueLoans.length > 0 ? '1.5px solid rgba(239,68,68,0.3)' : undefined }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', background: overdueLoans.length > 0 ? 'rgba(239,68,68,0.05)' : undefined }}>
            <div style={{ fontWeight: 800, color: '#991b1b' }}>🔴 Overdue Loan Cases</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Requires immediate field follow-up</div>
          </div>
          <div style={{ padding: 12 }}>
            {overdueLoans.length === 0
              ? <div style={{ color: 'var(--muted)', fontSize: 13, padding: 8 }}>No overdue cases ✅</div>
              : overdueLoans.map(l => (
                <div key={l.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{l.farmerName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Due: {l.nextDue || 'Overdue'}</span>
                    <span className="mono" style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}><Money amount={l.amount} /></span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${Number(l.repaidFraction) * 100}%`, height: '100%', background: '#ef4444', borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{Math.round(Number(l.repaidFraction) * 100)}% repaid</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Top performers */}
        <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 800 }}>🏆 Top Performers</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Highest credit tier — Tier A</div>
          </div>
          <div style={{ padding: 12 }}>
            {topFarmers.length === 0
              ? <div style={{ color: 'var(--muted)', fontSize: 13, padding: 8 }}>No data yet</div>
              : topFarmers.map((f, i) => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.zone} · {f.cooperative?.split(' ').slice(0,2).join(' ')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--fresh)', fontSize: 18 }}>{f.creditScore}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>score</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* At-risk + actions */}
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div className="card-surface" style={{ padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>⚠️ At-Risk Farmers (Tier C)</div>
            {riskFarmers.length === 0
              ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>None — great news! ✅</div>
              : riskFarmers.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: 13 }}>
                  <a href={`/app/farmers/${f.id}`} style={{ color: '#ef4444', fontWeight: 700, textDecoration: 'none' }}>{f.name}</a>
                  <span className="mono" style={{ color: 'var(--muted)' }}>{f.creditScore}</span>
                </div>
              ))
            }
          </div>

          <div className="card-surface" style={{ padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Field Actions</div>
            {[
              { label: '📊 Credit Scoring Tool', href: '/flowcredit/scoring' },
              { label: '💳 Review Loan Pipeline', href: '/flowcredit/loans' },
              { label: '👥 Farmer Profiles', href: '/app/farmers' },
              { label: '📋 Field Complaints', href: '/app/communications' },
            ].map(a => (
              <a key={a.label} href={a.href} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4, fontSize: 13 }}>{a.label}</a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Shared Components
// ═══════════════════════════════════════════════════════════
function KpiCard({ icon, label, value, format, color, loading }: {
  icon: string; label: string; value: number
  format?: (n: number) => string; color?: string; loading?: boolean
}) {
  return (
    <div className="card-surface" style={{ padding: 16, borderTop: `3px solid ${color || 'var(--fresh)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, fontFamily: 'var(--font-display)', flex: 1 }}>{label}</div>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, marginTop: 6, color: color || 'var(--text)' }}>
        {loading
          ? <div style={{ height: 28, width: 80, background: 'rgba(0,0,0,0.06)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
          : <CountUpNumber value={value} formatter={format ?? (n => Math.round(n).toLocaleString())} />
        }
      </div>
    </div>
  )
}
