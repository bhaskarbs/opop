import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import type { UserRole } from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'
import { ROUTES } from './paths'

export interface RequireAuthProps {
  /** Only a session with this role may pass; anything else (including no session) redirects. */
  role: UserRole
}

const LOGIN_ROUTE_BY_ROLE: Record<UserRole, string> = {
  CANDIDATE: ROUTES.login,
  COMPANY: ROUTES.companyLogin,
  ADMIN: ROUTES.adminLogin,
}

export function RequireAuth({ role }: RequireAuthProps) {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const localize = useLocalizedPath()

  if (status === 'checking') {
    // Still attempting the silent cookie-based refresh (see App.tsx) — render nothing
    // rather than redirect, so a real session isn't bounced to /login on a page reload.
    return null
  }

  if (status !== 'authenticated' || user?.role !== role) {
    return <Navigate to={localize(LOGIN_ROUTE_BY_ROLE[role])} state={{ from: location }} replace />
  }

  return <Outlet />
}
