export type Role = 'admin' | 'clerk' | 'officer' | 'farmer'

export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Overdue'

export type LoanFlowStatus =
  | 'eligible'
  | 'pending'
  | 'active'
  | 'active_overdue'
  | 'completed'

export interface Farmer {
  id: string
  name: string
  phone: string
  memberNo: string
  factory: string
  zone: string
  cooperative: string
  creditScore: number
  creditTier: 'A' | 'B' | 'C'
  loanFlow: LoanFlowStatus
  gradeTrend: 'A' | 'B' | 'C'
  activeSince: string
  totalKg: number
  totalEarned: number
}

export interface Delivery {
  id: string
  farmerId: string
  date: string
  kg: number
  grade: 'A' | 'B' | 'C'
  rate: number
  gross: number
  deductions: number
  net: number
  status: PaymentStatus | 'Graded'
}

export interface PaymentRow {
  id: string
  farmerId: string
  farmer: string
  phone: string
  amount: number
  deductions: number
  net: number
  status: PaymentStatus
  time: string
  mpesaRef?: string
}

export interface Loan {
  id: string
  farmerId: string
  farmerName: string
  amount: number
  interestPct: number
  status: 'Eligible' | 'Active' | 'Overdue' | 'Completed'
  disbursedAt?: string
  repaidFraction: number
  nextDue?: string
  instalments: number
}

export interface MpesaTx {
  id: string
  type: 'B2C' | 'C2B' | 'Validation' | 'Callback'
  farmer?: string
  phone?: string
  amount: number
  direction: 'in' | 'out'
  code: string
  ts: string
  pending?: boolean
  raw: Record<string, unknown>
}

export interface Complaint {
  id: string
  farmer: string
  issue: string
  status: 'Open' | 'Under Review' | 'Resolved'
  date: string
}

/** Money queued for farmer to acknowledge in-app (after staff B2C or co-op net). */
export interface PendingFarmerDisbursement {
  id: string
  amount: number
  label: string
  ref: string
  source: 'flowcredit_b2c' | 'coop_payment'
  createdAt: string
}

/** Row in the M-Pesa-based history that drives FlowCredit scoring. */
export interface CreditLedgerLine {
  id: string
  date: string
  description: string
  amount: number
  direction: 'in' | 'out'
  /** Human-readable reason this transaction helps or hurts the score */
  scoringSignal: string
}
