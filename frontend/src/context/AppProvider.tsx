/**
 * AppProvider — State management for ChaiConnect.
 *
 * Uses a lightweight context + useReducer pattern that mirrors
 * the Zustand API surface exactly. Once `npm install zustand`
 * succeeds on your machine, this file can be swapped for the
 * Zustand version without touching any component.
 *
 * Exports:
 *  useAppStore()    — auth, theme, lang, toasts, searchOpen
 *  useFarmerStore() — farmer portal credit & disbursement state
 *  useApp()         — backward-compat shim (reads both stores)
 *  AppProvider      — wraps the app, restores JWT session, binds keyboard
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import type { CreditLedgerLine, PendingFarmerDisbursement, Role } from '../types'
import { authLogin, authMe, clearToken, setToken } from '../lib/api'

export type Lang      = 'en' | 'sw'
export type ThemeMode = 'light' | 'dark'

export interface AuthUser {
  role:      Role
  name:      string
  factoryId: string
  userId?:   string
}

export interface ToastMessage {
  id:   string
  text: string
}

// ─────────────────────────────────────────────────────────────
//  Persistence helpers
// ─────────────────────────────────────────────────────────────
function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}
function lsDel(key: string) {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────
//  APP STORE
// ─────────────────────────────────────────────────────────────
interface AppState {
  auth:       AuthUser | null
  theme:      ThemeMode
  lang:       Lang
  searchOpen: boolean
  toasts:     ToastMessage[]
}

type AppAction =
  | { type: 'SET_AUTH';        payload: AuthUser | null }
  | { type: 'SET_THEME';       payload: ThemeMode }
  | { type: 'SET_LANG';        payload: Lang }
  | { type: 'SET_SEARCH';      payload: boolean }
  | { type: 'PUSH_TOAST';      payload: ToastMessage }
  | { type: 'DISMISS_TOAST';   payload: string }

function appReducer(s: AppState, a: AppAction): AppState {
  switch (a.type) {
    case 'SET_AUTH':       return { ...s, auth: a.payload }
    case 'SET_THEME':      return { ...s, theme: a.payload }
    case 'SET_LANG':       return { ...s, lang: a.payload }
    case 'SET_SEARCH':     return { ...s, searchOpen: a.payload }
    case 'PUSH_TOAST':     return { ...s, toasts: [...s.toasts, a.payload] }
    case 'DISMISS_TOAST':  return { ...s, toasts: s.toasts.filter(t => t.id !== a.payload) }
    default:               return s
  }
}

const initialAppState: AppState = {
  auth:       null,
  theme:      lsGet<ThemeMode>('cc_theme', 'light'),
  lang:       lsGet<Lang>('cc_lang', 'en'),
  searchOpen: false,
  toasts:     [],
}

interface AppStoreCtx extends AppState {
  setAuth:       (u: AuthUser | null) => void
  setTheme:      (t: ThemeMode) => void
  toggleTheme:   () => void
  setLang:       (l: Lang) => void
  setSearchOpen: (v: boolean) => void
  pushToast:     (text: string) => void
  dismissToast:  (id: string) => void
  login:         (p: { role: Role; loginId: string; password?: string; otp?: string }) => Promise<{ ok: boolean; error?: string }>
  logout:        () => void
}

const AppCtx = createContext<AppStoreCtx | null>(null)

// ─────────────────────────────────────────────────────────────
//  FARMER STORE
// ─────────────────────────────────────────────────────────────
interface FarmerState {
  pendingFarmerDisbursements: PendingFarmerDisbursement[]
  creditLedgerLines:          CreditLedgerLine[]
  farmerCreditScore:          number
}

type FarmerAction =
  | { type: 'ACCEPT';  payload: string }
  | { type: 'QUEUE';   payload: PendingFarmerDisbursement }
  | { type: 'ADD_LINE';payload: CreditLedgerLine }
  | { type: 'SCORE';   payload: number }

function farmerReducer(s: FarmerState, a: FarmerAction): FarmerState {
  switch (a.type) {
    case 'ACCEPT': return {
      ...s,
      pendingFarmerDisbursements: s.pendingFarmerDisbursements.filter(x => x.id !== a.payload),
    }
    case 'QUEUE': return {
      ...s,
      pendingFarmerDisbursements: [...s.pendingFarmerDisbursements, a.payload],
    }
    case 'ADD_LINE': return {
      ...s,
      creditLedgerLines: [a.payload, ...s.creditLedgerLines],
    }
    case 'SCORE': return { ...s, farmerCreditScore: a.payload }
    default: return s
  }
}

const initialFarmerState: FarmerState = lsGet('cc_farmer', {
  pendingFarmerDisbursements: [],
  creditLedgerLines:          [],
  farmerCreditScore:          50,
})

interface FarmerStoreCtx extends FarmerState {
  acceptFarmerDisbursement: (id: string) => void
  queueStaffB2CForFarmer:   (p: { amount: number; label: string; ref: string }) => void
}

const FarmerCtx = createContext<FarmerStoreCtx | null>(null)

// ─────────────────────────────────────────────────────────────
//  DEMO FALLBACK (when backend is unreachable)
// ─────────────────────────────────────────────────────────────
const DEMO_USERS: Record<string, AuthUser> = {
  'admin@chaiconnect.co.ke': { role: 'admin',   name: 'Makena Wanjiru',   factoryId: 'kiambu' },
  'KC-2044':                 { role: 'clerk',   name: 'Juma Otieno',      factoryId: 'kiambu' },
  'EXT-889':                 { role: 'officer', name: 'Wambui Extension', factoryId: 'kiambu' },
  '0712345678':              { role: 'farmer',  name: 'Wanjiku Kamau',    factoryId: 'kiambu' },
}
const DEMO_PASSWORDS: Record<string, string> = {
  'admin@chaiconnect.co.ke': 'Admin@1234',
  'KC-2044':                 '2044',
  'EXT-889':                 'Officer@1234',
  '0712345678':              '5921',
}

// ─────────────────────────────────────────────────────────────
//  AppProvider
// ─────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [appState, appDispatch] = useReducer(appReducer, initialAppState)
  const [farmerState, farmerDispatch] = useReducer(farmerReducer, initialFarmerState)

  // Persist theme & lang
  useEffect(() => { lsSet('cc_theme', appState.theme) }, [appState.theme])
  useEffect(() => { lsSet('cc_lang',  appState.lang)  }, [appState.lang])

  // Persist farmer store
  useEffect(() => { lsSet('cc_farmer', farmerState) }, [farmerState])

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appState.theme)
  }, [appState.theme])

  // Restore JWT session on mount
  useEffect(() => {
    authMe()
      .then(user => {
        if (user) {
          appDispatch({ type: 'SET_AUTH', payload: { role: user.role as Role, name: user.name, factoryId: user.factoryId, userId: user.userId } })
        }
      })
      .catch(() => { /* offline — no-op */ })
  }, [])

  // Toast auto-dismiss ref map
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const pushToast = useCallback((text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    appDispatch({ type: 'PUSH_TOAST', payload: { id, text } })
    toastTimers.current[id] = setTimeout(() => {
      appDispatch({ type: 'DISMISS_TOAST', payload: id })
      delete toastTimers.current[id]
    }, 6000)
  }, [])

  // Global keyboard shortcut — Cmd+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        appDispatch({ type: 'SET_SEARCH', payload: true })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── App actions ──────────────────────────────────────────
  const login = useCallback(async (payload: { role: Role; loginId: string; password?: string; otp?: string }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { token, user } = await authLogin(payload)
      setToken(token)
      const authUser: AuthUser = { role: user.role as Role, name: user.name, factoryId: user.factoryId, userId: user.userId }
      appDispatch({ type: 'SET_AUTH', payload: authUser })
      return { ok: true }
    } catch (err: unknown) {
      // Backend unreachable — demo fallback
      const errMsg = err instanceof Error ? err.message : 'Login failed'
      console.warn('Backend login failed, using demo fallback:', errMsg)
      const demo = DEMO_USERS[payload.loginId]
      if (demo && demo.role === payload.role) {
        const provided = payload.password || payload.otp || ''
        if (provided !== DEMO_PASSWORDS[payload.loginId]) {
          return { ok: false, error: 'Invalid credentials' }
        }
        appDispatch({ type: 'SET_AUTH', payload: demo })
        return { ok: true }
      }
      return { ok: false, error: errMsg }
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    lsDel('cc_farmer')
    appDispatch({ type: 'SET_AUTH', payload: null })
  }, [])

  const appCtxValue: AppStoreCtx = useMemo(() => ({
    ...appState,
    setAuth:       (u) => appDispatch({ type: 'SET_AUTH',   payload: u }),
    setTheme:      (t) => appDispatch({ type: 'SET_THEME',  payload: t }),
    toggleTheme:   ()  => appDispatch({ type: 'SET_THEME',  payload: appState.theme === 'light' ? 'dark' : 'light' }),
    setLang:       (l) => appDispatch({ type: 'SET_LANG',   payload: l }),
    setSearchOpen: (v) => appDispatch({ type: 'SET_SEARCH', payload: v }),
    pushToast,
    dismissToast:  (id) => appDispatch({ type: 'DISMISS_TOAST', payload: id }),
    login,
    logout,
  }), [appState, pushToast, login, logout])

  // ── Farmer actions ───────────────────────────────────────
  const acceptFarmerDisbursement = useCallback((id: string) => {
    const row = farmerState.pendingFarmerDisbursements.find(p => p.id === id)
    if (!row) return
    const line: CreditLedgerLine = {
      id:          `cl-${Date.now()}`,
      date:        new Date().toISOString().slice(0, 10),
      description: `Accepted: ${row.label}`,
      amount:      row.amount,
      direction:   'in',
      scoringSignal: row.source === 'flowcredit_b2c'
        ? '+ B2C confirmed — improves FlowCredit limit'
        : '+ Cooperative inflow acknowledged — repayment signal',
    }
    farmerDispatch({ type: 'ACCEPT',   payload: id })
    farmerDispatch({ type: 'ADD_LINE', payload: line })
    farmerDispatch({ type: 'SCORE',    payload: Math.min(100, farmerState.farmerCreditScore + 2) })
    pushToast('Confirmed. Record added to your credit history.')
  }, [farmerState, pushToast])

  const queueStaffB2CForFarmer = useCallback((p: { amount: number; label: string; ref: string }) => {
    const item: PendingFarmerDisbursement = {
      id:        `pd-b2c-${Date.now()}`,
      amount:    p.amount,
      label:     p.label,
      ref:       p.ref,
      source:    'flowcredit_b2c',
      createdAt: new Date().toISOString().slice(0, 10),
    }
    farmerDispatch({ type: 'QUEUE', payload: item })
    pushToast('B2C queued. Farmer can accept in Wallet (M-Pesa & score).')
  }, [pushToast])

  const farmerCtxValue: FarmerStoreCtx = useMemo(() => ({
    ...farmerState,
    acceptFarmerDisbursement,
    queueStaffB2CForFarmer,
  }), [farmerState, acceptFarmerDisbursement, queueStaffB2CForFarmer])

  return (
    <AppCtx.Provider value={appCtxValue}>
      <FarmerCtx.Provider value={farmerCtxValue}>
        {children}
      </FarmerCtx.Provider>
    </AppCtx.Provider>
  )
}

