import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppProvider'
import { PortalBrandRow } from './PortalChrome'

const tabs: { to: string; label: [string, string]; icon: string; end?: boolean }[] = [
  { to: '/portal', label: ['Home', 'Nyumbani'], icon: '\u2302', end: true },
  { to: '/portal/wallet', label: ['Wallet', 'Pochi'], icon: 'W' },
  { to: '/portal/deliveries', label: ['Deliveries', 'Mizigo'], icon: '\u25A0' },
  { to: '/portal/payments', label: ['Payments', 'Malipo'], icon: '\u24C2' },
  { to: '/portal/deductions', label: ['Deductions', 'Makato'], icon: '\u2211' },
  { to: '/portal/loans', label: ['FlowCredit', 'Mkopo'], icon: '\u2605' },
]

export function PortalLayout() {
  const { lang, setLang, logout, t, theme, toggleTheme } = useApp()
  const nav = useNavigate()

  return (
    <div className="portal-body" style={{ minHeight: '100vh', paddingBottom: 88, background: 'var(--parchment)' }}>
      <header className="portal-header-shell">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <PortalBrandRow />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="portal-pill-sandbox">Sandbox</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: 0.9 }}>
              <span className="portal-daraja-dot" />
              <span style={{ fontWeight: 700 }}>Daraja</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{
                padding: '6px 10px',
                fontSize: 12,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              onClick={toggleTheme}
              title={theme === 'dark' ? t('Light mode', 'Mwanga') : t('Dark mode', 'Giza')}
              aria-label={t('Toggle theme', 'Badili mandhari')}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              style={{
                padding: '6px 10px',
                fontSize: 12,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
            >
              {lang === 'en' ? 'Kiswahili' : 'English'}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              style={{
                padding: '6px 10px',
                fontSize: 12,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              onClick={() => {
                logout()
                nav('/')
              }}
            >
              {t('Exit', 'Toka')}
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: '16px 14px', maxWidth: 520, margin: '0 auto' }} className="page-enter">
        <Outlet />
      </main>

      <nav className="portal-nav">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end === true} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <span aria-hidden style={{ fontSize: 14, opacity: 0.9, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {tab.icon}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.02em' }}>
              {lang === 'sw' ? tab.label[1] : tab.label[0]}
            </span>
          </NavLink>
        ))}
      </nav>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 56,
          zIndex: 45,
          textAlign: 'center',
          paddingBottom: 4,
          pointerEvents: 'none',
        }}
      >
        <NavLink
          to="/portal/ussd"
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--leaf)',
            pointerEvents: 'auto',
            padding: '6px 12px',
            background: 'var(--surface)',
            borderRadius: 999,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {t('USSD *483#', 'USSD *483#')}
        </NavLink>
      </div>
    </div>
  )
}
