import { useState } from 'react'
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { MpesaBadge } from '../components/MpesaBadge'

const PENDING = [
  { id: 'Q1', farmer: 'James Mutua', date: '2025-03-28', kg: 33, grade: 'B' },
  { id: 'Q2', farmer: 'Peter Mwangi', date: '2025-03-27', kg: 19, grade: 'C' },
]

const COLORS = ['var(--fresh)', '#f59e0b', '#ef4444']

export function QualityPage() {
  const [open, setOpen] = useState<string | null>(null)
  const [sms, setSms] = useState('')

  const donut = [
    { name: 'A', value: 52 },
    { name: 'B', value: 31 },
    { name: 'C', value: 17 },
  ]

  return (
    <div>
      <h2>Quality assessment</h2>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>Extension officer desk · SMS preview before notify</p>

      <div className="card-surface" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
              <th style={{ padding: 12 }}>Farmer</th>
              <th>Delivery date</th>
              <th>Kg</th>
              <th>Current grade</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {PENDING.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: 12, fontWeight: 800 }}>{r.farmer}</td>
                <td>{r.date}</td>
                <td className="mono">{r.kg}</td>
                <td>{r.grade}</td>
                <td style={{ padding: 12 }}>
                  <button className="btn btn-primary" type="button" onClick={() => setOpen(r.id)}>
                    Assess
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginTop: 16 }}>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Grade distribution (month)</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={60} outerRadius={80}>
                  {donut.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Top farmers by quality consistency</div>
          <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
            <li>Grace Njeri — 94%</li>
            <li>Wanjiku Kamau — 91%</li>
            <li>Achieng Otieno — 88%</li>
            <li>Samuel Kipchoge — 84%</li>
            <li>James Mutua — 76%</li>
          </ol>
        </div>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 130, display: 'flex', justifyContent: 'flex-end' }} onMouseDown={() => setOpen(null)}>
          <div className="card-surface" style={{ width: 'min(480px,100%)', height: '100%', borderRadius: 0, padding: 18, overflow: 'auto' }} onMouseDown={(e) => e.stopPropagation()}>
            <strong style={{ fontFamily: 'var(--font-display)' }}>Assessment</strong>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {(['A', 'B', 'C'] as const).map((g) => (
                <button key={g} className="btn" type="button" onClick={() => setSms(`ChaiConnect: Graded ${g}. ${PENDING.find((p) => p.id === open)?.farmer}, keep plucking in cool hours for best leaf.`)}>
                  Grade {g}
                </button>
              ))}
            </div>
            <label style={{ display: 'block', marginTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Notes</span>
              <textarea className="input" style={{ marginTop: 6, minHeight: 90 }} />
            </label>
            <div className="card-surface" style={{ marginTop: 12, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>SMS preview</div>
              <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{sms || 'Select a grade to generate SMS preview.'}</div>
            </div>
            <button className="btn btn-primary" type="button" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={() => setOpen(null)}>
              <MpesaBadge /> Submit assessment + notify farmer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
