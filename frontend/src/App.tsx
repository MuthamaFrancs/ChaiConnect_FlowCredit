import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppProvider'
import { AppShell } from './components/AppShell'
import { GlobalSearch } from './components/GlobalSearch'
import { ToastHost } from './components/ToastHost'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { FarmersPage } from './pages/Farmers'
import { FarmerProfilePage } from './pages/FarmerProfile'
import { DeliveriesPage } from './pages/Deliveries'
import { QualityPage } from './pages/Quality'
import { PaymentsPage } from './pages/Payments'
import { CommunicationsPage } from './pages/Communications'
import { ReportsPage } from './pages/Reports'
import { SettingsPage } from './pages/Settings'
import { FlowCreditDashboardPage } from './pages/flowcredit/FcDashboard'
import { FlowCreditScoringPage } from './pages/flowcredit/FcScoring'
import { FlowCreditLoansPage } from './pages/flowcredit/FcLoans'
import { FlowCreditDisbursePage } from './pages/flowcredit/FcDisburse'
import { FlowCreditTransactionsPage } from './pages/flowcredit/FcTransactions'
import { PortalLayout } from './portal/PortalLayout'
import { PortalHome } from './portal/PortalHome'
import { PortalDeliveries } from './portal/PortalDeliveries'
import { PortalPayments } from './portal/PortalPayments'
import { PortalDeductions } from './portal/PortalDeductions'
import { PortalLoans } from './portal/PortalLoans'
import { PortalUssd } from './portal/PortalUssd'
import { PortalWallet } from './portal/PortalWallet'
import { VoiceAgent } from './components/VoiceAgent'
import ErrorBoundary from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'

// RequireStaff and RequireFarmer kept for backward compat — ProtectedRoute is the canonical guard
function RequireStaff({ children }: { children: React.ReactElement }) {
  const { auth } = useApp()
  if (!auth) return <Navigate to="/" replace />
  if (auth.role === 'farmer') return <Navigate to="/portal" replace />
  return children
}

function RequireFarmer({ children }: { children: React.ReactElement }) {
  const { auth } = useApp()
  if (!auth) return <Navigate to="/" replace />
  if (auth.role !== 'farmer') return <Navigate to="/app" replace />
  return children
}

// Suppress unused-import warning — ProtectedRoute available for future use
void ProtectedRoute

function AppRoutes() {
  const { auth } = useApp()
  return (
    <>
      <GlobalSearch />
      <ToastHost />
      {auth && <VoiceAgent portal={auth.role === 'farmer'} />}
      <Routes>
        <Route path="/" element={auth ? <Navigate to={auth.role === 'farmer' ? '/portal' : '/app'} replace /> : <LoginPage />} />
        <Route
          path="/app"
          element={
            <RequireStaff>
              <AppShell />
            </RequireStaff>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="farmers" element={<FarmersPage />} />
          <Route path="farmers/:id" element={<FarmerProfilePage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="quality" element={<QualityPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="communications" element={<CommunicationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route
          path="/flowcredit"
          element={
            <RequireStaff>
              <AppShell flowcredit />
            </RequireStaff>
          }
        >
          <Route index element={<FlowCreditDashboardPage />} />
          <Route path="scoring" element={<FlowCreditScoringPage />} />
          <Route path="loans" element={<FlowCreditLoansPage />} />
          <Route path="disburse" element={<FlowCreditDisbursePage />} />
          <Route path="transactions" element={<FlowCreditTransactionsPage />} />
        </Route>

        <Route
          path="/portal"
          element={
            <RequireFarmer>
              <PortalLayout />
            </RequireFarmer>
          }
        >
          <Route index element={<PortalHome />} />
          <Route path="wallet" element={<PortalWallet />} />
          <Route path="deliveries" element={<PortalDeliveries />} />
          <Route path="payments" element={<PortalPayments />} />
          <Route path="deductions" element={<PortalDeductions />} />
          <Route path="loans" element={<PortalLoans />} />
          <Route path="ussd" element={<PortalUssd />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </ErrorBoundary>
  )
}
