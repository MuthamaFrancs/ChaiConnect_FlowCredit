import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { PortalCard, PortalPageTitle } from './PortalChrome'

const donut = [
  { name: 'SACCO', value: 45 },
  { name: 'Loan', value: 35 },
  { name: 'Levy', value: 20 },
]
const cols = ['var(--fresh)', 'var(--gold)', '#7c3aed']

export function PortalDeductions() {
  const bars = [
    { m: 'Jan', v: 4200 },
    { m: 'Feb', v: 5100 },
    { m: 'Mar', v: 4800 },
  ]

  return (
    <div>
      <PortalPageTitle title="Deductions" subtitle="SACCO · FlowCredit · factory levy (Recharts, green palette)" />
      <PortalCard noPadding style={{ marginBottom: 12 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
          Split (year to date)
        </div>
        <div style={{ padding: 12, height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donut} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={2}>
                {donut.map((_, i) => (
                  <Cell key={i} fill={cols[i % cols.length]} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </PortalCard>
      <PortalCard noPadding>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
          Monthly deductions
        </div>
        <div style={{ padding: 12, height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="m" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="v" fill="var(--leaf)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PortalCard>
      <div
        className="card-surface"
        style={{
          marginTop: 14,
          padding: 16,
          fontWeight: 900,
          fontFamily: 'var(--font-display)',
          borderTop: '4px solid var(--gold)',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span>Total deducted this year</span>
        <span className="mono">KSh 141,000</span>
      </div>
    </div>
  )
}
