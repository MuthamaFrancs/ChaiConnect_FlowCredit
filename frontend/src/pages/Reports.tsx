import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const weekly = Array.from({ length: 12 }, (_, i) => ({ w: `W${i + 1}`, kg: 120 + i * 9 }))
const grouped = [
  { f: 'Kiambu', a: 52, b: 31, c: 17 },
  { f: 'Meru', a: 48, b: 33, c: 19 },
  { f: 'Kisumu', a: 44, b: 28, c: 28 },
]
const top = [
  { n: 'Grace Njeri', v: 15220 },
  { n: 'Wanjiku Kamau', v: 12840 },
  { n: 'Achieng Otieno', v: 10100 },
  { n: 'Samuel Kipchoge', v: 9640 },
  { n: 'James Mutua', v: 8920 },
]

export function ReportsPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
      <div className="card-surface" style={{ padding: 12 }}>
        <strong>Reports</strong>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {['Finance report', 'Farmer productivity', 'Training sessions', 'Quality summary'].map((r) => (
            <button key={r} className="btn btn-ghost" type="button" style={{ justifyContent: 'flex-start' }}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="card-surface" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <strong>Rendered report</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" type="button">
                Download CSV
              </button>
              <button className="btn btn-primary" type="button">
                Print
              </button>
            </div>
          </div>
          <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
                <th style={{ padding: 10 }}>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 10 }}>Factory throughput (kg)</td>
                <td className="mono">48,230</td>
              </tr>
              <tr>
                <td style={{ padding: 10 }}>Avg grade lift</td>
                <td className="mono">+3.2%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card-surface" style={{ padding: 16, marginTop: 16 }}>
          <strong>Analytics</strong>
          <div style={{ height: 220, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="w" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="kg" stroke="var(--leaf)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 240, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grouped}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="f" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="a" stackId="s" fill="var(--fresh)" />
                <Bar dataKey="b" stackId="s" fill="#f59e0b" />
                <Bar dataKey="c" stackId="s" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 240, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="n" width={120} />
                <Tooltip />
                <Bar dataKey="v" fill="var(--leaf)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
