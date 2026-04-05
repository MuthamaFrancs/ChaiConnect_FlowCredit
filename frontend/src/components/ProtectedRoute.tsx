import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppProvider'
import type { Role } from '../types'

interface Props {
  children: React.ReactNode
  /** If provided, only these roles are allowed */
  allowedRoles?: Role[]
  /** Where to redirect unauthorized users (default: '/') */
  redirectTo?: string
}

/**
 * ProtectedRoute — redirects to login if the user is not authenticated.
 * Optionally enforces role-based access.
 */
export function ProtectedRoute({ children, allowedRoles, redirectTo = '/' }: Props) {
  const { auth } = useApp()

  if (!auth) {
    return <Navigate to={redirectTo} replace />
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    // Authenticated but wrong role — redirect to their default route
    const defaultRoute = auth.role === 'farmer' ? '/portal' : '/app'
    return <Navigate to={defaultRoute} replace />
  }

  return <>{children}</>
}
