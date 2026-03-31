export function formatKsh(n: number): string {
  return `KSh ${Math.round(n).toLocaleString('en-KE')}`
}

export function formatPhone254(phone: string): string {
  const d = phone.replace(/\D/g, '')
  const local = d.length >= 9 ? d.slice(-9) : d
  const g = local.padStart(9, '0')
  return `${g.slice(0, 3)} ${g.slice(3, 6)} ${g.slice(6, 9)}`
}

export function formatPhone07(phone: string): string {
  const d = phone.replace(/\D/g, '')
  const tail = d.length >= 9 ? d.slice(-9) : d
  const rest = tail.startsWith('0') ? tail.slice(1) : tail
  const full = `0${rest.padStart(9, '0').slice(0, 9)}`
  return `${full.slice(0, 4)} ${full.slice(4, 7)} ${full.slice(7, 10)}`
}
