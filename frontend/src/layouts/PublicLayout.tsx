import { Outlet, useLocation } from 'react-router-dom'
import type { UserRole } from '../lib/apiClient'
import { Footer, Header, getActiveNavLabel, type HeaderVariant } from '../components/layout'
import { ROUTES } from '../routes/paths'
import { useAuthStore } from '../stores/authStore'

const ROLE_TO_VARIANT: Record<UserRole, HeaderVariant> = {
  CANDIDATE: 'candidate',
  COMPANY: 'company',
  ADMIN: 'admin',
}

const LOGIN_PATHS = [ROUTES.login, ROUTES.companyLogin, ROUTES.adminLogin]

/** Find Jobs / Partnerships / Community / the auth pages are reachable by anyone, logged in or
 * not — so unlike AuthenticatedLayout (which only ever renders for one fixed role behind
 * RequireAuth), this picks the header variant from whatever the current session actually is,
 * falling back to 'guest' while unauthenticated or still resolving the silent refresh. */
export default function PublicLayout() {
  const location = useLocation()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)

  // Login pages always render as logged-out, even if a differently-rolled session is still
  // active — e.g. RequireAuth redirects a logged-in candidate here after they try to reach
  // /company/dashboard, and showing "you're logged in as Rohan" next to a company login form
  // is exactly backwards from what the page is asking them to do.
  const isLoginPage = LOGIN_PATHS.some((path) => location.pathname.endsWith(path))
  const variant: HeaderVariant =
    !isLoginPage && status === 'authenticated' && user ? ROLE_TO_VARIANT[user.role] : 'guest'
  const activeItem = getActiveNavLabel(variant, location.pathname)
  // The candidate Log in/Register CTAs are confusing on the company login page itself — a
  // company visitor is already looking at a login form, just not this one.
  const showGuestAuthLinks = !location.pathname.endsWith(ROUTES.companyLogin)

  return (
    <>
      <Header
        variant={variant}
        activeItem={activeItem}
        userName={user?.fullName}
        showGuestAuthLinks={showGuestAuthLinks}
      />
      <Outlet />
      <Footer />
    </>
  )
}
