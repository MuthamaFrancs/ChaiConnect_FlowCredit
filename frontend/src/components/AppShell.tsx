import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppProvider'
import { useMediaQuery } from '../lib/useMediaQuery'

const LEAF_BG = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><path fill='%23ffffff' fill-opacity='0.04' d='M48 10c-10 18-20 28-20 38 0 12 9 22 20 27 11-5 20-15 20-27 0-10-10-20-20-38z'/></svg>",
)}")`

const navClass = ({ isActive }: { isActive: boolean }) =>
  `nav-item${isActive ? ' nav-item-active' : ''}`

export function AppShell({ flowcredit }: { flowcredit?: boolean }) {
  const { auth, logout, setSearchOpen, pushToast, lang, setLang, t, theme, toggleTheme } = useApp()
  const nav = useNavigate()
  const accent = flowcredit ? 'var(--gold)' : 'var(--fresh)'
  const isNarrow = useMediaQuery('(max-width: 900px)')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = () => setSidebarOpen(false)

  useEffect(() => {
    if (!isNarrow) setSidebarOpen(false)
  }, [isNarrow])

  return (
    <div className="shell-layout">
      <button
        type="button"
        className={`shell-backdrop${sidebarOpen && isNarrow ? ' shell-backdrop-visible' : ''}`}
        aria-label={t('Close menu', 'Funga menyu')}
        onClick={closeSidebar}
      />
      <aside
        id="staff-sidebar"
        className={`shell-sidebar${sidebarOpen && isNarrow ? ' shell-sidebar-open' : ''}`}
        style={{
          backgroundImage: LEAF_BG,
        }}
      >
        <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandMark small />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>
                ChaiConnect
              </div>
              <div style={{ fontSize: 11, opacity: 0.65 }}>Operations & FlowCredit</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflow: 'auto', padding: '12px 10px' }}>
          <NavGroup label="Overview" />
          <NavLink to="/app" end className={navClass} onClick={() => isNarrow && closeSidebar()}>
            Dashboard
          </NavLink>

          <NavGroup label="Farmers" />
          <NavLink className={navClass} to="/app/farmers" onClick={() => isNarrow && closeSidebar()}>
            Farmer Registry
          </NavLink>

          <NavGroup label="Operations" />
          <NavLink className={navClass} to="/app/deliveries" onClick={() => isNarrow && closeSidebar()}>
            Deliveries
          </NavLink>
          <NavLink className={navClass} to="/app/quality" onClick={() => isNarrow && closeSidebar()}>
            Quality
          </NavLink>
          <NavLink className={navClass} to="/app/payments" onClick={() => isNarrow && closeSidebar()}>
            Payments
          </NavLink>

          <NavGroup label="FlowCredit" />
          <NavLink className={navClass} to="/flowcredit" end onClick={() => isNarrow && closeSidebar()}>
            FlowCredit Hub
          </NavLink>
          <NavLink className={navClass} to="/flowcredit/scoring" onClick={() => isNarrow && closeSidebar()} style={{ paddingLeft: 28, fontSize: 13 }}>
            Credit Scoring
          </NavLink>
          <NavLink className={navClass} to="/flowcredit/loans" onClick={() => isNarrow && closeSidebar()} style={{ paddingLeft: 28, fontSize: 13 }}>
            Loans
          </NavLink>
          <NavLink className={navClass} to="/flowcredit/disburse" onClick={() => isNarrow && closeSidebar()} style={{ paddingLeft: 28, fontSize: 13 }}>
            B2C Disburse
          </NavLink>
          <NavLink className={navClass} to="/flowcredit/transactions" onClick={() => isNarrow && closeSidebar()} style={{ paddingLeft: 28, fontSize: 13 }}>
            Daraja API Feed
          </NavLink>

          <NavGroup label="More" />
          <NavLink className={navClass} to="/app/communications" onClick={() => isNarrow && closeSidebar()}>
            Communications
          </NavLink>
          <NavLink className={navClass} to="/app/reports" onClick={() => isNarrow && closeSidebar()}>
            Reports
          </NavLink>
          <NavLink className={navClass} to="/app/settings" onClick={() => isNarrow && closeSidebar()}>
            Settings
          </NavLink>

          <NavGroup label="Farmer Portal" />
          <NavLink className={navClass} to="/portal" onClick={() => isNarrow && closeSidebar()} style={{ opacity: 0.75 }}>
            Open Farmer Portal →
          </NavLink>
        </nav>

        <div
          style={{
            padding: 14,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: 'var(--fresh)',
              animation: 'pulseDot 2s ease-in-out infinite',
            }}
          />
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 700 }}>Daraja API</div>
            <div style={{ opacity: 0.7 }}>Sandbox</div>
          </div>
        </div>
        <div
          style={{
            padding: 14,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
            }}
          >
            {auth?.name
              .split(' ')
              .map((x) => x[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {auth?.name}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'capitalize' }}>{auth?.role}</div>
          </div>
          <button
            className="btn"
            style={{
              padding: '6px 10px',
              fontSize: 12,
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.12)',
            }}
            onClick={() => {
              logout()
              nav('/')
            }}
          >
            {t('Out', 'Toka')}
          </button>
        </div>
      </aside>

      <div className="shell-main-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: 60,
            background: 'var(--header-bg)',
            borderBottom: `1px solid var(--header-border)`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 22px',
            gap: 14,
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <button
            type="button"
            className="shell-hamburger"
            aria-expanded={sidebarOpen}
            aria-controls="staff-sidebar"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <select
            className="input"
            style={{ width: 220, padding: '8px 10px', fontWeight: 600 }}
            defaultValue="kiambu"
          >
            <option value="kiambu">Kiambu Tea Factory</option>
            <option value="meru">Meru Coffee Factory</option>
            <option value="kisumu">Kisumu Dairy Cooperative</option>
          </select>
          <button className="btn btn-ghost" onClick={() => setSearchOpen(true)}>
            {t('Search', 'Tafuta')} <span style={{ color: 'var(--muted)', fontSize: 12 }}>⌘K</span>
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('Light mode', 'Mwanga') : t('Dark mode', 'Giza')}
            aria-label={t('Toggle theme', 'Badili mandhari')}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() =>
              pushToast(
                t('New delivery logged — James Mutua, 42 kg Grade A', 'Mizigo mipya — James Mutua, 42 kg A'),
              )
            }
            aria-label="Notifications"
          >
            🔔<span style={{ color: '#b91c1c', fontWeight: 900 }}>•</span>
          </button>
          <div
            className="chip"
            style={{
              background: 'rgba(217,119,6,0.15)',
              color: 'var(--amber-warn)',
              border: '1px solid rgba(217,119,6,0.35)',
            }}
          >
            Sandbox Mode
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
            onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
          >
            {lang === 'en' ? 'Kiswahili' : 'English'}
          </button>
          {flowcredit && (
            <div style={{ fontSize: 12, fontWeight: 800, color: accent }}>FlowCredit</div>
          )}
        </header>
        <main style={{ padding: 22, flex: 1 }} className="page-enter">
          <Outlet />
        </main>
      </div>

      <style>{`
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          margin: 2px 0;
          border-radius: 10px;
          color: rgba(255,255,255,0.78);
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          font-family: var(--font-display);
          transition: transform 0.12s ease, background 0.12s ease;
        }
        .nav-item:hover {
          background: rgba(255,255,255,0.06);
          transform: translateX(4px);
        }
        .nav-item-active {
          background: rgba(82, 183, 136, 0.2);
          box-shadow: inset 3px 0 0 ${flowcredit ? 'var(--gold)' : 'var(--fresh)'};
          color: #fff;
        }
      `}</style>
    </div>
  )
}

function NavGroup({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '14px 12px 6px',
        fontSize: 10,
        letterSpacing: '0.12em',
        fontWeight: 800,
        opacity: 0.45,
        textTransform: 'uppercase',
        fontFamily: 'var(--font-display)',
      }}
    >
      {label}
    </div>
  )
}

export function BrandMark({ small }: { small?: boolean }) {
  const s = small ? 36 : 48
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden>
      <rect width="48" height="48" rx="12" fill="var(--leaf)" />
      <path
        d="M24 10c-6 10-12 16-12 22a12 12 0 1024 0c0-6-6-12-12-22z"
        fill="var(--fresh)"
      />
      <circle cx="32" cy="14" r="6" fill="#00A550" stroke="#fff" strokeWidth="1.4" />
      <text x="32" y="16.5" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="900" fontFamily="Plus Jakarta Sans, sans-serif">
        M
      </text>
    </svg>
  )
}
