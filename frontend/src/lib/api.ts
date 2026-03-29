import {
  CHART_DELIVERY_ACTIVITY,
  COMPLAINTS,
  DELIVERIES,
  FARMERS,
  LOANS,
  MPESA_FEED,
  RECENT_PAYMENTS,
} from '../data/seed'

const api = async <T>(path: string): Promise<T | null> => {
  try {
    const r = await fetch(path)
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

export async function fetchFarmers() {
  const remote = await api<{ farmers: typeof FARMERS }>('/api/farmers')
  return remote?.farmers ?? FARMERS
}

export async function fetchFarmer(id: string) {
  const remote = await api<{ farmer: (typeof FARMERS)[0] | null }>(`/api/farmers/${id}`)
  if (remote?.farmer) return remote.farmer
  return FARMERS.find((f) => f.id === id) ?? null
}

export async function fetchStats() {
  type Stats = { farmers: number; kgMonth: number; disbursedMonth: number; pendingPayments: number }
  const remote = await api<Stats>('/api/stats')
  return remote ?? {
    farmers: FARMERS.length,
    kgMonth: 48230,
    disbursedMonth: 2400000,
    pendingPayments: RECENT_PAYMENTS.filter((p) => p.status === 'Pending').length,
  }
}

export async function fetchRecentPayments() {
  const remote = await api<{ payments: typeof RECENT_PAYMENTS }>('/api/payments/recent')
  return remote?.payments ?? RECENT_PAYMENTS
}

export async function fetchDeliveries() {
  const remote = await api<{ deliveries: typeof DELIVERIES }>('/api/deliveries')
  return remote?.deliveries ?? DELIVERIES
}

export async function fetchLoans() {
  const remote = await api<{ loans: typeof LOANS }>('/api/loans')
  return remote?.loans ?? LOANS
}

export async function fetchMpesaFeed() {
  const remote = await api<{ transactions: typeof MPESA_FEED }>('/api/mpesa/transactions')
  return remote?.transactions ?? MPESA_FEED
}

export async function fetchComplaints() {
  const remote = await api<{ complaints: typeof COMPLAINTS }>('/api/complaints')
  return remote?.complaints ?? COMPLAINTS
}

export async function fetchChartActivity() {
  const remote = await api<{ points: typeof CHART_DELIVERY_ACTIVITY }>('/api/analytics/delivery-activity')
  return remote?.points ?? CHART_DELIVERY_ACTIVITY
}

/** Real B2C disbursement — calls Daraja sandbox (with simulated fallback) */
export async function postDisburse(body: {
  phone: string
  amount: number
  farmerId?: string
  farmerName?: string
  remarks?: string
}) {
  try {
    const r = await fetch('/api/mpesa/disburse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) return null
    return (await r.json()) as {
      ok: boolean
      ref: string
      simulated: boolean
      message: string
      steps: { label: string; ms: number }[]
      payload: Record<string, unknown>
    }
  } catch {
    return null
  }
}

/** Legacy simulated B2C — used as fallback if /api/mpesa/disburse is unreachable */
export async function postSimulateB2C(body: Record<string, unknown>) {
  try {
    const r = await fetch('/api/mpesa/simulate-b2c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) return null
    return (await r.json()) as { steps: { label: string; ms: number }[]; payload: Record<string, unknown> }
  } catch {
    return {
      steps: [
        { label: 'Request OAuth token from Daraja', ms: 400 },
        { label: 'POST /mpesa/b2c/v3/paymentrequest', ms: 1200 },
        { label: 'Receive webhook callback', ms: 800 },
        { label: 'Record disbursement + repayment schedule', ms: 400 },
      ],
      payload: body,
    }
  }
}
