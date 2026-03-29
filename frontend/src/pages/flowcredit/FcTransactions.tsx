import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchMpesaFeed } from '../../lib/api'
import { MPESA_FEED } from '../../data/seed'

type TxRow = (typeof MPESA_FEED)[0]
type Filter = 'All' | 'B2C' | 'C2B' | 'Validation' | 'Callbacks' | 'Failed'

export function FlowCreditTransactionsPage() {
  const [rows, setRows] = useState<TxRow[]>(MPESA_FEED)
  const [sel, setSel] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('All')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function load() {
    const data = await fetchMpesaFeed()
    setRows(data as TxRow[])
    setLastRefresh(new Date())
  }

  useEffect(() => {
    void load()
    // Auto-refresh every 15 seconds to catch new B2C results
    intervalRef.current = setInterval(() => void load(), 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'All') return rows
    if (filter === 'Failed') return rows.filter((t) => t.code !== '0')
    if (filter === 'Callbacks') return rows.filter((t) => t.type === 'Callback')
    return rows.filter((t) => t.type === filter)
  }, [filter, rows])

  const active = filtered.find((r) => r.id === sel)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ color: 'var(--gold)', margin: 0 }}>Live M-Pesa Feed</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            refreshed {lastRefresh.toLocaleTimeString()}
          </span>
          <button className="btn btn-ghost" type="button" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => void load()}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
        <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['All', 'B2C', 'C2B', 'Validation', 'Callbacks', 'Failed'] as const).map((f) => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                type="button"
                style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {filtered.length === 0 && (
              <div style={{ padding: 20, color: 'var(--muted)', textAlign: 'center' }}>
                No transactions yet — disburse a loan to see entries here.
              </div>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSel(t.id)}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  borderRadius: 0,
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  display: 'grid',
                  gridTemplateColumns: '100px 70px 1fr 120px',
                  gap: 10,
                  textAlign: 'left',
                  background: sel === t.id ? 'rgba(0,0,0,0.05)' : undefined,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.id}</span>
                <span className="chip" style={{ justifySelf: 'start' }}>{t.type}</span>
                <span>{t.farmer ?? '—'}</span>
                <span style={{ color: t.direction === 'in' ? 'var(--fresh)' : '#ef4444' }}>
                  {t.direction === 'out' ? '−' : '+'}KSh {Number(t.amount).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div className="card-surface" style={{ padding: 14, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <strong>Detail</strong>
            {!active ? (
              <div style={{ color: 'var(--muted)', marginTop: 8 }}>Select a row to inspect the raw Daraja payload</div>
            ) : (
              <>
                <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 11 }}>
                  {active.ts} · Code: <span style={{ color: active.code === '0' ? 'var(--fresh)' : '#ef4444' }}>
                    {active.code === '0' ? '✅ Success' : `❌ ${active.code}`}
                  </span>
                </div>
                <pre style={{ marginTop: 10, padding: 12, background: '#0b1220', color: '#baf7cf', borderRadius: 12, overflow: 'auto' }}>
                  {JSON.stringify(active.raw, null, 2)}
                </pre>
                {active.code !== '0' && (
                  <button className="btn btn-primary" type="button" style={{ width: '100%', marginTop: 10 }}>
                    Retry
                  </button>
                )}
              </>
            )}
          </div>
          <div className="card-surface" style={{ padding: 14 }}>
            <strong>API health (24h)</strong>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', display: 'grid', gap: 6 }}>
              <div>B2C success: {rows.filter(r => r.code === '0').length}/{rows.filter(r => r.type === 'B2C').length} requests</div>
              <div>Live transactions: {rows.length}</div>
              <div>Daraja endpoint: <span style={{ color: 'var(--fresh)' }}>sandbox.safaricom.co.ke</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
