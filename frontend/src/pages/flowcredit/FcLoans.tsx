import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Money } from '../../components/Money'
import { fetchLoans, fetchFarmers } from '../../lib/api'

type LoanRow = { id: string; farmerId: string; farmerName: string; amount: number; status: string; nextDue: string; repaidFraction: number; interestPct: number; instalments: number }
type FarmerRow = { id: string; name: string; creditScore: number; creditTier: string; memberNo: string }

export function FlowCreditLoansPage() {
  const [loans, setLoans] = useState<LoanRow[]>([])
  const [farmers, setFarmers] = useState<FarmerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [l, f] = await Promise.all([fetchLoans(), fetchFarmers()])
      setLoans(l as LoanRow[])
      setFarmers(f as FarmerRow[])
      setLoading(false)
    })()
  }, [])

  const activeLoans = loans.filter(l => l.status === 'Active' || l.status === 'Overdue')
  const completedLoans = loans.filter(l => l.status === 'Completed')
  const eligibleFarmers = farmers.filter(f =>
    f.creditScore >= 50 && !activeLoans.find(l => l.farmerId === f.id)
  )

  if (loading) {
    return (
      <div>
        <h2 style={{ color: 'var(--gold)' }}>Loan management</h2>
        <div className="skeleton" style={{ height: 400, marginTop: 16 }} />
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ color: 'var(--gold)' }}>Loan management</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginTop: 16 }}>
        <Kan title={`Eligible farmers (${eligibleFarmers.length})`} tone="var(--fresh)">
          {eligibleFarmers.length === 0 ? (
            <LCard><div style={{ color: 'var(--muted)', fontSize: 13 }}>No eligible farmers — all have active loans or low scores</div></LCard>
          ) : eligibleFarmers.map(f => (
            <LCard key={f.id}>
              <div style={{ fontWeight: 900 }}>{f.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Score {f.creditScore} · Grade {f.creditTier}</div>
              <div className="mono" style={{ fontWeight: 800, marginTop: 8 }}>
                Limit KSh {Math.min(50000, f.creditScore * 500).toLocaleString()}
              </div>
              <Link className="btn btn-gold" style={{ width: '100%', marginTop: 10, justifyContent: 'center' }} to="/flowcredit/disburse">
                Offer loan
              </Link>
            </LCard>
          ))}
        </Kan>

        <Kan title={`Active loans (${activeLoans.length})`} tone="var(--gold)">
          {activeLoans.length === 0 ? (
            <LCard><div style={{ color: 'var(--muted)', fontSize: 13 }}>No active loans</div></LCard>
          ) : activeLoans.map(l => (
            <LCard key={l.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 900 }}>{l.farmerName}</div>
                {l.status === 'Overdue' && (
                  <span className="chip" style={{ background: 'rgba(239,68,68,0.15)', color: '#991b1b', fontSize: 10 }}>OVERDUE</span>
                )}
              </div>
              <div className="mono" style={{ marginTop: 6 }}>
                <Money amount={Number(l.amount)} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                {l.interestPct}% · {l.instalments} instalments · Next {l.nextDue || '—'}
              </div>
              <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 999, marginTop: 8 }}>
                <div style={{
                  width: `${Math.round(Number(l.repaidFraction || 0) * 100)}%`, height: '100%',
                  background: l.status === 'Overdue' ? '#ef4444' : 'var(--fresh)', borderRadius: 999,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {Math.round(Number(l.repaidFraction || 0) * 100)}% repaid
              </div>
            </LCard>
          ))}
        </Kan>

        <Kan title={`Completed (${completedLoans.length})`} tone="#166534">
          {completedLoans.length === 0 ? (
            <LCard><div style={{ color: 'var(--muted)', fontSize: 13 }}>No completed loans yet</div></LCard>
          ) : completedLoans.map(l => (
            <LCard key={l.id}>
              <div style={{ fontWeight: 900 }}>{l.farmerName}</div>
              <div className="mono" style={{ marginTop: 6 }}><Money amount={Number(l.amount)} /></div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Fully repaid</div>
              <span className="chip chip-paid" style={{ marginTop: 8 }}>Closed ✅</span>
            </LCard>
          ))}
        </Kan>
      </div>
    </div>
  )
}

function Kan({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: tone }} />
        <strong>{title}</strong>
      </div>
      {children}
    </div>
  )
}

function LCard({ children }: { children: React.ReactNode }) {
  return <div className="card-surface" style={{ padding: 12, marginBottom: 10 }}>{children}</div>
}
