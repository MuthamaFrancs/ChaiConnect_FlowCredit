import { useEffect, useState } from 'react'
import { Money } from '../components/Money'
import { useApp } from '../context/AppProvider'
import { PortalCard, PortalPageTitle } from './PortalChrome'
import { fetchFarmerDeliveries } from '../lib/api'

export function PortalDeliveries() {
  const { t } = useApp()
  const farmerId = 'wanjiku'
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const data = await fetchFarmerDeliveries(farmerId)
      setRows(data)
      setLoading(false)
    })()
  }, [])

  return (
    <div>
      <PortalPageTitle title={t('My deliveries', 'Mizigo yangu')} subtitle={t('Live from Neon DB', 'Data hai')} />
      {loading ? (
        <PortalCard><div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading deliveries…</div></PortalCard>
      ) : rows.length === 0 ? (
        <PortalCard><div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>{t('No deliveries yet', 'Hakuna mizigo bado')}</div></PortalCard>
      ) : (
        rows.map((d: any) => (
          <PortalCard key={d.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800 }}>{d.date}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {Number(d.kg).toFixed(0)} kg · Grade {d.grade} · {d.rate}/kg
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontWeight: 900 }}><Money amount={Number(d.net)} /></div>
                <span className="chip" style={{
                  fontSize: 10, marginTop: 4,
                  background: d.status === 'Paid' ? 'rgba(82,183,136,0.15)' : 'rgba(217,119,6,0.15)',
                  color: d.status === 'Paid' ? '#065f46' : '#92400e',
                }}>{d.status}</span>
              </div>
            </div>
          </PortalCard>
        ))
      )}
    </div>
  )
}
