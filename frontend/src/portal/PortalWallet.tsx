import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MpesaBadge } from '../components/MpesaBadge'
import { Money } from '../components/Money'
import { useApp } from '../context/AppProvider'
import { PortalCard, PortalPageTitle } from './PortalChrome'
import {
  fetchWallet, fetchWalletTxns, walletWithdraw,
  fetchFarmerLoans, fetchCreditScore,
} from '../lib/api'
import type { Wallet, WalletTx } from '../types'

// The demo farmer ID — in production, use auth?.userId
const DEMO_FARMER_ID = 'wanjiku'

type WithdrawStep = 'idle' | 'enter_amount' | 'confirm' | 'processing' | 'done'

export function PortalWallet() {
  const { t, auth, pushToast } = useApp()
  const farmerId = auth?.userId ?? DEMO_FARMER_ID

  // Wallet state
  const [wallet, setWallet]   = useState<Wallet | null>(null)
  const [txns, setTxns]       = useState<WalletTx[]>([])
  const [loans, setLoans]     = useState<any[]>([])
  const [creditData, setCreditData] = useState<{
    score: number; grade: string; maxLoanAmount: number;
    factors: Record<string, { score: number; max: number; detail: string }>
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // Withdraw flow
  const [step, setStep]               = useState<WithdrawStep>('idle')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawError, setWithdrawError]   = useState('')
  const [withdrawResult, setWithdrawResult] = useState<{
    ok: boolean; simulated: boolean; ref: string; message: string
  } | null>(null)

  async function reload() {
    setLoading(true)
    const [w, tx, l, c] = await Promise.all([
      fetchWallet(farmerId),
      fetchWalletTxns(farmerId, 15),
      fetchFarmerLoans(farmerId),
      fetchCreditScore(farmerId),
    ])
    if (w) setWallet(w.wallet)
    setTxns(tx.transactions)
    setLoans(l)
    setCreditData(c)
    setLoading(false)
  }

  useEffect(() => { void reload() }, [farmerId])

  const activeLoan    = loans.find((l: any) => l.status === 'Active')
  const realScore     = creditData?.score ?? 50
  const grade         = creditData?.grade ?? 'B'
  const maxLoan       = creditData?.maxLoanAmount ?? 25000
  const availableBal  = Number(wallet?.balance ?? 0)
  const pendingBal    = Number(wallet?.pendingBalance ?? 0)

  // Withdrawal limits
  const MIN_WITHDRAW = 50
  const MAX_WITHDRAW = 70000
  const amountNum    = Number(withdrawAmount)
  const canWithdraw  = amountNum >= MIN_WITHDRAW && amountNum <= Math.min(MAX_WITHDRAW, availableBal)

  async function handleWithdraw() {
    setStep('processing')
    setWithdrawError('')
    const result = await walletWithdraw(farmerId, { amount: amountNum })
    if (result?.ok) {
      setWithdrawResult(result)
      setStep('done')
      pushToast(`✅ KSh ${amountNum.toLocaleString()} ${result.simulated ? 'sent (simulated)' : 'withdrawal initiated'}`)
      await reload()
    } else {
      setWithdrawError('Withdrawal failed — check your balance or try again')
      setStep('confirm')
    }
  }

  function resetWithdraw() {
    setStep('idle'); setWithdrawAmount(''); setWithdrawError(''); setWithdrawResult(null)
  }

  const txTypeIcon: Record<string, string> = {
    deposit:             '📥',
    withdrawal:          '📤',
    loan_disbursement:   '💳',
    loan_repayment:      '🔄',
    cooperative_payment: '🌿',
  }
  const txTypeLabel: Record<string, string> = {
    deposit:             'Deposit',
    withdrawal:          'Withdrawal',
    loan_disbursement:   'Loan disbursement',
    loan_repayment:      'Loan repayment',
    cooperative_payment: 'Cooperative payment',
  }

  return (
    <div>
      <PortalPageTitle
        title={t('My Wallet', 'Mkoba Wangu')}
        subtitle={t('M-Pesa balance · withdraw · full history', 'Salio la M-Pesa · toa pesa · historia')}
      />

      {/* ── Main Balance Card ── */}
      <div style={{
        borderRadius: 20, padding: '22px 20px',
        background: 'linear-gradient(135deg, var(--forest) 0%, #0e5c3a 50%, var(--leaf) 100%)',
        color: '#fff', marginBottom: 14,
        boxShadow: '0 12px 32px rgba(10,50,30,0.28)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circle */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', right: 20, bottom: -30, width: 100, height: 100, borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ChaiConnect Wallet
          </div>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
            {t('Available balance', 'Salio linaloweza kutumika')}
          </div>

          {loading ? (
            <div style={{ height: 52, width: 180, background: 'rgba(255,255,255,0.1)', borderRadius: 10, marginTop: 8, animation: 'pulse 1.5s infinite' }} />
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 'clamp(2rem, 8vw, 2.6rem)', marginTop: 6, letterSpacing: '-0.02em' }}>
              KSh {availableBal.toLocaleString()}
            </div>
          )}

          {pendingBal > 0 && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#fbbf24', display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
              {t(`KSh ${pendingBal.toLocaleString()} pending`, `KSh ${pendingBal.toLocaleString()} inasubiri`)}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total received</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, marginTop: 2 }}>
                KSh {Number(wallet?.totalReceived ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total withdrawn</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, marginTop: 2 }}>
                KSh {Number(wallet?.totalWithdrawn ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>FlowCredit</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, marginTop: 2, color: '#4ade80' }}>
                {realScore} · {grade}
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => setStep('enter_amount')}
            disabled={availableBal < MIN_WITHDRAW || loading}
            style={{
              marginTop: 18, padding: '12px 22px', borderRadius: 12,
              background: availableBal >= MIN_WITHDRAW ? '#00a550' : 'rgba(255,255,255,0.12)',
              color: '#fff', border: 'none', fontWeight: 800, fontSize: 15,
              cursor: availableBal >= MIN_WITHDRAW ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            <MpesaBadge /> {t('Withdraw to M-Pesa', 'Toa pesa M-Pesa')}
          </button>
          {availableBal < MIN_WITHDRAW && !loading && (
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
              {t(`Minimum withdrawal is KSh ${MIN_WITHDRAW}`, `Kiwango cha chini ni KSh ${MIN_WITHDRAW}`)}
            </div>
          )}
        </div>
      </div>

      {/* ── FlowCredit Score ── */}
      <PortalCard accent="gold" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              FlowCredit Score
            </div>
            <div className="mono" style={{ fontSize: 32, fontWeight: 900, marginTop: 4, color: 'var(--forest)' }}>
              {loading ? '…' : realScore}
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginLeft: 8 }}>/ 100</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {t(`Grade ${grade} · Max loan KSh ${maxLoan.toLocaleString()}`, `Daraja ${grade} · Mkopo KSh ${maxLoan.toLocaleString()}`)}
            </div>
          </div>
          <Link className="btn btn-ghost" to="/portal/loans">
            {t('Apply for loan', 'Omba mkopo')} →
          </Link>
        </div>
        {creditData && (
          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            {Object.entries(creditData.factors).map(([key, factor]) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                  <span className="mono" style={{ color: 'var(--muted)' }}>{factor.score}/{factor.max}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{
                    width: `${(factor.score / factor.max) * 100}%`, height: '100%', borderRadius: 999,
                    background: factor.score / factor.max > 0.7 ? 'var(--fresh)' : factor.score / factor.max > 0.4 ? 'var(--gold)' : '#dc2626',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalCard>

      {/* ── Active Loan ── */}
      {activeLoan && (
        <PortalCard style={{ marginBottom: 14, borderColor: 'rgba(212,160,23,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Active loan</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}><Money amount={Number(activeLoan.amount)} /></div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {activeLoan.interestPct}% · {activeLoan.instalments} instalments · auto-deducted via C2B
              </div>
            </div>
            <span className="chip" style={{ background: 'rgba(82,183,136,0.15)', color: '#065f46' }}>
              {Math.round(Number(activeLoan.repaidFraction || 0) * 100)}% repaid
            </span>
          </div>
          <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden', marginTop: 10 }}>
            <div style={{
              width: `${Number(activeLoan.repaidFraction || 0) * 100}%`, height: '100%', borderRadius: 999,
              background: 'linear-gradient(90deg, var(--gold), var(--fresh))', transition: 'width 0.6s ease',
            }} />
          </div>
        </PortalCard>
      )}

      {/* ── Transaction Ledger ── */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, margin: '20px 0 8px' }}>
        {t('Transaction history', 'Historia ya miamala')}
      </div>
      <PortalCard style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
        ) : txns.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            {t('No transactions yet', 'Hakuna miamala bado')}
          </div>
        ) : (
          <div>
            {txns.map((tx, i) => {
              const isOut = tx.type === 'withdrawal' || tx.type === 'loan_repayment'
              return (
                <div key={tx.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '14px 16px',
                  borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  background: tx.status === 'failed' ? 'rgba(239,68,68,0.04)' : undefined,
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, fontSize: 18,
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                      background: isOut ? 'rgba(239,68,68,0.1)' : 'rgba(82,183,136,0.1)',
                    }}>
                      {txTypeIcon[tx.type] ?? '💰'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {txTypeLabel[tx.type] ?? tx.type}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {tx.mpesaReceipt && ` · ${tx.mpesaReceipt}`}
                      </div>
                      {tx.note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{tx.note}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: isOut ? '#ef4444' : 'var(--fresh)' }}>
                      {isOut ? '−' : '+'}KSh {Number(tx.amount).toLocaleString()}
                    </div>
                    {tx.balanceAfter != null && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        Bal: KSh {Number(tx.balanceAfter).toLocaleString()}
                      </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <span className="chip" style={{
                        fontSize: 10, padding: '2px 6px',
                        background: tx.status === 'completed' ? 'rgba(82,183,136,0.15)'
                          : tx.status === 'failed' ? 'rgba(239,68,68,0.15)'
                          : 'rgba(245,158,11,0.15)',
                        color: tx.status === 'completed' ? '#065f46'
                          : tx.status === 'failed' ? '#991b1b'
                          : '#92400e',
                      }}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PortalCard>

      {/* ── Withdraw Modal ── */}
      {step !== 'idle' && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'grid', placeItems: 'center', padding: 16 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) resetWithdraw() }}
        >
          <div className="card-surface" style={{ width: 'min(420px, 100%)', padding: 24 }} onMouseDown={e => e.stopPropagation()}>

            {step === 'enter_amount' && (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
                  {t('Withdraw to M-Pesa', 'Toa pesa M-Pesa')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  {t(`Available: KSh ${availableBal.toLocaleString()} · Min KSh 50 · Max KSh 70,000`,
                    `Inayopatikana: KSh ${availableBal.toLocaleString()} · Kiwango kidogo KSh 50`)}
                </div>

                {/* Amount input */}
                <div style={{ marginTop: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                    {t('Amount (KSh)', 'Kiasi (KSh)')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 700, color: 'var(--muted)' }}>KSh</span>
                    <input
                      className="input"
                      type="number"
                      min={50}
                      max={Math.min(MAX_WITHDRAW, availableBal)}
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      placeholder="Enter amount"
                      style={{ paddingLeft: 52, fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                      autoFocus
                    />
                  </div>
                  {/* Quick amounts */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {[500, 1000, 2000, 5000].filter(v => v <= availableBal).map(v => (
                      <button key={v} type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }}
                        onClick={() => setWithdrawAmount(String(v))}>
                        {v.toLocaleString()}
                      </button>
                    ))}
                    {availableBal >= 50 && (
                      <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }}
                        onClick={() => setWithdrawAmount(String(Math.min(availableBal, MAX_WITHDRAW)))}>
                        {t('Max', 'Max')}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                  <button type="button" className="btn btn-ghost" onClick={resetWithdraw}>Cancel</button>
                  <button
                    type="button" className="btn btn-gold"
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={!canWithdraw}
                    onClick={() => setStep('confirm')}
                  >
                    {t('Continue', 'Endelea')} →
                  </button>
                </div>
              </>
            )}

            {step === 'confirm' && (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
                  {t('Confirm withdrawal', 'Thibitisha utotaji')}
                </div>

                <div style={{ marginTop: 18, padding: 16, borderRadius: 14, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('Amount', 'Kiasi')}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18 }}>KSh {amountNum.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('To', 'Kwenda')}</span>
                    <span style={{ fontWeight: 700 }}><MpesaBadge /> M-Pesa</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('Remaining balance', 'Salio lililobaki')}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fresh)' }}>
                      KSh {(availableBal - amountNum).toLocaleString()}
                    </span>
                  </div>
                </div>

                {withdrawError && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.08)', color: '#991b1b', fontSize: 13 }}>
                    ⚠ {withdrawError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep('enter_amount')}>← Back</button>
                  <button type="button" className="btn btn-gold" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => void handleWithdraw()}>
                    <MpesaBadge /> {t('Yes, withdraw now', 'Ndio, toa sasa')}
                  </button>
                </div>
              </>
            )}

            {step === 'processing' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 32 }}>⏳</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, marginTop: 12 }}>
                  {t('Processing…', 'Inashughulikiwa…')}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
                  {t('Sending to M-Pesa Daraja B2C', 'Inatumwa kwa M-Pesa Daraja B2C')}
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 16 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--fresh)', animation: `pulseDot 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {step === 'done' && withdrawResult && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 42 }}>{withdrawResult.ok ? '✅' : '❌'}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, marginTop: 12 }}>
                  {withdrawResult.ok
                    ? t('Withdrawal sent!', 'Pesa imetumwa!')
                    : t('Withdrawal failed', 'Utotaji umeshindwa')}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
                  {withdrawResult.message}
                </div>
                {withdrawResult.simulated && (
                  <div style={{ marginTop: 8, fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(217,119,6,0.1)', color: '#92400e' }}>
                    🧪 Simulated — set MPESA_SHORTCODE in .env for real M-Pesa
                  </div>
                )}
                <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Ref: {withdrawResult.ref}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 22, marginTop: 12, color: 'var(--fresh)' }}>
                  KSh {amountNum.toLocaleString()}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                  {t('New balance:', 'Salio jipya:')} KSh {availableBal.toLocaleString()}
                </div>
                <button type="button" className="btn btn-primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}
                  onClick={resetWithdraw}>
                  {t('Done', 'Imekamilika')}
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
