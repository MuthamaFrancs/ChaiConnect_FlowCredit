const BASE_URL = import.meta.env.VITE_API_URL;

import {
  CHART_DELIVERY_ACTIVITY,
  COMPLAINTS,
  DELIVERIES,
  FARMERS,
  LOANS,
  MPESA_FEED,
  RECENT_PAYMENTS,
} from "../data/seed";

const API_BASE = (import.meta.env.VITE_API_URL as string) || ''

function buildUrl(path: string) {
  if (path.startsWith('http')) return path
  if (!API_BASE) return path
  const base = API_BASE.replace(/\/+$/, '')
  return `${base}${path.startsWith('/') ? path : '/' + path}`
}

const api = async <T>(path: string): Promise<T | null> => {
  try {
    const r = await fetch(buildUrl(path));
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
};

export async function fetchFarmers() {
  const remote = await api<{ farmers: typeof FARMERS }>("/api/farmers");
  return remote?.farmers ?? FARMERS;
}

export async function fetchFarmer(id: string) {
  const remote = await api<{ farmer: (typeof FARMERS)[0] | null }>(
    `/api/farmers/${id}`,
  );
  if (remote?.farmer) return remote.farmer;
  return FARMERS.find((f) => f.id === id) ?? null;
}

export async function registerFarmer(data: {
  name: string;
  phone: string;
  nationalId?: string;
  factory?: string;
  zone?: string;
  cooperative?: string;
}) {
  try {
    const r = await fetch(buildUrl("/api/farmers"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) return null;
    return (await r.json()) as { farmer: (typeof FARMERS)[0] };
  } catch {
    return null;
  }
}

export async function fetchStats() {
  type Stats = {
    farmers: number;
    kgMonth: number;
    disbursedMonth: number;
    pendingPayments: number;
  };
  const remote = await api<Stats>("/api/stats");
  return (
    remote ?? {
      farmers: FARMERS.length,
      kgMonth: 48230,
      disbursedMonth: 2400000,
      pendingPayments: RECENT_PAYMENTS.filter((p) => p.status === "Pending")
        .length,
    }
  );
}

export async function fetchRecentPayments() {
  const remote = await api<{ payments: typeof RECENT_PAYMENTS }>(
    "/api/payments/recent",
  );
  return remote?.payments ?? RECENT_PAYMENTS;
}

export async function fetchDeliveries() {
  const remote = await api<{ deliveries: typeof DELIVERIES }>(
    "/api/deliveries",
  );
  return remote?.deliveries ?? DELIVERIES;
}

export async function fetchFarmerDeliveries(farmerId: string) {
  const remote = await api<{ deliveries: typeof DELIVERIES }>(
    `/api/farmers/${farmerId}/deliveries`,
  );
  return (
    remote?.deliveries ?? DELIVERIES.filter((d) => d.farmerId === farmerId)
  );
}

export async function fetchLoans() {
  const remote = await api<{ loans: typeof LOANS }>("/api/loans");
  return remote?.loans ?? LOANS;
}

export async function fetchFarmerLoans(farmerId: string) {
  const remote = await api<{ loans: typeof LOANS }>(
    `/api/farmers/${farmerId}/loans`,
  );
  return remote?.loans ?? LOANS.filter((l) => l.farmerId === farmerId);
}

export async function fetchFarmerPayments(farmerId: string) {
  const remote = await api<{ payments: typeof RECENT_PAYMENTS }>(
    `/api/farmers/${farmerId}/payments`,
  );
  return (
    remote?.payments ?? RECENT_PAYMENTS.filter((p) => p.farmerId === farmerId)
  );
}

export async function fetchMpesaFeed() {
  const remote = await api<{ transactions: typeof MPESA_FEED }>(
    "/api/mpesa/transactions",
  );
  return remote?.transactions ?? MPESA_FEED;
}

export async function fetchComplaints() {
  const remote = await api<{ complaints: typeof COMPLAINTS }>(
    "/api/complaints",
  );
  return remote?.complaints ?? COMPLAINTS;
}

export async function fetchAlerts() {
  const remote = await api<{
    alerts: { type: string; message: string; loanId: string }[];
  }>("/api/alerts");
  return (
    remote?.alerts ?? [
      {
        type: "overdue",
        message: "Overdue repayment — Peter Mwangi (FlowCredit)",
        loanId: "L4",
      },
    ]
  );
}

export async function fetchFactoryLeaderboard() {
  const remote = await api<{ leaderboard: { name: string; kg: number }[] }>(
    "/api/analytics/factory-leaderboard",
  );
  return (
    remote?.leaderboard ?? [
      { name: "Kiambu Tea Factory", kg: 48200 },
      { name: "Meru Coffee Factory", kg: 38100 },
    ]
  );
}

export async function fetchChartActivity() {
  const remote = await api<{ points: typeof CHART_DELIVERY_ACTIVITY }>(
    "/api/analytics/delivery-activity",
  );
  return remote?.points ?? CHART_DELIVERY_ACTIVITY;
}

// ── Credit Scoring ──────────────────────────────────────
export async function fetchCreditScore(farmerId: string) {
  const remote = await api<{
    score: number;
    grade: string;
    maxLoanAmount: number;
    factors: Record<string, { score: number; max: number; detail: string }>;
  }>(`/api/farmers/${farmerId}/credit-score`);
  return remote;
}

export async function recalculateAllScores() {
  try {
    const r = await fetch("/api/credit-scores/recalculate", { method: "POST" });
    if (!r.ok) return null;
    return (await r.json()) as { recalculated: number; results: any[] };
  } catch {
    return null;
  }
}

// ── Delivery creation (triggers SMS) ─────────────────
export async function createDelivery(data: {
  farmerId: string;
  kg: number;
  grade?: string;
  rate?: number;
}) {
  try {
    const r = await fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) return null;
    return (await r.json()) as { delivery: any; smsStatus: string };
  } catch {
    return null;
  }
}

// ── M-Pesa B2C ──────────────────────────────────────────
export async function postDisburse(body: {
  phone: string;
  amount: number;
  farmerId?: string;
  farmerName?: string;
  remarks?: string;
}) {
  try {
    const r = await fetch(buildUrl("/api/mpesa/disburse"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as {
      ok: boolean;
      ref: string;
      simulated: boolean;
      message: string;
      steps: { label: string; ms: number }[];
      payload: Record<string, unknown>;
    };
  } catch {
    return null;
  }
}

// ── Bulk Disburse All ────────────────────────────────────
export async function postDisburseAll(farmerIds?: string[]) {
  try {
    const r = await fetch(buildUrl("/api/mpesa/disburse-all"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ farmerIds }),
    });
    if (!r.ok) return null;
    return (await r.json()) as {
      ok: boolean;
      disbursed: number;
      results: any[];
    };
  } catch {
    return null;
  }
}

// ── Batch Approval ───────────────────────────────────────
export async function batchApprovePayments(
  paymentIds: string[],
  action: "approve" | "reject",
) {
  try {
    const r = await fetch("/api/payments/batch-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIds, action }),
    });
    if (!r.ok) return null;
    return (await r.json()) as { ok: boolean; updated: number };
  } catch {
    return null;
  }
}

