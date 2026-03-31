import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DELIVERIES, FARMERS, LOANS, MPESA_FEED } from '../data/seed'
import { useApp } from '../context/AppProvider'

export function GlobalSearch() {
  const { searchOpen, setSearchOpen } = useApp()
  const [q, setQ] = useState('')
  const nav = useNavigate()

  const results = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return { farmers: [] as typeof FARMERS, deliveries: [], tx: [], loans: [] as typeof LOANS }
    return {
      farmers: FARMERS.filter(
        (f) =>
          f.name.toLowerCase().includes(qq) ||
          f.memberNo.toLowerCase().includes(qq) ||
          f.phone.includes(qq),
      ).slice(0, 6),
      deliveries: DELIVERIES.filter((d) => d.id.toLowerCase().includes(qq)).slice(0, 5),
      tx: MPESA_FEED.filter((t) => t.id.toLowerCase().includes(qq)).slice(0, 5),
      loans: LOANS.filter((l) => l.farmerName.toLowerCase().includes(qq)).slice(0, 5),
    }
  }, [q])

  if (!searchOpen) return null

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14, 20, 18, 0.72)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '8vh 16px',
      }}
      onMouseDown={() => setSearchOpen(false)}
    >
      <div
        className="card-surface"
        style={{
          width: 'min(640px, 100%)',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: 20,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontFamily: 'var(--font-display)' }}>Search ChaiConnect</strong>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Esc / click outside</span>
        </div>
        <input
          className="input"
          autoFocus
          placeholder="Farmers, deliveries, loans…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginTop: 12 }}
        />
        <div style={{ marginTop: 16, display: 'grid', gap: 18 }}>
          <Group title="Farmers">
            {results.farmers.map((f) => (
              <button
                key={f.id}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => {
                  setSearchOpen(false)
                  nav(`/app/farmers/${f.id}`)
                }}
              >
                {f.name} · {f.memberNo}
              </button>
            ))}
            {!results.farmers.length && <Muted>No matches</Muted>}
          </Group>
          <Group title="Deliveries">
            {results.deliveries.map((d) => (
              <button
                key={d.id}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => {
                  setSearchOpen(false)
                  nav('/app/deliveries')
                }}
              >
                {d.id} · {d.kg} kg
              </button>
            ))}
            {!results.deliveries.length && q && <Muted>No matches</Muted>}
          </Group>
          <Group title="Transactions">
            {results.tx.map((t) => (
              <button
                key={t.id}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => {
                  setSearchOpen(false)
                  nav('/flowcredit/transactions')
                }}
              >
                {t.type} · {t.id}
              </button>
            ))}
            {!results.tx.length && q && <Muted>No matches</Muted>}
          </Group>
          <Group title="Loans">
            {results.loans.map((l) => (
              <button
                key={l.id}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => {
                  setSearchOpen(false)
                  nav('/flowcredit/loans')
                }}
              >
                {l.farmerName} · {l.status}
              </button>
            ))}
            {!results.loans.length && q && <Muted>No matches</Muted>}
          </Group>
        </div>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          marginBottom: 8,
          fontFamily: 'var(--font-display)',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>{children}</div>
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--muted)', fontSize: 13 }}>{children}</div>
}
