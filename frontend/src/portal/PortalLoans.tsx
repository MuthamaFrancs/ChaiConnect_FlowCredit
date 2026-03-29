import { useEffect, useState } from 'react'
import { MpesaBadge } from '../components/MpesaBadge'
import { Money } from '../components/Money'
import { useApp } from '../context/AppProvider'
import { PortalCard, PortalPageTitle } from './PortalChrome'
import { fetchFarmerLoans } from '../lib/api'

export function PortalLoans() {
  const { t } = useApp()
  const farmerId = 'wanjiku'
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const data = await fetchFarmerLoans(farmerId)
      setLoans(data)
      setLoading(false)
    })()
  }, [])

  return (
    <div>
      <PortalPageTitle title={t('My loans', 'Mikopo yangu')} subtitle={t('FlowCredit M-Pesa loans', 'Mikopo ya FlowCredit')} />

      {loading ? (
        <PortalCard><div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading loans…</div></PortalCard>
      ) : loans.length === 0 ? (
        <PortalCard>
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{t('No active loans', 'Hakuna mikopo hai')}</div>
            <div style={{ color: 'var(--muted)', marginTop: 6, fontSize: 13 }}>
              {t('You are eligible for a FlowCredit loan. Apply below!', 'Unastahili mkopo wa FlowCredit. Omba hapa chini!')}
            </div>
          </div>
        </PortalCard>
      ) : (
        loans.map((loan: any) => {
          const pct = Math.round(Number(loan.repaidFraction || 0) * 100)
          const statusColor = loan.status === 'Active' ? 'var(--fresh)' : loan.status === 'Overdue' ? '#dc2626' : loan.status === 'Completed' ? 'var(--muted)' : 'var(--gold)'
          return (
            <PortalCard key={loan.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="mono" style={{ fontWeight: 900, fontSize: 22 }}><Money amount={Number(loan.amount)} /></div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {loan.interestPct}% interest · {loan.instalments} instalments
                  </div>
                </div>
                <span className="chip" style={{ background: `${statusColor}22`, color: statusColor, fontWeight: 800 }}>
                  {loan.status}
                </span>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                  <span>{t('Repaid', 'Imelipwa')}</span>
                  <span className="mono">{pct}%</span>
                </div>
                <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--gold), var(--fresh))', transition: 'width 0.6s ease' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                <span>{t('Disbursed', 'Imetolewa')}: {loan.disbursedAt || '—'}</span>
                {loan.nextDue && <span>{t('Next due', 'Inafika')}: {loan.nextDue}</span>}
              </div>
            </PortalCard>
          )
        })
      )}

      <button className="btn btn-gold" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}>
        <MpesaBadge /> {t('Apply for new loan', 'Omba mkopo mpya')}
      </button>
    </div>
  )
}
