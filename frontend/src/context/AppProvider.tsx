import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CreditLedgerLine, PendingFarmerDisbursement, Role } from '../types'
import { authLogin, authMe, clearToken, setToken, type AuthUser as ApiAuthUser } from '../lib/api'

export type Lang = 'en' | 'sw'
export type ThemeMode = 'light' | 'dark'

export interface AuthUser {
  role: Role
  name: string
  factoryId: string
  userId?: string
}

export interface ToastMessage {
  id: string
  text: string
}

const LS_PLATFORM = 'chaiconnect_platform'

function defaultPlatform() {
  const today = new Date().toISOString().slice(0, 10)
  return {
    pendingFarmerDisbursements: [
      {
        id: 'pd-coop-demo',
        amount: 5200,
        label: 'Net cooperative payment — March grading',
        ref: 'COOP-MAR-02',
        source: 'coop_payment' as const,
        createdAt: today,
      },
    ] satisfies PendingFarmerDisbursement[],
    creditLedgerLines: [
      {
        id: 'cl1',
        date: '2025-02-15',
        description: 'Co-op payment received',
        amount: 18500,
        direction: 'in' as const,
        scoringSignal: '+ Stable monthly inflow',
      },
      {
        id: 'cl2',
        date: '2025-01-20',
        description: 'M-Pesa B2C (FlowCredit trial)',
        amount: 5000,
        direction: 'in' as const,
        scoringSignal: '+ On-time B2C confirmation',
      },
      {
        id: 'cl3',
        date: '2024-12-10',
        description: 'Service fee (SMS)',
        amount: 120,
        direction: 'out' as const,
        scoringSignal: 'Small recurring debits OK',
      },
    ] satisfies CreditLedgerLine[],
    farmerCreditScore: 82,
  }
}

function loadPlatform() {
  try {
    const raw = localStorage.getItem(LS_PLATFORM)
    if (raw) {
      const j = JSON.parse(raw) as {
        pendingFarmerDisbursements?: PendingFarmerDisbursement[]
        creditLedgerLines?: CreditLedgerLine[]
        farmerCreditScore?: number
      }
      if (
        Array.isArray(j.pendingFarmerDisbursements) &&
        Array.isArray(j.creditLedgerLines) &&
        typeof j.farmerCreditScore === 'number'
      ) {
        return {
          pendingFarmerDisbursements: j.pendingFarmerDisbursements,
          creditLedgerLines: j.creditLedgerLines,
          farmerCreditScore: j.farmerCreditScore,
        }
      }
    }
  } catch {
    /* ignore */
  }
  return defaultPlatform()
}

