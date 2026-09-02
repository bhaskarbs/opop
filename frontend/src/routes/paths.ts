/**
 * Central route path registry. Header/Footer nav and page links should reference
 * these constants rather than hardcoded strings, so route changes stay one-file.
 */
export const ROUTES = {
  home: '/',
  jobs: '/jobs',
  jobDetail: (jobId: string) => `/jobs/${jobId}`,
  // Public — a share-token URL emailed to an external recipient, not linked from any nav (see
  // AdminVideosPage/WatchSharedVideoPage). No auth: the token itself is the access control.
  watchSharedVideo: (token: string) => `/watch/${token}`,
  // Public — a candidate's own mock interview recording, copy/shareable with anyone (see
  // MockInterviewPage's "Copy link" button / mockInterviewApi.mockInterviewShareUrl). No auth:
  // the token itself is the access control, same as watchSharedVideo above.
  watchMockInterview: (token: string) => `/watch-interview/${token}`,
  partnerships: '/partnerships',
  // Public — reachable by anyone, but deliberately not linked from any nav (see IdeasBrowsePage).
  ideasBrowse: '/partnerships/ideas',
  ideaDetail: (ideaId: string) => `/partnerships/ideas/${ideaId}`,
  community: '/community',
  privacyPolicy: '/privacy-policy',
  termsOfService: '/terms-of-service',
  refundPolicy: '/refund-policy',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  companyLogin: '/company/login',
  companyRegister: '/company/register',
  companyForgotPassword: '/company/forgot-password',

  candidateDashboard: '/candidate/dashboard',
  candidateProfile: '/candidate/profile',
  candidateAddDetails: '/candidate/profile/add-details',
  candidateApplications: '/candidate/applications',
  candidateSavedJobs: '/candidate/saved-jobs',
  candidateJobAlerts: '/candidate/job-alerts',
  candidateMockInterview: '/candidate/mock-interview',
  candidateIdeas: '/candidate/ideas',
  candidateIdeaSubmit: '/candidate/ideas/submit',
  candidateIdeaEdit: (ideaId: string) => `/candidate/ideas/${ideaId}/edit`,
  candidateBilling: '/candidate/billing',

  companyDashboard: '/company/dashboard',
  companyProfile: '/company/profile',
  companyPartnerships: '/company/partnerships',
  companyPostJob: '/company/post-job',
  companyJobPostings: '/company/job-postings',
  companyJobEdit: (jobId: string) => `/company/job-postings/${jobId}/edit`,
  companyJobApplicants: (jobId: string) => `/company/job-postings/${jobId}/applicants`,
  companySearchCandidates: '/company/search-candidates',
  companyCandidateProfile: (userId: string) => `/company/candidates/${userId}`,
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
  adminCandidateDetail: (id: string) => `/admin/users/candidates/${id}`,
  adminCompanyDetail: (id: string) => `/admin/users/companies/${id}`,
  adminMockInterviewQuestions: '/admin/mock-interview-questions',
  adminMockInterviews: '/admin/mock-interviews',
  adminReports: '/admin/reports',
  adminBilling: '/admin/billing',
  adminJobs: '/admin/jobs',
  adminPostJob: '/admin/jobs/post',
  adminJobEdit: (jobId: string) => `/admin/jobs/${jobId}/edit`,
  adminIdeas: '/admin/ideas',
  adminPostIdea: '/admin/ideas/post',
  adminIdeaEdit: (ideaId: string) => `/admin/ideas/${ideaId}/edit`,
  adminVideos: '/admin/videos',
  adminBroadcastEmail: '/admin/broadcast-email',
  adminCareerGuideSteps: '/admin/career-guide-steps',
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
