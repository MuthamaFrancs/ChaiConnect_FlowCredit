import { formatKsh } from '../lib/format'

export function Money({
  amount,
  className = '',
  gold,
}: {
  amount: number
  className?: string
  gold?: boolean
}) {
  return (
    <span
      className={`money ${className}`}
      style={gold ? { color: 'var(--gold)' } : undefined}
    >
      {formatKsh(amount)}
    </span>
  )
}
