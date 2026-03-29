import { useEffect, useState } from 'react'
import { MpesaBadge } from '../components/MpesaBadge'
import { Money } from '../components/Money'
import { PaymentStatusPill } from '../components/PaymentStatusPill'
import { fetchRecentPayments } from '../lib/api'
import { RECENT_PAYMENTS } from '../data/seed'

type Row = (typeof RECENT_PAYMENTS)[0]

export function PaymentsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const data = await fetchRecentPayments()
      setRows(data as Row[])
      setLoading(false)
    })()
  }, [])

  const totalPaid = rows.filter(r => r.status === 'Paid').reduce((a, r) => a + Number(r.net), 0)
  const totalPending = rows.filter(r => r.status === 'Pending').reduce((a, r) => a + Number(r.amount), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Payments</h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            {loading ? 'Loading…' : `${rows.length} records · M-Pesa backed`}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={async () => { setLoading(true); setRows(await fetchRecentPayments() as Row[]); setLoading(false) }}>↻ Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 16 }}>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Total Paid (Net)</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 900, marginTop: 8, color: 'var(--fresh)' }}>
            <Money amount={totalPaid} />
          </div>
        </div>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Pending</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 900, marginTop: 8, color: 'var(--gold)' }}>
            <Money amount={totalPending} />
          </div>
        </div>
        <div className="card-surface" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <MpesaBadge /> <span style={{ fontWeight: 800 }}>M-Pesa Settlement</span>
        </div>
      </div>

      <div className="card-surface" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
            <th style={{ padding: 12 }}>Farmer</th><th>Phone</th><th>Amount</th><th>Deductions</th><th>Net</th><th>Status</th><th>Time</th><th>M-Pesa Ref</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Loading payments…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No payments yet</td></tr>
            ) : (
              rows.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: 12, fontWeight: 700 }}>{p.farmer}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{p.phone}</td>
                  <td className="mono"><Money amount={p.amount} /></td>
                  <td className="mono"><Money amount={p.deductions} /></td>
                  <td className="mono" style={{ fontWeight: 700 }}><Money amount={p.net} /></td>
                  <td><PaymentStatusPill status={p.status} /></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.time}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{p.mpesaRef || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
