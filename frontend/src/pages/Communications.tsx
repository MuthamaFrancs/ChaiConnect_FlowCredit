import { useEffect, useState } from 'react'
import { fetchComplaints } from '../lib/api'
import type { Complaint } from '../types'

type Row = Complaint

export function CommunicationsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const data = await fetchComplaints()
      setRows(data as Row[])
      setLoading(false)
    })()
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Communications & Complaints</h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            {loading ? 'Loading…' : `${rows.length} issues · SMS + voice pipeline`}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={async () => { setLoading(true); setRows(await fetchComplaints() as Row[]); setLoading(false) }}>↻ Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 16 }}>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Open</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6, color: '#dc2626' }}>
            {rows.filter(r => r.status === 'Open').length}
          </div>
        </div>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Under Review</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6, color: 'var(--gold)' }}>
            {rows.filter(r => r.status === 'Under Review').length}
          </div>
        </div>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Resolved</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6, color: 'var(--fresh)' }}>
            {rows.filter(r => r.status === 'Resolved').length}
          </div>
        </div>
      </div>

      <div className="card-surface" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
            <th style={{ padding: 12 }}>ID</th><th>Farmer</th><th>Issue</th><th>Status</th><th>Date</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No complaints — everything is running smoothly!</td></tr>
            ) : (
              rows.map(c => (
                <tr key={c.id}>
                  <td style={{ padding: 12, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.id}</td>
                  <td style={{ fontWeight: 700 }}>{c.farmer}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{c.issue}</td>
                  <td>
                    <span className="chip" style={{
                      background: c.status === 'Open' ? 'rgba(185,28,28,0.15)' : c.status === 'Resolved' ? 'rgba(82,183,136,0.15)' : 'rgba(217,119,6,0.15)',
                      color: c.status === 'Open' ? '#991b1b' : c.status === 'Resolved' ? '#065f46' : '#92400e',
                    }}>{c.status}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{c.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
