import { useEffect, useMemo, useRef, useState } from 'react'
import { MpesaBadge } from '../../components/MpesaBadge'
import { Money } from '../../components/Money'
import { fetchMpesaFeed, fetchSmsLog, simulateC2B, checkTransactionStatus } from '../../lib/api'
import type { MpesaTx } from '../../types'

type TxRow = MpesaTx & { _type?: string }
type Filter = 'All' | 'B2C' | 'C2B' | 'SMS' | 'Failed'

export function FlowCreditTransactionsPage() {
  const [rows, setRows] = useState<TxRow[]>([])
  const [smsLog, setSmsLog] = useState<{ id: string; phone: string; message: string; type: string; sentAt: string }[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('All')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // C2B simulation form
  const [c2bPhone, setC2bPhone] = useState('0712345678')
  const [c2bAmount, setC2bAmount] = useState(5000)
  const [c2bResult, setC2bResult] = useState<{ ok: boolean; farmer: string; gross: number; loanDeduction: number; net: number; loanIntercepted: boolean; message: string; transId: string } | null>(null)
  const [c2bLoading, setC2bLoading] = useState(false)

  // Transaction Status query
  const [txStatusId, setTxStatusId] = useState('')
  const [txStatusResult, setTxStatusResult] = useState<any>(null)
  const [txStatusLoading, setTxStatusLoading] = useState(false)

  async function load() {
    const [data, sms] = await Promise.all([fetchMpesaFeed(), fetchSmsLog()])
    setRows(data as TxRow[])
    setSmsLog(sms)
    setLastRefresh(new Date())
  }

  useEffect(() => {
    void load()
    intervalRef.current = setInterval(() => void load(), 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const allItems = useMemo(() => {
    const txItems = rows.map(r => ({ ...r, _type: r.type as string }))
    const smsItems = smsLog.map(s => ({
      id: s.id, type: 'SMS' as const, _type: 'SMS', farmer: s.phone, phone: s.phone,
      amount: 0, direction: 'out' as const, code: '0', ts: s.sentAt.replace('T', ' ').slice(0, 16),
      pending: false, raw: { message: s.message, type: s.type },
    }))
    return [...txItems, ...smsItems].sort((a, b) => (b.ts ?? '').localeCompare(a.ts ?? ''))
  }, [rows, smsLog])

  const filtered = useMemo(() => {
    if (filter === 'All') return allItems
    if (filter === 'Failed') return allItems.filter(t => t.code !== '0' && t._type !== 'SMS')
    if (filter === 'SMS') return allItems.filter(t => t._type === 'SMS')
    return allItems.filter(t => t._type === filter)
  }, [filter, allItems])

  const active = allItems.find(r => r.id === sel)

  async function handleC2BSimulate() {
    setC2bLoading(true)
    setC2bResult(null)
    const result = await simulateC2B({ phone: c2bPhone, amount: c2bAmount, reference: 'CoopPayment' })
    setC2bResult(result)
    setC2bLoading(false)
    // Refresh the feed to show the new C2B entry
    await load()
  }

  async function handleTxStatus() {
    if (!txStatusId) return
    setTxStatusLoading(true)
    const result = await checkTransactionStatus(txStatusId)
    setTxStatusResult(result)
    setTxStatusLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ color: 'var(--gold)', margin: 0 }}>Live Daraja Feed</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            refreshed {lastRefresh.toLocaleTimeString()}
          </span>
          <button className="btn btn-ghost" type="button" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => void load()}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── C2B Simulation — Test the Repayment Intercept ── */}
      <div className="card-surface" style={{ padding: 16, marginBottom: 14, border: '2px solid rgba(212,160,23,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <MpesaBadge />
          <strong style={{ fontFamily: 'var(--font-display)' }}>Test C2B Repayment Intercept</strong>
          <span className="chip" style={{ background: 'rgba(217,119,6,0.15)', color: '#92400e', fontSize: 10 }}>CORE INNOVATION</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
          Simulate a cooperative payment arriving via Paybill. If the farmer has an active loan, ChaiConnect's C2B validation webhook will intercept and auto-deduct the repayment instalment.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label>Phone</label>
            <input className="input" style={{ width: 160 }} value={c2bPhone} onChange={e => setC2bPhone(e.target.value)} />
          </div>
          <div>
            <label>Amount (KSh)</label>
            <input className="input" type="number" style={{ width: 120 }} value={c2bAmount} onChange={e => setC2bAmount(Number(e.target.value))} />
          </div>
          <button className="btn btn-gold" disabled={c2bLoading} onClick={() => void handleC2BSimulate()}>
            <MpesaBadge /> {c2bLoading ? 'Processing…' : 'Simulate C2B Payment'}
          </button>
        </div>
        {c2bResult && (
          <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: c2bResult.loanIntercepted ? 'rgba(212,160,23,0.08)' : 'rgba(82,183,136,0.08)', border: `1px solid ${c2bResult.loanIntercepted ? 'rgba(212,160,23,0.3)' : 'rgba(82,183,136,0.3)'}` }}>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
              {c2bResult.loanIntercepted ? '💰 LOAN REPAYMENT INTERCEPTED' : '✅ Full payment to farmer'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Gross payment</div>
                <div className="mono" style={{ fontWeight: 800, fontSize: 18 }}><Money amount={c2bResult.gross} /></div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: c2bResult.loanDeduction > 0 ? '#dc2626' : 'var(--muted)' }}>Loan deduction</div>
                <div className="mono" style={{ fontWeight: 800, fontSize: 18, color: c2bResult.loanDeduction > 0 ? '#dc2626' : undefined }}>
                  {c2bResult.loanDeduction > 0 ? '−' : ''}<Money amount={c2bResult.loanDeduction} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--fresh)' }}>Net to farmer</div>
                <div className="mono" style={{ fontWeight: 800, fontSize: 18, color: 'var(--fresh)' }}><Money amount={c2bResult.net} /></div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              Farmer: {c2bResult.farmer} · Trans ID: {c2bResult.transId}
            </div>
            <pre style={{ marginTop: 8, padding: 10, background: '#0b1220', color: '#baf7cf', borderRadius: 8, overflow: 'auto', fontSize: 11, maxHeight: 120 }}>
              {JSON.stringify(c2bResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* ── Transaction Status Query ── */}
      <div className="card-surface" style={{ padding: 16, marginBottom: 14 }}>
        <strong style={{ fontFamily: 'var(--font-display)' }}>Transaction Status API</strong>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label>Transaction/Conversation ID</label>
            <input className="input" placeholder="SIM-1234567890 or SIMC2B-..." value={txStatusId} onChange={e => setTxStatusId(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={txStatusLoading || !txStatusId} onClick={() => void handleTxStatus()}>
            {txStatusLoading ? 'Querying…' : '🔍 Check Status'}
          </button>
        </div>
        {txStatusResult && (
          <pre style={{ marginTop: 10, padding: 10, background: '#0b1220', color: '#baf7cf', borderRadius: 8, overflow: 'auto', fontSize: 11, maxHeight: 150 }}>
            {JSON.stringify(txStatusResult, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
        <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['All', 'B2C', 'C2B', 'SMS', 'Failed'] as Filter[]).map(f => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                type="button"
                style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                onClick={() => setFilter(f)}
              >
                {f} ({f === 'All' ? allItems.length : f === 'Failed' ? allItems.filter(t => t.code !== '0' && t._type !== 'SMS').length : allItems.filter(t => t._type === f).length})
              </button>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, maxHeight: 500, overflow: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 20, color: 'var(--muted)', textAlign: 'center' }}>
                No transactions yet — disburse a loan or simulate a C2B payment above.
              </div>
            )}
            {filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSel(t.id)}
                className="btn btn-ghost"
                style={{
                  width: '100%', justifyContent: 'flex-start', borderRadius: 0,
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  display: 'grid', gridTemplateColumns: '100px 60px 1fr 110px',
                  gap: 10, textAlign: 'left',
                  background: sel === t.id ? 'rgba(0,0,0,0.05)' : undefined,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.id}</span>
                <span className="chip" style={{
                  justifySelf: 'start', fontSize: 10,
                  background: t._type === 'SMS' ? 'rgba(0,165,80,0.15)' : t._type === 'C2B' ? 'rgba(212,160,23,0.15)' : 'rgba(82,183,136,0.15)',
                }}>{t._type}</span>
                <span>{t.farmer ?? '—'}</span>
                <span style={{ color: t._type === 'SMS' ? '#00a550' : t.direction === 'in' ? 'var(--fresh)' : '#ef4444' }}>
                  {t._type === 'SMS' ? '📱 SMS' : `${t.direction === 'out' ? '−' : '+'}KSh ${Number(t.amount).toLocaleString()}`}
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
                  {active.ts} · {active._type === 'SMS' ? '📱 SMS notification' : (
                    <>Code: <span style={{ color: active.code === '0' ? 'var(--fresh)' : '#ef4444' }}>
                      {active.code === '0' ? '✅ Success' : `❌ ${active.code}`}
                    </span></>
                  )}
                </div>
                <pre style={{ marginTop: 10, padding: 12, background: '#0b1220', color: '#baf7cf', borderRadius: 12, overflow: 'auto', maxHeight: 300 }}>
                  {JSON.stringify(active.raw, null, 2)}
                </pre>
              </>
            )}
          </div>
          <div className="card-surface" style={{ padding: 14 }}>
            <strong>API health (session)</strong>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', display: 'grid', gap: 6 }}>
              <div>B2C success: {rows.filter(r => r.code === '0' && r.type === 'B2C').length}/{rows.filter(r => r.type === 'B2C').length}</div>
              <div>C2B received: {rows.filter(r => r.type === 'C2B').length}</div>
              <div>SMS sent: {smsLog.length}</div>
              <div>Total feed entries: {allItems.length}</div>
              <div>Daraja endpoint: <span style={{ color: 'var(--fresh)' }}>sandbox.safaricom.co.ke</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
