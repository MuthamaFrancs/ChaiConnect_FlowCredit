import type { Complaint, Delivery, Farmer, Loan, MpesaTx, PaymentRow } from '../types'

const API_BASE = (import.meta.env.VITE_API_URL as string) || ''

function buildUrl(path: string) {
  if (path.startsWith('http')) return path
  if (!API_BASE) return path
  const base = API_BASE.replace(/\/+$/, '')
  return `${base}${path.startsWith('/') ? path : '/' + path}`
}

// ── Token helpers ─────────────────────────────────────────
const TOKEN_KEY = 'chaiconnect_token'
export const getToken   = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken   = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

// Generic authenticated GET — returns null on any failure
async function get<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(buildUrl(path), { headers: authHeaders() })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

// Generic authenticated POST
async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(buildUrl(path), {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(body),
    })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

// ── Auth ──────────────────────────────────────────────────
export interface AuthUser {
  role: 'admin' | 'clerk' | 'officer' | 'farmer'
  name: string
  factoryId: string
  userId: string
}

export async function authLogin(payload: {
  role: AuthUser['role']
  loginId: string
  password?: string
  otp?: string
}): Promise<{ token: string; user: AuthUser }> {
  const r = await fetch(buildUrl('/api/auth/login'), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Login failed')
  }
  return r.json()
}

export async function authRequestOtp(phone: string): Promise<{ ok: boolean; message: string; debugOtp?: string }> {
  const r = await fetch(buildUrl('/api/auth/request-otp'), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ phone }),
  })
  if (!r.ok) throw new Error('OTP request failed')
  return r.json()
}