// ─────────────────────────────────────────────────────────────
//  Store hooks (mirror Zustand API)
// ─────────────────────────────────────────────────────────────
export function useAppStore() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useAppStore must be inside AppProvider')
  return ctx
}

export function useFarmerStore() {
  const ctx = useContext(FarmerCtx)
  if (!ctx) throw new Error('useFarmerStore must be inside AppProvider')
  return ctx
}

// ─────────────────────────────────────────────────────────────
//  Backward-compatible useApp() shim
//  All existing components that do `const { x } = useApp()` work unchanged.
// ─────────────────────────────────────────────────────────────
export function useApp() {
  const app    = useAppStore()
  const farmer = useFarmerStore()
  const { lang } = app

  const t = useCallback((en: string, sw: string) => (lang === 'sw' ? sw : en), [lang])

  return {
    // App store
    auth:          app.auth,
    theme:         app.theme,
    setTheme:      app.setTheme,
    toggleTheme:   app.toggleTheme,
    lang,
    setLang:       app.setLang,
    searchOpen:    app.searchOpen,
    setSearchOpen: app.setSearchOpen,
    toasts:        app.toasts,
    pushToast:     app.pushToast,
    dismissToast:  app.dismissToast,
    login:         app.login,
    logout:        app.logout,

    // Farmer store
    pendingFarmerDisbursements: farmer.pendingFarmerDisbursements,
    creditLedgerLines:          farmer.creditLedgerLines,
    farmerCreditScore:          farmer.farmerCreditScore,
    acceptFarmerDisbursement:   farmer.acceptFarmerDisbursement,
    queueStaffB2CForFarmer:     farmer.queueStaffB2CForFarmer,

    // Utilities
    t,
  }
}
