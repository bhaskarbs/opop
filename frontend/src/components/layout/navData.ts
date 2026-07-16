import { ROUTES } from '../../routes/paths'
import type { HeaderVariant } from './Header'

export interface NavItem {
  /** i18n key under the `layout` namespace — Header/Footer render this via `t()`, not as
   * literal text — see frontend/src/locales/{en,hi}/layout.json. */
  label: string
  /** Real route path. Omit for nav items that don't have a page yet — they render inert. */
  to?: string
}

export const NAV_BY_VARIANT: Record<HeaderVariant, NavItem[]> = {
  guest: [
    { label: 'nav.jobs', to: ROUTES.jobs },
    { label: 'nav.partnerships', to: ROUTES.partnerships },
    { label: 'nav.community', to: ROUTES.community },
    { label: 'nav.forEmployers', to: ROUTES.companyLogin },
  ],
  candidate: [
    { label: 'nav.jobs', to: ROUTES.jobs },
    { label: 'nav.partnerships', to: ROUTES.partnerships },
    { label: 'nav.community', to: ROUTES.community },
    { label: 'nav.dashboard', to: ROUTES.candidateDashboard },
  ],
  company: [
    { label: 'nav.postJob', to: ROUTES.companyPostJob },
    { label: 'nav.searchCandidates', to: ROUTES.companySearchCandidates },
    { label: 'nav.partnershipApplicants' },
    { label: 'nav.seminars', to: ROUTES.companySeminars },
  ],
  admin: [
    { label: 'nav.dashboard', to: ROUTES.adminDashboard },
    { label: 'nav.approvals', to: ROUTES.adminApprovals },
    { label: 'nav.reports', to: ROUTES.adminReports },
    { label: 'nav.users', to: ROUTES.adminUsers },
    { label: 'nav.billing', to: ROUTES.adminBilling },
  ],
}

/** Looks up which nav item's route matches the current pathname, for active-state highlighting.
 * `pathname` includes the `/:lang` prefix (see App.tsx), which `item.to` never does, so it's
 * stripped before matching. */
export function getActiveNavLabel(variant: HeaderVariant, pathname: string): string | undefined {
  const unprefixed = pathname.replace(/^\/(en|hi)(?=\/|$)/, '') || '/'
  return NAV_BY_VARIANT[variant].find((item) => item.to && unprefixed.startsWith(item.to))?.label
}

export const USER_MENU_BY_VARIANT: Partial<Record<HeaderVariant, NavItem[]>> = {
  candidate: [
    { label: 'userMenu.myProfile', to: ROUTES.candidateProfile },
    { label: 'userMenu.myApplications', to: ROUTES.candidateApplications },
    { label: 'userMenu.mockInterviews', to: ROUTES.candidateMockInterview },
    { label: 'userMenu.myIdeas', to: ROUTES.candidateIdeas },
    { label: 'userMenu.billing', to: ROUTES.candidateBilling },
    { label: 'nav.logout' },
  ],
  company: [
    { label: 'userMenu.companyProfile', to: ROUTES.companyProfile },
    { label: 'userMenu.jobPostings' },
    { label: 'userMenu.myIdeas', to: ROUTES.companyIdeas },
    { label: 'userMenu.billing', to: ROUTES.companyBilling },
    { label: 'nav.logout' },
  ],
  admin: [{ label: 'userMenu.adminSettings' }, { label: 'nav.logout' }],
}

export const DEFAULT_USER_NAME: Partial<Record<HeaderVariant, string>> = {
  candidate: 'Rohan Mehta',
  company: 'Acme Startup',
  admin: 'Admin',
}

export const AVATAR_BG_CLASS: Partial<Record<HeaderVariant, string>> = {
  candidate: 'bg-primary',
  company: 'bg-teal',
  admin: 'bg-ink',
}
