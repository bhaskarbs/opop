/**
 * Central route path registry. Header/Footer nav and page links should reference
 * these constants rather than hardcoded strings, so route changes stay one-file.
 */
export const ROUTES = {
  home: '/',
  jobs: '/jobs',
  jobDetail: (jobId: string) => `/jobs/${jobId}`,
  partnerships: '/partnerships',
  // Public — reachable by anyone, but deliberately not linked from any nav (see IdeasBrowsePage).
  ideasBrowse: '/partnerships/ideas',
  ideaDetail: (ideaId: string) => `/partnerships/ideas/${ideaId}`,
  community: '/community',
  privacyPolicy: '/privacy-policy',
  termsOfService: '/terms-of-service',
  login: '/login',
  register: '/register',
  companyLogin: '/company/login',
  companyRegister: '/company/register',

  candidateDashboard: '/candidate/dashboard',
  candidateProfile: '/candidate/profile',
  candidateAddDetails: '/candidate/profile/add-details',
  candidateApplications: '/candidate/applications',
  candidateMockInterview: '/candidate/mock-interview',
  candidateIdeas: '/candidate/ideas',
  candidateIdeaSubmit: '/candidate/ideas/submit',
  candidateIdeaEdit: (ideaId: string) => `/candidate/ideas/${ideaId}/edit`,
  candidateBilling: '/candidate/billing',

  companyDashboard: '/company/dashboard',
  companyProfile: '/company/profile',
  companyPartnerships: '/company/partnerships',
  companyPostJob: '/company/post-job',
  companySearchCandidates: '/company/search-candidates',
  companySeminars: '/company/seminars',
  companyIdeas: '/company/ideas',
  companyIdeaSubmit: '/company/ideas/submit',
  companyIdeaEdit: (ideaId: string) => `/company/ideas/${ideaId}/edit`,
  companyBilling: '/company/billing',

  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  adminApprovals: '/admin/approvals',
  adminCompanyApprovals: '/admin/approvals/companies',
  adminJobApprovals: '/admin/approvals/jobs',
  adminIdeaApprovals: '/admin/approvals/ideas',
  adminUsers: '/admin/users',
  adminReports: '/admin/reports',
  adminBilling: '/admin/billing',
} as const

/** MyIdeasPage/IdeaSubmitPage are mounted twice — once under /candidate, once under /company
 * (both candidates and companies can submit ideas, see IdeasBrowsePage's "Submit your idea"
 * CTA) — so any Link/navigate inside those shared components has to target whichever tree the
 * signed-in user is actually authenticated into, not a hardcoded role. */
export function ideaRoutesFor(role: 'CANDIDATE' | 'COMPANY' | undefined) {
  if (role === 'COMPANY') {
    return {
      list: ROUTES.companyIdeas,
      submit: ROUTES.companyIdeaSubmit,
      edit: ROUTES.companyIdeaEdit,
    }
  }
  return {
    list: ROUTES.candidateIdeas,
    submit: ROUTES.candidateIdeaSubmit,
    edit: ROUTES.candidateIdeaEdit,
  }
}
