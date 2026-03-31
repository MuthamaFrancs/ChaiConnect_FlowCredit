import type { PaymentStatus } from '../types'

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  if (status === 'Paid')
    return (
      <span className="chip chip-paid">
        <MpesaDot ok />
        Paid
      </span>
    )
  if (status === 'Pending')
    return (
      <span className="chip chip-pending">
        <span className="dot" />
        Pending
      </span>
    )
  if (status === 'Failed')
    return (
      <span className="chip chip-failed">
        <MpesaDot />
        Failed
      </span>
    )
  return (
    <span className="chip chip-overdue">
      <MpesaDot />
      Overdue
    </span>
  )
}

function MpesaDot({ ok }: { ok?: boolean }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: ok ? 'var(--fresh)' : 'var(--soil)',
        display: 'inline-block',
      }}
    />
  )
}
