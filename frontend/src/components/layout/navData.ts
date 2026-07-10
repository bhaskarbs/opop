import { ROUTES } from '../../routes/paths'
import type { HeaderVariant } from './Header'

export interface NavItem {
  label: string
  /** Real route path. Omit for nav items that don't have a page yet — they render inert. */
  to?: string
}

export const NAV_BY_VARIANT: Record<HeaderVariant, NavItem[]> = {
  guest: [
    { label: 'Find Jobs', to: ROUTES.jobs },
    { label: 'Startup Partnerships', to: ROUTES.partnerships },
    { label: 'Community', to: ROUTES.community },
    { label: 'For Employers' },
  ],
  candidate: [
    { label: 'Find Jobs', to: ROUTES.jobs },
    { label: 'Startup Partnerships', to: ROUTES.partnerships },
    { label: 'Community', to: ROUTES.community },
    { label: 'Dashboard', to: ROUTES.candidateDashboard },
  ],
  company: [
    { label: 'Post a Job', to: ROUTES.companyPostJob },
    { label: 'Search Candidates', to: ROUTES.companySearchCandidates },
    { label: 'Partnership Applicants' },
    { label: 'Seminars & Meetups', to: ROUTES.companySeminars },
  ],
  admin: [
    { label: 'Dashboard', to: ROUTES.adminDashboard },
    { label: 'Reports', to: ROUTES.adminReports },
    { label: 'Users', to: ROUTES.adminUsers },
    { label: 'Jobs' },
  ],
}

/** Looks up which nav item's route matches the current pathname, for active-state highlighting. */
export function getActiveNavLabel(variant: HeaderVariant, pathname: string): string | undefined {
  return NAV_BY_VARIANT[variant].find((item) => item.to && pathname.startsWith(item.to))?.label
}

export const USER_MENU_BY_VARIANT: Partial<Record<HeaderVariant, NavItem[]>> = {
  candidate: [
    { label: 'My Profile', to: ROUTES.candidateProfile },
    { label: 'My Applications', to: ROUTES.candidateApplications },
    { label: 'Mock Interviews', to: ROUTES.candidateMockInterview },
    { label: 'Log out' },
  ],
  company: [
    { label: 'Company Profile' },
    { label: 'Job Postings' },
    { label: 'Billing' },
    { label: 'Log out' },
  ],
  admin: [{ label: 'Admin Settings' }, { label: 'Log out' }],
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
