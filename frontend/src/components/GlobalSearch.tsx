import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppProvider'
import { fetchFarmers, fetchLoans } from '../lib/api'
import type { Farmer, Loan } from '../types'

export function GlobalSearch() {
  const { searchOpen, setSearchOpen } = useApp()
  const [q, setQ] = useState('')
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  // Load data when search opens
  useEffect(() => {
    if (!searchOpen) { setQ(''); return }
    inputRef.current?.focus()
    if (farmers.length > 0) return
    setLoading(true)
    Promise.all([fetchFarmers(), fetchLoans()]).then(([f, l]) => {
      setFarmers(f)
      setLoans(l)
      setLoading(false)
    })
  }, [searchOpen])

  // Escape key closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSearchOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  const qq = q.trim().toLowerCase()
  const filteredFarmers = qq
    ? farmers.filter(f =>
        f.name.toLowerCase().includes(qq) ||
        (f.memberNo || '').toLowerCase().includes(qq) ||
        (f.phone || '').includes(qq),
      ).slice(0, 6)
    : farmers.slice(0, 4)

  const filteredLoans = qq
    ? loans.filter(l =>
        (l.farmerName || '').toLowerCase().includes(qq) ||
        (l.id || '').toLowerCase().includes(qq),
      ).slice(0, 5)
    : loans.slice(0, 3)

  if (!searchOpen) return null

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(14, 20, 18, 0.72)',
        zIndex: 200, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '8vh 16px',
      }}
      onMouseDown={() => setSearchOpen(false)}
    >
      <div
        className="card-surface"
        style={{ width: 'min(640px, 100%)', maxHeight: '80vh', overflow: 'auto', padding: 20 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontFamily: 'var(--font-display)' }}>Search ChaiConnect</strong>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Esc / click outside</span>
        </div>
        <input
          ref={inputRef}
          className="input"
          autoFocus
          placeholder="Farmers, loans, members…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginTop: 12 }}
        />

        {loading && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {!loading && (
          <div style={{ marginTop: 16, display: 'grid', gap: 18 }}>
            <Group title="Farmers">
              {filteredFarmers.map((f) => (
                <button
                  key={f.id}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => { setSearchOpen(false); nav(`/app/farmers/${f.id}`) }}
                >
                  {f.name} · {f.memberNo} · <span style={{ color: 'var(--muted)', fontSize: 12 }}>{f.phone}</span>
                </button>
              ))}
              {filteredFarmers.length === 0 && <Muted>{qq ? 'No matching farmers' : 'No farmers yet'}</Muted>}
            </Group>

            <Group title="Loans">
              {filteredLoans.map((l) => (
                <button
                  key={l.id}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => { setSearchOpen(false); nav('/flowcredit/loans') }}
                >
                  {l.farmerName} · <span className="chip" style={{ fontSize: 11 }}>{l.status}</span>
                  {' '}· KSh {Number(l.amount || 0).toLocaleString()}
                </button>
              ))}
              {filteredLoans.length === 0 && <Muted>{qq ? 'No matching loans' : 'No loans yet'}</Muted>}
            </Group>
          </div>
        )}
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>
        {title}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>{children}</div>
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--muted)', fontSize: 13 }}>{children}</div>
}
