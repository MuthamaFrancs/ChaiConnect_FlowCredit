import { useState } from 'react'
import { MpesaBadge } from '../components/MpesaBadge'
import { PortalPageTitle } from './PortalChrome'

const MENU: { key: string; message: string }[] = [
  { key: '1', message: 'Deliveries summary SMS sent.' },
  { key: '2', message: 'Last payment: KSh 18,500 on 28 Mar.' },
  { key: '3', message: 'Latest grade: A (Kiambu).' },
  { key: '4', message: 'FlowCredit: pre-approved limit KSh 30,000.' },
]

export function PortalUssd() {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const msg = MENU.find((m) => m.key === activeKey)?.message

  return (
    <div>
      <PortalPageTitle title="USSD simulator" subtitle="*483# · ChaiConnect menu (responses simulated via SMS preview)" />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          className="card-surface"
          style={{
            width: 'min(300px, 100%)',
            borderRadius: 24,
            padding: 0,
            overflow: 'hidden',
            borderTop: '4px solid var(--forest)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ padding: '10px 14px', background: 'var(--forest)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Safaricom</span>
            <span className="portal-daraja-dot" style={{ background: '#fff' }} />
          </div>
          <div
            style={{
              padding: 16,
              background: '#121a16',
              color: '#e8f5e9',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              minHeight: 400,
            }}
          >
            <div style={{ opacity: 0.65, fontSize: 11 }}>Dial</div>
            <div style={{ marginTop: 6, fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              *483#
              <MpesaBadge />
            </div>
            <div style={{ marginTop: 16, lineHeight: 1.55 }}>
              <div style={{ fontWeight: 800 }}>ChaiConnect</div>
              <div style={{ marginTop: 12 }}>1. Deliveries</div>
              <div>2. Payments</div>
              <div>3. Quality</div>
              <div>4. Loans</div>
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
              {MENU.map(({ key }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveKey(key)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${activeKey === key ? 'var(--fresh)' : 'rgba(255,255,255,0.12)'}`,
                    background: activeKey === key ? 'rgba(82, 183, 136, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                  }}
                >
                  Press {key}
                </button>
              ))}
            </div>
            {msg && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.08)', borderLeft: '3px solid var(--fresh)' }}>
                <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SMS</div>
                <div style={{ marginTop: 6 }}>{msg}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
