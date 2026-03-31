/**
 * Shared layout primitives for the farmer mobile portal.
 * Visual language matches the operations shell: ChaiConnect tokens, forest/gold accents, M-Pesa cues.
 */
import type { CSSProperties, ReactNode } from 'react'
import { BrandMark } from '../components/AppShell'

export function PortalEyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        fontFamily: 'var(--font-display)',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  )
}

export function PortalPageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header style={{ marginBottom: 16 }}>
      <PortalEyebrow>ChaiConnect · Farmer</PortalEyebrow>
      <h1 style={{ fontSize: 'clamp(1.35rem, 4.2vw, 1.6rem)', marginBottom: subtitle ? 6 : 0 }}>{title}</h1>
      {subtitle ? <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, lineHeight: 1.45 }}>{subtitle}</p> : null}
    </header>
  )
}

export function PortalCard({
  children,
  accent,
  noPadding,
  style,
  className,
}: {
  children: ReactNode
  /** 'gold' | 'fresh' | 'forest' — top border accent */
  accent?: 'gold' | 'fresh' | 'forest'
  noPadding?: boolean
  style?: CSSProperties
  className?: string
}) {
  const borderTop =
    accent === 'gold' ? '4px solid var(--gold)' : accent === 'fresh' ? '4px solid var(--fresh)' : accent === 'forest' ? '4px solid var(--forest)' : undefined
  return (
    <div className={`card-surface ${className ?? ''}`} style={{ padding: noPadding ? 0 : 16, borderTop, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

export function PortalBrandRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <BrandMark small />
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em' }}>ChaiConnect</div>
        <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Farmer portal</div>
      </div>
    </div>
  )
}

/** Grade-colored left stripe, same idea as delivery feed in operations. */
export function PortalDeliveryRow({
  grade,
  children,
}: {
  grade: 'A' | 'B' | 'C'
  children: ReactNode
}) {
  const color = grade === 'A' ? 'var(--fresh)' : grade === 'B' ? '#d97706' : '#b91c1c'
  return (
    <div
      className="card-surface"
      style={{
        padding: 14,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        borderLeft: `4px solid ${color}`,
      }}
    >
      {children}
    </div>
  )
}
