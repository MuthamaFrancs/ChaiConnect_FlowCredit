export function MpesaBadge({ title = 'M-Pesa' }: { title?: string }) {
  return (
    <span className="mpesa-badge" title={title} aria-hidden>
      M
    </span>
  )
}
