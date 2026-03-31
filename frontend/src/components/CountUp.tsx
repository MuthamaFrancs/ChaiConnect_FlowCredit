import { useEffect, useState } from 'react'

export function CountUpNumber({
  value,
  durationMs = 700,
  formatter = (n: number) => String(Math.round(n)),
}: {
  value: number
  durationMs?: number
  formatter?: (n: number) => string
}) {
  const [n, setN] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) * (1 - t)
      setN(value * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])

  return <span>{formatter(n)}</span>
}