// ── C2B Simulation (repayment intercept demo) ───────────
export async function simulateC2B(body: {
  phone: string;
  amount: number;
  reference?: string;
}) {
  try {
    const r = await fetch(buildUrl("/api/mpesa/simulate-c2b"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as {
      ok: boolean;
      transId: string;
      farmer: string;
      gross: number;
      loanDeduction: number;
      net: number;
      loanIntercepted: boolean;
      message: string;
    };
  } catch {
    return null;
  }
}

// ── Transaction Status ──────────────────────────────────
export async function checkTransactionStatus(transactionId: string) {
  try {
    const r = await fetch(buildUrl("/api/mpesa/transaction-status"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId }),
    });
    if (!r.ok) return null;
    return (await r.json()) as { result: any; transactionId: string };
  } catch {
    return null;
  }
}

// ── SMS Log ──────────────────────────────────────────────
export async function fetchSmsLog() {
  const remote = await api<{
    messages: {
      id: string;
      phone: string;
      message: string;
      type: string;
      sentAt: string;
    }[];
  }>("/api/sms/log");
  return remote?.messages ?? [];
}

export async function postSimulateB2C(body: Record<string, unknown>) {
  try {
    const r = await fetch(buildUrl("/api/mpesa/simulate-b2c"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as {
      steps: { label: string; ms: number }[];
      payload: Record<string, unknown>;
    };
  } catch {
    return {
      steps: [
        { label: "OAuth", ms: 400 },
        { label: "B2C", ms: 1200 },
        { label: "Webhook", ms: 800 },
        { label: "Ledger", ms: 400 },
      ],
      payload: body,
    };
  }
}
