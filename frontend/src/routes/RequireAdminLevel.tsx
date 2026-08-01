import { Navigate, Outlet } from 'react-router-dom'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import type { AdminLevel } from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'
import { ROUTES } from './paths'

export interface RequireAdminLevelProps {
  /** Only a session whose adminLevel is one of these may pass. */
  levels: AdminLevel[]
}

/** Nested inside `<RequireAuth role="ADMIN">` (see App.tsx) — a session/role check has already
 * passed by the time this runs, so it only narrows further by admin tier (see AdminLevel).
 * A reviewer hitting a restricted page directly (e.g. pasting /admin/reports into the URL bar)
 * lands on Approvals, their actual home base, rather than being bounced to login. */
export function RequireAdminLevel({ levels }: RequireAdminLevelProps) {
  const adminLevel = useAuthStore((state) => state.user?.adminLevel)
  const localize = useLocalizedPath()

  if (!adminLevel || !levels.includes(adminLevel)) {
    return <Navigate to={localize(ROUTES.adminApprovals)} replace />
  }

  return <Outlet />
}
