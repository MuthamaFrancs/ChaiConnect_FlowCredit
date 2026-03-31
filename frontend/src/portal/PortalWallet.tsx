import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MpesaBadge } from '../components/MpesaBadge'
import { Money } from '../components/Money'
import { useApp } from '../context/AppProvider'
import { PortalCard, PortalPageTitle } from './PortalChrome'
import { fetchFarmerPayments, fetchFarmerLoans, fetchCreditScore } from '../lib/api'

export function PortalWallet() {
  const {
    t,
    pendingFarmerDisbursements,
    farmerCreditScore,
    acceptFarmerDisbursement,
    pushToast,
  } = useApp()
  const farmerId = 'wanjiku' // demo farmer
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // Real data from DB
  const [payments, setPayments] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [creditData, setCreditData] = useState<{
    score: number; grade: string; maxLoanAmount: number;
    factors: Record<string, { score: number; max: number; detail: string }>;
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const [p, l, c] = await Promise.all([
        fetchFarmerPayments(farmerId),
        fetchFarmerLoans(farmerId),
        fetchCreditScore(farmerId),
      ])
      setPayments(p)
      setLoans(l)
      setCreditData(c)
      setLoading(false)
    })()
  }, [])

  const realScore = creditData?.score ?? farmerCreditScore
  const grade = creditData?.grade ?? 'B'
  const maxLoan = creditData?.maxLoanAmount ?? 25000

  const activeLoan = loans.find((l: any) => l.status === 'Active')
  const pending = pendingFarmerDisbursements.find(p => p.id === confirmId)

  return (
    <div>
      <PortalPageTitle
        title={t('Wallet · M-Pesa & score', 'Wallet · M-Pesa na alama')}
        subtitle={t(
          'Accept money here. Records feed your FlowCredit score.',
          'Thibitisha pesa hapa. Rekodi huboresha alama ya FlowCredit.',
        )}
      />

      {/* ── FlowCredit Score Card ── */}
      <PortalCard accent="gold" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              FlowCredit score
            </div>
            <div className="mono" style={{ fontSize: 36, fontWeight: 900, marginTop: 4, color: 'var(--forest)' }}>
              {loading ? '…' : realScore}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {t(`Grade ${grade} · Max loan KSh ${maxLoan.toLocaleString()}`, `Daraja ${grade} · Mkopo max KSh ${maxLoan.toLocaleString()}`)}
            </div>
          </div>
          <Link className="btn btn-ghost" to="/portal/loans" style={{ flexShrink: 0 }}>
            {t('Loans', 'Mikopo')} →
          </Link>
        </div>

        {/* Real credit factors */}
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

      {/* ── Active Loan Repayment Status ── */}
      {activeLoan && (
        <PortalCard style={{ marginBottom: 14, borderColor: 'rgba(212,160,23,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                Active loan
              </div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>
                <Money amount={Number(activeLoan.amount)} />
              </div>
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

      {/* ── Accept Disbursements ── */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginBottom: 8 }}>
        {t('Accept disbursements', 'Kubali malipo')}
      </div>
      {pendingFarmerDisbursements.length === 0 ? (
        <PortalCard>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
            {t(
              'No money waiting. When the factory or FlowCredit sends B2C, it will show here for you to confirm.',
              'Hakuna pesa inayosubiri. M-Pesa itapoingia, itaonekana hapa.',
            )}
          </p>
        </PortalCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendingFarmerDisbursements.map(p => (
            <PortalCard key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <MpesaBadge />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{p.label}</div>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>
                      <Money amount={p.amount} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                      {t('Ref', 'Rejea')}: {p.ref} ·{' '}
                      {p.source === 'flowcredit_b2c' ? 'FlowCredit B2C' : t('Cooperative', 'Msingi')}
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn-gold" onClick={() => setConfirmId(p.id)}>
                  {t('Accept in app', 'Thibitisha')}
                </button>
              </div>
            </PortalCard>
          ))}
        </div>
      )}

      {/* ── Payment History from DB ── */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, margin: '20px 0 8px' }}>
        {t('Payment history (from Neon DB)', 'Historia ya malipo (kutoka DB)')}
      </div>
      <PortalCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-zebra" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'var(--zebra-a)' }}>
                <th style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {t('Date', 'Tarehe')}
                </th>
                <th style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {t('Gross', 'Jumla')}
                </th>
                <th style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {t('Deductions', 'Makato')}
                </th>
                <th style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {t('Net', 'Halisi')}
                </th>
                <th style={{ padding: '10px 12px', fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {t('M-Pesa Ref', 'Rejea')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading from database…</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
                  {t('No payments yet', 'Hakuna malipo bado')}
                </td></tr>
              ) : payments.map((row: any) => (
                <tr key={row.id}>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{row.time}</td>
                  <td className="mono" style={{ padding: '10px 12px' }}><Money amount={Number(row.amount)} /></td>
                  <td className="mono" style={{ padding: '10px 12px', color: Number(row.deductions) > 0 ? '#dc2626' : 'var(--muted)' }}>
                    {Number(row.deductions) > 0 ? '−' : ''}<Money amount={Number(row.deductions || 0)} />
                  </td>
                  <td className="mono" style={{ padding: '10px 12px', color: 'var(--fresh)', fontWeight: 700 }}>
                    <Money amount={Number(row.net || row.amount)} />
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {row.mpesaRef || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalCard>

      {/* ── Confirm Modal ── */}
      {confirmId && pending && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 16 }}
          onMouseDown={() => setConfirmId(null)}
        >
          <div className="card-surface" style={{ width: 'min(400px,100%)', padding: 20 }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>
              {t('Confirm receipt', 'Thibitisha malipo')}
            </div>
            <p style={{ margin: '12px 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
              {t(
                'You confirm this amount hit your M-Pesa. We will add it to your ledger and refresh your FlowCredit score.',
                'Unathibitisha kuwa kiasi kimeingia M-Pesa. Tutaihifadhi kwenye historia ya alama.',
              )}
            </p>
            <div className="mono" style={{ fontSize: 26, fontWeight: 900 }}>
              <Money amount={pending.amount} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmId(null)}>
                {t('Cancel', 'Ghairi')}
              </button>
              <button
                type="button" className="btn btn-gold"
                style={{ flex: 1, justifyContent: 'center', minWidth: 140 }}
                onClick={() => {
                  acceptFarmerDisbursement(pending.id)
                  setConfirmId(null)
                  pushToast(t('Confirmed! Score will update on next refresh.', 'Imethibitishwa!'))
                }}
              >
                <MpesaBadge />
                {t('Yes, received', 'Ndio, nimepokea')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
