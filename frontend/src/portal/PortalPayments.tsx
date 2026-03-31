import { useEffect, useState } from 'react'
import { MpesaBadge } from '../components/MpesaBadge'
import { Money } from '../components/Money'
import { useApp } from '../context/AppProvider'
import { PortalCard, PortalPageTitle } from './PortalChrome'
import { fetchFarmerPayments } from '../lib/api'

export function PortalPayments() {
  const { t } = useApp()
  const farmerId = 'wanjiku'
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const data = await fetchFarmerPayments(farmerId)
      setRows(data)
      setLoading(false)
    })()
  }, [])

  return (
    <div>
      <PortalPageTitle title={t('My payments', 'Malipo yangu')} subtitle={t('M-Pesa backed', 'M-Pesa')} />

      {loading ? (
        <PortalCard><div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading…</div></PortalCard>
      ) : rows.length === 0 ? (
        <PortalCard>
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
            {t('No payments recorded yet', 'Hakuna malipo bado')}
          </div>
        </PortalCard>
      ) : (
        rows.map((p: any) => (
          <PortalCard key={p.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MpesaBadge />
                  <span className="mono" style={{ fontWeight: 900, fontSize: 18 }}><Money amount={Number(p.net || p.amount)} /></span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Gross: <Money amount={Number(p.amount)} /> · Deductions: <Money amount={Number(p.deductions || 0)} />
                </div>
              </div>
              <span className="chip" style={{
                background: p.status === 'Paid' ? 'rgba(82,183,136,0.15)' : 'rgba(217,119,6,0.15)',
                color: p.status === 'Paid' ? '#065f46' : '#92400e',
              }}>{p.status}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
              {p.time} {p.mpesaRef ? `· Ref: ${p.mpesaRef}` : ''}
            </div>
          </PortalCard>
        ))
      )}
    </div>
  )
}
