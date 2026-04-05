import { useEffect, useMemo, useState } from 'react'
import { PaymentStatusPill } from '../components/PaymentStatusPill'
import { Money } from '../components/Money'
import { fetchDeliveries } from '../lib/api'
import type { Delivery } from '../types'

type Row = Delivery

export function DeliveriesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'All' | 'Paid' | 'Pending'>('All')

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const data = await fetchDeliveries()
      setRows(data as Row[])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'All') return rows
    return rows.filter(r => r.status === filter)
  }, [filter, rows])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Deliveries</h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            {loading ? 'Loading from database…' : `${rows.length} deliveries · Grade monitoring · Payment tracking`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['All', 'Paid', 'Pending'] as const).map(f => (
            <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)} style={{ padding: '6px 12px', fontSize: 13 }}>{f}</button>
          ))}
          <button className="btn btn-ghost" onClick={async () => { setLoading(true); setRows(await fetchDeliveries() as Row[]); setLoading(false) }}>↻</button>
        </div>
      </div>

      <div className="card-surface" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
            <th style={{ padding: 12 }}>Date</th><th>Farmer</th><th>Kg</th><th>Grade</th><th>Rate</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th>
          </tr></thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => <tr key={i}><td colSpan={9} style={{ padding: 14, textAlign: 'center', color: 'var(--muted)' }}>Loading…</td></tr>)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No deliveries found</td></tr>
            ) : (
              filtered.slice(0, 30).map(d => (
                <tr key={d.id}>
                  <td style={{ padding: 12, fontSize: 13 }}>{d.date}</td>
                  <td style={{ fontWeight: 700 }}>{d.farmerId}</td>
                  <td className="mono">{Number(d.kg).toFixed(0)} kg</td>
                  <td><span className="chip" style={{ background: d.grade === 'A' ? 'rgba(82,183,136,0.2)' : d.grade === 'B' ? 'rgba(217,119,6,0.15)' : 'rgba(185,28,28,0.15)' }}>Grade {d.grade}</span></td>
                  <td className="mono">{d.rate}/kg</td>
                  <td className="mono"><Money amount={Number(d.gross)} /></td>
                  <td className="mono"><Money amount={Number(d.deductions)} /></td>
                  <td className="mono" style={{ fontWeight: 700 }}><Money amount={Number(d.net)} /></td>
                  <td><PaymentStatusPill status={d.status as any} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
