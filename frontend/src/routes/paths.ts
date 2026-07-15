/**
 * Central route path registry. Header/Footer nav and page links should reference
 * these constants rather than hardcoded strings, so route changes stay one-file.
 */
export const ROUTES = {
  home: '/',
  jobs: '/jobs',
  jobDetail: (jobId: string) => `/jobs/${jobId}`,
  partnerships: '/partnerships',
  community: '/community',
  login: '/login',
  register: '/register',
  companyLogin: '/company/login',
  companyRegister: '/company/register',

  candidateDashboard: '/candidate/dashboard',
  candidateProfile: '/candidate/profile',
  candidateAddDetails: '/candidate/profile/add-details',
  candidateApplications: '/candidate/applications',
  candidateMockInterview: '/candidate/mock-interview',

  companyDashboard: '/company/dashboard',
  companyProfile: '/company/profile',
  companyPostJob: '/company/post-job',
  companySearchCandidates: '/company/search-candidates',
  companySeminars: '/company/seminars',

  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  adminApprovals: '/admin/approvals',
  adminCompanyApprovals: '/admin/approvals/companies',
  adminJobApprovals: '/admin/approvals/jobs',
  adminUsers: '/admin/users',
  adminReports: '/admin/reports',
} as const
