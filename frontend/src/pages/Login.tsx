import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/AppShell'
import { useApp } from '../context/AppProvider'
import type { Role } from '../types'

export function LoginPage() {
  const { login, lang, setLang, t, theme, toggleTheme } = useApp()
  const nav = useNavigate()
  const [role, setRole] = useState<Role>('admin')
  const [email, setEmail] = useState('admin@chaiconnect.co.ke')
  const [pin, setPin] = useState('')
  const [phone, setPhone] = useState('0712345678')
  const [otp, setOtp] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const factoryId = 'kiambu'
    if (role === 'farmer') {
      login({ role, name: 'Wanjiku Kamau', factoryId })
      nav('/portal')
      return
    }
    if (role === 'admin') login({ role, name: 'Makena Wanjiru', factoryId })
    else if (role === 'clerk') login({ role, name: 'Juma Otieno', factoryId })
    else login({ role, name: 'Wambui Extension', factoryId })
    nav('/app')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div
        style={{
          flex: '0 0 55%',
          background: 'linear-gradient(165deg, #0b1f18 0%, #1b4332 35%, #2d6a4f 55%, #52b788 85%, #ffd89b 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.35,
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.35), transparent 55%)',
          }}
        />
        {/* SVG terraced hills */}
        <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
          <path d="M0 420 Q120 360 240 400 T480 380 T800 340 L800 600 L0 600Z" fill="rgba(13,40,32,0.65)" />
          <path d="M0 460 Q200 400 400 430 T800 400 L800 600 L0 600Z" fill="rgba(27,67,50,0.55)" />
          <path d="M0 520 Q180 470 420 500 T800 460 L800 600 L0 600Z" fill="rgba(45,106,79,0.45)" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${80 + i * 140}, ${280 + i * 18})`} opacity={0.2}>
              <ellipse cx="40" cy="60" rx="90" ry="28" fill="#0a2f24" />
            </g>
          ))}
        </svg>
      </div>

      <div
        style={{
          flex: '0 0 45%',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          padding : '28px 36px',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={toggleTheme} title={theme === 'dark' ? t('Light mode', 'Mwanga') : t('Dark mode', 'Giza')}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}>
            {lang === 'en' ? 'Kiswahili' : 'English'}
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <BrandMark />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>
                  ChaiConnect
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {t('Tea cooperative operations & FlowCredit', 'Uendeshaji wa ushirika & FlowCredit')}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 18,
              }}
            >
              {(
                [
                  ['admin', 'Admin'],
                  ['clerk', 'Clerk'],
                  ['officer', 'Officer'],
                  ['farmer', 'Farmer'],
                ] as const
              ).map(([r, label]) => (
                <button
                  key={r}
                  type="button"
                  className="btn"
                  onClick={() => setRole(r)}
                  style={{
                    borderRadius: 999,
                    background: role === r ? 'rgba(82,183,136,0.18)' : '#fff',
                    borderColor: role === r ? 'var(--fresh)' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="card-surface" style={{ padding: 22 }}>
              {role === 'admin' && (
                <>
                  <Field label={t('Work email', 'Barua pepe ya kazi')}>
                    <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Field label={t('Password', 'Nenosiri')}>
                    <input className="input" type="password" value={pin} placeholder="••••••••" onChange={(e) => setPin(e.target.value)} />
                  </Field>
                </>
              )}
              {role === 'clerk' && (
                <>
                  <Field label={t('Employee ID', 'Kitambulisho cha mfanyakazi')}>
                    <input className="input" defaultValue="KC-2044" />
                  </Field>
                  <Field label={t('4-digit PIN', 'PIN ya tarakimu 4')}>
                    <input className="input" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} />
                  </Field>
                </>
              )}
              {role === 'officer' && (
                <>
                  <Field label={t('Staff ID', 'Kitambulisho cha wataalamu')}>
                    <input className="input" defaultValue="EXT-889" />
                  </Field>
                  <Field label={t('Password', 'Nenosiri')}>
                    <input className="input" type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
                  </Field>
                </>
              )}
              {role === 'farmer' && (
                <>
                  <Field label={t('M-Pesa phone', 'Simu ya M-Pesa')}>
                    <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field label={t('OTP (simulated)', 'OTP (imeigwa)')}>
                    <input className="input" value={otp} placeholder="5921" onChange={(e) => setOtp(e.target.value)} />
                  </Field>
                </>
              )}

              <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} type="submit">
                {t('Continue to platform', 'Endelea')}
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid rgba(0,0,0,0.06)',
                background: 'rgba(82,183,136,0.08)',
              }}
            >
              <MpesaPulse />
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {t('Powered by M-Pesa Daraja 3.0', 'Imewezeshwa na M-Pesa Daraja 3.0')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ ...{}, fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--muted)' }}>{label}</span>
      <div style={{ marginTop: 6 }}>{children}</div>
    </label>
  )
}

function MpesaPulse() {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: '#00a550',
        display: 'inline-block',
        animation: 'pulseDot 1.6s ease-in-out infinite',
      }}
    />
  )
}