export async function authMe(): Promise<AuthUser | null> {
  const token = getToken()
  if (!token) return null
  try {
    const r = await fetch(buildUrl('/api/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) return null
    const body = await r.json() as { user: AuthUser }
    return body.user
  } catch {
    return null
  }
}

// ── Farmers ───────────────────────────────────────────────
export async function fetchFarmers(): Promise<Farmer[]> {
  const d = await get<{ farmers: Farmer[] }>('/api/farmers')
  return d?.farmers ?? []
}

export async function fetchFarmer(id: string): Promise<Farmer | null> {
  const d = await get<{ farmer: Farmer }>(`/api/farmers/${id}`)
  return d?.farmer ?? null
}

export async function registerFarmer(data: {
  name: string; phone: string; nationalId?: string
  factory?: string; zone?: string; cooperative?: string
}): Promise<{ farmer: Farmer } | null> {
  return post('/api/farmers', data)
}

// ── Farmer sub-resources ──────────────────────────────────
export async function fetchFarmerDeliveries(farmerId: string): Promise<Delivery[]> {
  const d = await get<{ deliveries: Delivery[] }>(`/api/farmers/${farmerId}/deliveries`)
  return d?.deliveries ?? []
}

export async function fetchFarmerLoans(farmerId: string): Promise<Loan[]> {
  const d = await get<{ loans: Loan[] }>(`/api/farmers/${farmerId}/loans`)
  return d?.loans ?? []
}

export async function fetchFarmerPayments(farmerId: string): Promise<PaymentRow[]> {
  const d = await get<{ payments: PaymentRow[] }>(`/api/farmers/${farmerId}/payments`)
  return d?.payments ?? []
}

// ── Stats & lists ─────────────────────────────────────────
export async function fetchStats(): Promise<{
  farmers: number; kgMonth: number; disbursedMonth: number; pendingPayments: number
}> {
  const d = await get<{ farmers: number; kgMonth: number; disbursedMonth: number; pendingPayments: number }>('/api/stats')
  return d ?? { farmers: 0, kgMonth: 0, disbursedMonth: 0, pendingPayments: 0 }
}

export async function fetchRecentPayments(): Promise<PaymentRow[]> {
  const d = await get<{ payments: PaymentRow[] }>('/api/payments/recent')
  return d?.payments ?? []
}

export async function fetchDeliveries(): Promise<Delivery[]> {
  const d = await get<{ deliveries: Delivery[] }>('/api/deliveries')
  return d?.deliveries ?? []
}

export async function fetchLoans(): Promise<Loan[]> {
  const d = await get<{ loans: Loan[] }>('/api/loans')
  return d?.loans ?? []
}

export async function fetchComplaints(): Promise<Complaint[]> {
  const d = await get<{ complaints: Complaint[] }>('/api/complaints')
  return d?.complaints ?? []
}

export async function fetchAlerts(): Promise<{ type: string; message: string; loanId: string }[]> {
  const d = await get<{ alerts: { type: string; message: string; loanId: string }[] }>('/api/alerts')
  return d?.alerts ?? []
}

export async function fetchFactoryLeaderboard(): Promise<{ name: string; kg: number }[]> {
  const d = await get<{ leaderboard: { name: string; kg: number }[] }>('/api/analytics/factory-leaderboard')
  return d?.leaderboard ?? []
}

export async function fetchChartActivity(): Promise<{ day: number; kg: number; payments: number }[]> {
  const d = await get<{ points: { day: number; kg: number; payments: number }[] }>('/api/analytics/delivery-activity')
  return d?.points ?? []
}

export async function fetchMpesaFeed(): Promise<MpesaTx[]> {
  const d = await get<{ transactions: MpesaTx[] }>('/api/mpesa/transactions')
  return d?.transactions ?? []
}

// ── Credit scoring ────────────────────────────────────────
export async function fetchCreditScore(farmerId: string): Promise<{
  score: number; grade: string; maxLoanAmount: number
  factors: Record<string, { score: number; max: number; detail: string }>
} | null> {
  return get(`/api/farmers/${farmerId}/credit-score`)
}

export async function recalculateAllScores(): Promise<{ recalculated: number; results: unknown[] } | null> {
  return post('/api/credit-scores/recalculate', {})
}

// ── Delivery creation ─────────────────────────────────────
export async function createDelivery(data: {
  farmerId: string; kg: number; grade?: string; rate?: number
}): Promise<{ delivery: Delivery; smsStatus: string } | null> {
  return post('/api/deliveries', data)
}

// ── M-Pesa ────────────────────────────────────────────────
export async function postDisburse(body: {
  phone: string; amount: number; farmerId?: string; farmerName?: string; remarks?: string
}): Promise<{
  ok: boolean; ref: string; simulated: boolean; message: string
  steps: { label: string; ms: number }[]; payload: Record<string, unknown>
} | null> {
  return post('/api/mpesa/disburse', body)
}

export async function postDisburseAll(farmerIds?: string[]): Promise<{
  ok: boolean; disbursed: number; results: unknown[]
} | null> {
  return post('/api/mpesa/disburse-all', { farmerIds })
}

export async function batchApprovePayments(
  paymentIds: string[], action: 'approve' | 'reject',
): Promise<{ ok: boolean; updated: number } | null> {
  return post('/api/payments/batch-approve', { paymentIds, action })
}

export async function simulateC2B(body: {
  phone: string; amount: number; reference?: string
}): Promise<{
  ok: boolean; transId: string; farmer: string; gross: number
  loanDeduction: number; net: number; loanIntercepted: boolean; message: string
} | null> {
  return post('/api/mpesa/simulate-c2b', body)
}

export async function checkTransactionStatus(transactionId: string): Promise<{
  result: unknown; transactionId: string
} | null> {
  return post('/api/mpesa/transaction-status', { transactionId })
}

export async function fetchSmsLog(): Promise<{
  id: string; phone: string; message: string; type: string; sentAt: string
}[]> {
  const d = await get<{ messages: { id: string; phone: string; message: string; type: string; sentAt: string }[] }>('/api/sms/log')
  return d?.messages ?? []
}

export async function postSimulateB2C(body: Record<string, unknown>): Promise<{
  steps: { label: string; ms: number }[]; payload: Record<string, unknown>
} | null> {
  return post('/api/mpesa/simulate-b2c', body)
}
