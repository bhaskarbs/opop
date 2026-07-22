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

  // Candidate-only gate (see EmailVerificationFilter on the backend, which enforces the same
  // thing server-side) — a candidate who hasn't verified their email can't reach any candidate
  // route until they do, not just a nag banner on top of the real page.
  if (role === 'CANDIDATE' && !user.emailVerified) {
    return <Navigate to={localize(ROUTES.verifyEmailPending)} replace />
  }

  return <Outlet />
}
