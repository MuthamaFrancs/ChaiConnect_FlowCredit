import { useApp } from '../context/AppProvider'

export function ToastHost() {
  const { toasts, dismissToast } = useApp()
  if (!toasts.length) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card-surface"
          style={{
            padding: '12px 14px',
            animation: 'pageIn 0.2s ease-out both',
            borderLeft: '4px solid var(--fresh)',
            cursor: 'pointer',
          }}
          onClick={() => dismissToast(t.id)}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.text}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Tap to dismiss</div>
        </div>
      ))}
    </div>
  )
}