interface AppCtx {
  lang: Lang
  setLang: (l: Lang) => void
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggleTheme: () => void
  auth: AuthUser | null
  /** login() now calls the backend and stores JWT */
  login: (payload: { role: Role; loginId: string; password?: string; otp?: string }) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
  toasts: ToastMessage[]
  pushToast: (text: string) => void
  dismissToast: (id: string) => void
  t: (en: string, sw: string) => string
  pendingFarmerDisbursements: PendingFarmerDisbursement[]
  creditLedgerLines: CreditLedgerLine[]
  farmerCreditScore: number
  acceptFarmerDisbursement: (id: string) => void
  /** After staff completes a simulated B2C, farmer sees this in Wallet to confirm. */
  queueStaffB2CForFarmer: (p: {
    amount: number
    label: string
    ref: string
  }) => void
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return localStorage.getItem('chaiconnect_theme') === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('chaiconnect_theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }, [])

  // ── Auth: restore session from stored token on mount
  const [auth, setAuth] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    authMe().then((user) => {
      if (user) {
        setAuth({ role: user.role as Role, name: user.name, factoryId: user.factoryId, userId: user.userId })
      } else {
        // Try legacy localStorage fallback
        try {
          const raw = localStorage.getItem('chaiconnect_auth')
          if (raw) setAuth(JSON.parse(raw) as AuthUser)
        } catch { /* ignore */ }
      }
      setAuthLoading(false)
    })
  }, [])
  const [searchOpen, setSearchOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const [pendingFarmerDisbursements, setPendingFarmerDisbursements] = useState<
    PendingFarmerDisbursement[]
  >(() => loadPlatform().pendingFarmerDisbursements)
  const [creditLedgerLines, setCreditLedgerLines] = useState<CreditLedgerLine[]>(
    () => loadPlatform().creditLedgerLines,
  )
  const [farmerCreditScore, setFarmerCreditScore] = useState(
    () => loadPlatform().farmerCreditScore,
  )

  const login = useCallback(async (
    payload: { role: Role; loginId: string; password?: string; otp?: string }
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { token, user } = await authLogin(payload)
      setToken(token)
      const authUser: AuthUser = {
        role: user.role as Role,
        name: user.name,
        factoryId: user.factoryId,
        userId: user.userId,
      }
      setAuth(authUser)
      // Keep legacy key for backward compat with other components that read it
      localStorage.setItem('chaiconnect_auth', JSON.stringify(authUser))
      return { ok: true }
    } catch (err: unknown) {
      // Backend unreachable — fall back to demo mode
      const errMsg = err instanceof Error ? err.message : 'Login failed'
      console.warn('Backend login failed, using demo fallback:', errMsg)

      const DEMO: Record<string, AuthUser> = {
        'admin@chaiconnect.co.ke': { role: 'admin',   name: 'Makena Wanjiru',   factoryId: 'kiambu' },
        'KC-2044':                 { role: 'clerk',   name: 'Juma Otieno',      factoryId: 'kiambu' },
        'EXT-889':                 { role: 'officer', name: 'Wambui Extension', factoryId: 'kiambu' },
        '0712345678':              { role: 'farmer',  name: 'Wanjiku Kamau',    factoryId: 'kiambu' },
      }
      const demo = DEMO[payload.loginId]
      if (demo && demo.role === payload.role) {
        // Check demo password
        const DEMO_PWD: Record<string, string> = {
          'admin@chaiconnect.co.ke': 'Admin@1234',
          'KC-2044': '2044',
          'EXT-889': 'Officer@1234',
          '0712345678': '5921',  // OTP
        }
        const expectedPwd = DEMO_PWD[payload.loginId]
        const provided = payload.password || payload.otp || ''
        if (provided !== expectedPwd) {
          return { ok: false, error: 'Invalid credentials' }
        }
        setAuth(demo)
        localStorage.setItem('chaiconnect_auth', JSON.stringify(demo))
        return { ok: true }
      }
      return { ok: false, error: errMsg }
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    localStorage.removeItem('chaiconnect_auth')
    setAuth(null)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_PLATFORM,
        JSON.stringify({
          pendingFarmerDisbursements,
          creditLedgerLines,
          farmerCreditScore,
        }),
      )
    } catch {
      /* ignore */
    }
  }, [pendingFarmerDisbursements, creditLedgerLines, farmerCreditScore])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const login = useCallback((u: AuthUser) => setAuth(u), [])
  const logout = useCallback(() => setAuth(null), [])

  const pushToast = useCallback((text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((t) => [...t, { id, text }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 6000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const tr = useCallback(
    (en: string, sw: string) => (lang === 'sw' ? sw : en),
    [lang],
  )

  const acceptFarmerDisbursement = useCallback(
    (id: string) => {
      const row = pendingFarmerDisbursements.find((p) => p.id === id)
      if (!row) return
      const lineId = `cl-${Date.now()}`
      const line: CreditLedgerLine = {
        id: lineId,
        date: new Date().toISOString().slice(0, 10),
        description: `Accepted: ${row.label}`,
        amount: row.amount,
        direction: 'in',
        scoringSignal:
          row.source === 'flowcredit_b2c'
            ? '+ B2C confirmed — improves FlowCredit limit'
            : '+ Cooperative inflow acknowledged — repayment signal',
      }
      setPendingFarmerDisbursements((p) => p.filter((x) => x.id !== id))
      setCreditLedgerLines((l) => [line, ...l])
      setFarmerCreditScore((s) => Math.min(100, s + 2))
      pushToast(
        lang === 'sw'
          ? 'Imethibitishwa. Rekodi imeongezwa kwa alama ya mkopo.'
          : 'Confirmed. Record added to your credit history.',
      )
    },
    [lang, pendingFarmerDisbursements, pushToast],
  )

  const queueStaffB2CForFarmer = useCallback(
    (p: { amount: number; label: string; ref: string }) => {
      const item: PendingFarmerDisbursement = {
        id: `pd-b2c-${Date.now()}`,
        amount: p.amount,
        label: p.label,
        ref: p.ref,
        source: 'flowcredit_b2c',
        createdAt: new Date().toISOString().slice(0, 10),
      }
      setPendingFarmerDisbursements((list) => [...list, item])
      pushToast(
        lang === 'sw'
          ? 'B2C imehifadhiwa. Mkulima ataona kwenye Wallet kuidhinisha.'
          : 'B2C queued. Farmer can accept in Wallet (M-Pesa & score).',
      )
    },
    [lang, pushToast],
  )

  const value = useMemo<AppCtx>(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      toggleTheme,
      auth,
      login,
      logout,
      searchOpen,
      setSearchOpen,
      toasts,
      pushToast,
      dismissToast,
      t: tr,
      pendingFarmerDisbursements,
      creditLedgerLines,
      farmerCreditScore,
      acceptFarmerDisbursement,
      queueStaffB2CForFarmer,
    }),
    [
      acceptFarmerDisbursement,
      auth,
      creditLedgerLines,
      dismissToast,
      farmerCreditScore,
      lang,
      login,
      logout,
      pendingFarmerDisbursements,
      pushToast,
      queueStaffB2CForFarmer,
      searchOpen,
      theme,
      toasts,
      tr,
      toggleTheme,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const x = useContext(Ctx)
  if (!x) throw new Error('useApp needs AppProvider')
  return x
}
