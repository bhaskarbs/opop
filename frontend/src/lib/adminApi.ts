import { useAuthStore } from '../stores/authStore'
import { blobRequest, request } from './apiClient'
import type { AdminLevel } from './apiClient'
import type { ApplicationSummary } from './applicationsApi'
import type { BackendSubscriptionPlan, BillingTransactionStatus } from './billingApi'
import type { BackendNoticePeriod } from './candidateApi'
import type { CompanyCertificateSummary } from './companyApi'
import type { BackendCompanySubscriptionPlan } from './companyBillingApi'
import type { IdeaDetail } from './ideasApi'
import type { BackendExperienceLevel, JobDetail } from './jobsApi'

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export type AccountStatus = 'ACTIVE' | 'SUSPENDED'
export type AdminUserRole = 'CANDIDATE' | 'COMPANY'

export interface MonthlyApplicationsByPath {
  // First day of the month, ISO-formatted (e.g. "2026-07-01") — derive the axis label from it.
  month: string
  jobs: number
  partnerships: number
  community: number
}

export interface AdminDashboardStats {
  totalCandidates: number
  registeredCompanies: number
  liveJobPostings: number
  partnershipMatches: number
  communitySignUps: number
  // Candidate funnel stages — distinct candidates, not raw application/interest counts.
  candidatesAppliedToJob: number
  candidatesAppliedForPartnership: number
  // Last 6 calendar months, oldest first, current month last.
  applicationsByPath: MonthlyApplicationsByPath[]
}

export interface AdminCandidateReportStats {
  totalRegistered: number
  resumesUploaded: number
  mockInterviewsTaken: number
}

export interface SectorHiringStats {
  sector: string
  openJobs: number
  applications: number
}

export interface AdminEmployerReportStats {
  registeredCompanies: number
  verifiedCompanies: number
  liveJobPostings: number
  topHiringSectors: SectorHiringStats[]
}

export interface AdminPartnershipReportStats {
  totalPartnershipMatches: number
  startupsOffering: number
  fundedListings: number
  listingsWithoutFunding: number
}

export interface AdminCommunityInterestSummary {
  id: string
  name: string
  companyName: string | null
  email: string
  phone: string | null
  submittedAt: string
}

export interface AdminFinancialReportStats {
  totalRevenueRupees: number
  candidateSubscriptionRevenueRupees: number
  companySubscriptionRevenueRupees: number
}

export interface SendBroadcastEmailPayload {
  subject: string
  recipients: string[]
  message: string
}

export interface BroadcastEmailResult {
  recipientCount: number
}

export interface AdminCompanyProfileSummary {
  userId: string
  companyName: string
  email: string
  // All of these are null until the company fills in its profile (e.g. right after a Google
  // signup) — the admin approvals list filters such incomplete profiles out, but the admin
  // Users page's "More details" link has no such filter, so a blank one is reachable there.
  entityType: string | null
  cin: string | null
  gstin: string | null
  // Only meaningful when entityType is "Company Not Yet Registered" — substitutes for
  // cin/gstin as the identity check on a company that isn't formally registered yet.
  aadhaarNumber: string | null
  pan: string | null
  industry: string | null
  address: string | null
  signatoryName: string | null
  contactNumber: string | null
  verificationStatus: VerificationStatus
  submittedAt: string
  // Verification documents on file — download via adminApi.downloadCompanyCertificate.
  certificates: CompanyCertificateSummary[]
}

export interface AdminUserSummary {
  id: string
  email: string
  fullName: string
  role: AdminUserRole
  accountStatus: AccountStatus
  // verificationStatus/industry/cin are only meaningful for role === 'COMPANY', featuredAt only
  // for role === 'CANDIDATE' — null otherwise.
  verificationStatus: VerificationStatus | null
  industry: string | null
  cin: string | null
  // Non-null once an admin has featured this candidate — see adminApi.featureCandidate. Pins
  // them above the rest of a company's "Search candidates" results.
  featuredAt: string | null
  createdAt: string
}

export interface AdminCandidateProfileSummary {
  userId: string
  fullName: string
  email: string
  accountStatus: AccountStatus
  mobile: string | null
  mobileVerified: boolean
  location: string | null
  title: string | null
  experienceLevel: BackendExperienceLevel | null
  industry: string | null
  skills: string[]
  resumeFileName: string | null
  resumeUploadedAt: string | null
  resumeSizeBytes: number | null
  photoUrl: string | null
  lifeGoals: string | null
  workCulture: string | null
  workModePreference: string | null
  openToPreference: string | null
  yearsOfExperience: number | null
  currentSalaryLakhs: number | null
  noticePeriod: BackendNoticePeriod | null
  educationDegree: string | null
  educationInstitution: string | null
  educationGraduationYear: number | null
  featuredAt: string | null
  createdAt: string
}

export interface AdminTeamMemberSummary {
  id: string
  email: string
  fullName: string
  adminLevel: AdminLevel
  createdAt: string
}

// SUPER_ADMIN deliberately isn't a valid value here — see AdminTeamService.parseCreatableLevel;
// provisioning that tier is a manual/seeded operation, not something done through this form.
export type CreatableAdminLevel = 'REVIEWER' | 'ADMIN'

export interface CreateAdminTeamMemberPayload {
  email: string
  password: string
  fullName: string
  adminLevel: CreatableAdminLevel
}

export interface AdminUserListParams {
  role?: AdminUserRole
  status?: AccountStatus
  q?: string
}

export type MockInterviewQuestionSource = 'AI' | 'ADMIN'
export type BackendQuestionDifficulty = 'EASY' | 'NORMAL' | 'DIFFICULT' | 'VERY_DIFFICULT'

export interface AdminMockInterviewQuestionSummary {
  id: string
  text: string
  skills: string[]
  industry: string | null
  experienceLevels: BackendExperienceLevel[]
  difficulty: BackendQuestionDifficulty | null
  important: boolean
  source: MockInterviewQuestionSource
  createdAt: string
}

export interface MockInterviewQuestionListParams {
  skill?: string
  industry?: string
  experienceLevels?: BackendExperienceLevel[]
  q?: string
}

export interface CreateMockInterviewQuestionPayload {
  text: string
  skills: string[]
  industry: string | null
  experienceLevels: BackendExperienceLevel[]
  difficulty: BackendQuestionDifficulty | null
}

export interface AdminCandidateSubscriptionSummary {
  candidateId: string
  fullName: string
  email: string
  plan: BackendSubscriptionPlan
  validUntil: string | null
  // When this plan was last set (grant, renewal, or downgrade) — null only for a candidate
  // who's never had a subscription row at all (always Free, untouched). See
  // CandidateSubscription.updatedAt.
  upgradedAt: string | null
}

// The backend only lets an admin comp Free or Plus directly (see
// PlanNotAdminAssignableException) — Pro always has to go through a real Razorpay checkout.
export type AdminAssignableSubscriptionPlan = 'FREE' | 'PLUS'

// months/generateInvoice are only meaningful (and required by the backend) for plan=PLUS — see
// AdminGrantCandidatePlanRequest/CandidateBillingService.adminSetPlan.
export interface AdminGrantCandidatePlanPayload {
  plan: AdminAssignableSubscriptionPlan
  months?: number
  generateInvoice?: boolean
}

export interface AdminCompanySubscriptionSummary {
  companyId: string
  companyName: string
  email: string
  plan: BackendCompanySubscriptionPlan
  validUntil: string | null
  // See AdminCandidateSubscriptionSummary.upgradedAt.
  upgradedAt: string | null
}

// Unlike candidates (Pro stays checkout-only), the backend lets an admin comp all three company
// plans, including Enterprise — see CompanyBillingService.adminSetPlan.
export type AdminAssignableCompanySubscriptionPlan = 'FREE' | 'GROWTH' | 'ENTERPRISE'

// See AdminGrantCandidatePlanPayload — months/generateInvoice are only meaningful (and required
// by the backend) for a paid plan (GROWTH/ENTERPRISE).
export interface AdminGrantCompanyPlanPayload {
  plan: AdminAssignableCompanySubscriptionPlan
  months?: number
  generateInvoice?: boolean
}

export interface AdminBillingStats {
  monthlyRecurringRevenueRupees: number
  activeSubscriptions: number
  churnedThisMonth: number
}

export interface AdminInvoiceSummary {
  id: string
  name: string | null
  userType: AdminUserRole
  plan: string
  amountRupees: number
  status: BillingTransactionStatus
  createdAt: string
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function buildUserListQuery(params: AdminUserListParams): string {
  const search = new URLSearchParams()
  if (params.role) search.set('role', params.role)
  if (params.status) search.set('status', params.status)
  if (params.q) search.set('q', params.q)
  const query = search.toString()
  return query ? `?${query}` : ''
}

function daysQuery(days?: number): string {
  return days != null ? `?days=${days}` : ''
}

function buildMockInterviewQuestionQuery(params: MockInterviewQuestionListParams): string {
  const search = new URLSearchParams()
  if (params.skill) search.set('skill', params.skill)
  if (params.industry) search.set('industry', params.industry)
  // Repeated key, not comma-joined — matches Spring's @RequestParam List<ExperienceLevel>
  // binding (?experienceLevels=X&experienceLevels=Y), same convention as JobSearchParams' level
  // array elsewhere in this file.
  params.experienceLevels?.forEach((level) => search.append('experienceLevels', level))
  if (params.q) search.set('q', params.q)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const adminApi = {
  getDashboardStats: () =>
    request<AdminDashboardStats>('/api/admin/dashboard/stats', { headers: authHeaders() }),
  getCandidateReportStats: (days?: number) =>
    request<AdminCandidateReportStats>(`/api/admin/reports/candidates${daysQuery(days)}`, {
      headers: authHeaders(),
    }),
  getEmployerReportStats: (days?: number) =>
    request<AdminEmployerReportStats>(`/api/admin/reports/employers${daysQuery(days)}`, {
      headers: authHeaders(),
    }),
  getPartnershipReportStats: (days?: number) =>
    request<AdminPartnershipReportStats>(`/api/admin/reports/partnerships${daysQuery(days)}`, {
      headers: authHeaders(),
    }),
  getCommunityInterestSubmissions: (days?: number) =>
    request<AdminCommunityInterestSummary[]>(`/api/admin/reports/community${daysQuery(days)}`, {
      headers: authHeaders(),
    }),
  getFinancialReportStats: (days?: number) =>
    request<AdminFinancialReportStats>(`/api/admin/reports/financial${daysQuery(days)}`, {
      headers: authHeaders(),
    }),
  pendingJobs: (q?: string) =>
    request<JobDetail[]>(`/api/jobs/pending${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
      headers: authHeaders(),
    }),
  approveJob: (id: string) =>
    request<JobDetail>(`/api/jobs/${id}/approve`, { method: 'POST', headers: authHeaders() }),
  rejectJob: (id: string, reason: string) =>
    request<JobDetail>(`/api/jobs/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      headers: authHeaders(),
    }),
  featureJob: (id: string) =>
    request<JobDetail>(`/api/jobs/${id}/feature`, { method: 'POST', headers: authHeaders() }),
  unfeatureJob: (id: string) =>
    request<JobDetail>(`/api/jobs/${id}/unfeature`, { method: 'POST', headers: authHeaders() }),
  // Distinct from the company-owner-scoped DELETE /api/jobs/{id} (jobsApi doesn't expose that
  // one) — admin/super_admin only, no ownership required. Also removes the job's applications
  // and saved-job bookmarks server-side (see JobService#adminDelete).
  deleteJob: (id: string) =>
    request<void>(`/api/jobs/${id}/admin`, { method: 'DELETE', headers: authHeaders() }),

  pendingIdeas: (q?: string) =>
    request<IdeaDetail[]>(`/api/ideas/pending${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
      headers: authHeaders(),
    }),
  approveIdea: (id: string) =>
    request<IdeaDetail>(`/api/ideas/${id}/approve`, { method: 'POST', headers: authHeaders() }),
  rejectIdea: (id: string, reason: string) =>
    request<IdeaDetail>(`/api/ideas/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      headers: authHeaders(),
    }),
  // Distinct from the submitter-scoped DELETE /api/ideas/{id} (ideasApi doesn't expose that
  // one) — admin/super_admin only, no submitter ownership required.
  deleteIdea: (id: string) =>
    request<void>(`/api/ideas/${id}/admin`, { method: 'DELETE', headers: authHeaders() }),
  featureIdea: (id: string) =>
    request<IdeaDetail>(`/api/ideas/${id}/feature`, { method: 'POST', headers: authHeaders() }),
  unfeatureIdea: (id: string) =>
    request<IdeaDetail>(`/api/ideas/${id}/unfeature`, { method: 'POST', headers: authHeaders() }),

  pendingCompanies: (q?: string) =>
    request<AdminCompanyProfileSummary[]>(
      `/api/admin/companies/pending${q ? `?q=${encodeURIComponent(q)}` : ''}`,
      { headers: authHeaders() },
    ),
  getCompanyDetail: (userId: string) =>
    request<AdminCompanyProfileSummary>(`/api/admin/companies/${userId}`, {
      headers: authHeaders(),
    }),
  verifyCompany: (userId: string) =>
    request<AdminCompanyProfileSummary>(`/api/admin/companies/${userId}/verify`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  rejectCompany: (userId: string, reason: string) =>
    request<AdminCompanyProfileSummary>(`/api/admin/companies/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      headers: authHeaders(),
    }),
  downloadCompanyCertificate: (userId: string, certificateId: string) =>
    blobRequest(`/api/admin/companies/${userId}/certificates/${certificateId}`, authHeaders()),

  users: (params: AdminUserListParams = {}) =>
    request<AdminUserSummary[]>(`/api/admin/users${buildUserListQuery(params)}`, {
      headers: authHeaders(),
    }),
  getCandidateDetail: (id: string) =>
    request<AdminCandidateProfileSummary>(`/api/admin/users/candidates/${id}`, {
      headers: authHeaders(),
    }),
  getCandidateResume: (id: string) =>
    blobRequest(`/api/admin/users/candidates/${id}/resume`, authHeaders()),
  getCandidateApplications: (id: string) =>
    request<ApplicationSummary[]>(`/api/applications/candidate/${id}/admin`, {
      headers: authHeaders(),
    }),
  suspendUser: (id: string) =>
    request<AdminUserSummary>(`/api/admin/users/${id}/suspend`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  reactivateUser: (id: string) =>
    request<AdminUserSummary>(`/api/admin/users/${id}/reactivate`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  // Hard delete — admin/super_admin only (not reviewer, unlike suspend/reactivate above).
  // Backend dispatches to the right cascade (candidate vs. company) by the account's actual
  // role and also removes its stored files — see AdminAccountDeletionService.
  deleteUser: (id: string) =>
    request<void>(`/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() }),
  featureCandidate: (id: string) =>
    request<AdminUserSummary>(`/api/admin/users/candidates/${id}/feature`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  unfeatureCandidate: (id: string) =>
    request<AdminUserSummary>(`/api/admin/users/candidates/${id}/unfeature`, {
      method: 'POST',
      headers: authHeaders(),
    }),

  // Reachable by any admin tier; create/delete 403 server-side unless the caller is
  // super_admin (see AdminTeamController) — the frontend also hides those actions for anyone
  // else, but the backend is the real gate.
  teamMembers: () =>
    request<AdminTeamMemberSummary[]>('/api/admin/team', { headers: authHeaders() }),
  createTeamMember: (payload: CreateAdminTeamMemberPayload) =>
    request<AdminTeamMemberSummary>('/api/admin/team', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  deleteTeamMember: (id: string) =>
    request<void>(`/api/admin/team/${id}`, { method: 'DELETE', headers: authHeaders() }),

  mockInterviewQuestions: (params: MockInterviewQuestionListParams = {}) =>
    request<AdminMockInterviewQuestionSummary[]>(
      `/api/admin/mock-interview-questions${buildMockInterviewQuestionQuery(params)}`,
      { headers: authHeaders() },
    ),
  createMockInterviewQuestion: (payload: CreateMockInterviewQuestionPayload) =>
    request<AdminMockInterviewQuestionSummary>('/api/admin/mock-interview-questions', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  updateMockInterviewQuestion: (id: string, payload: CreateMockInterviewQuestionPayload) =>
    request<AdminMockInterviewQuestionSummary>(`/api/admin/mock-interview-questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  deleteMockInterviewQuestion: (id: string) =>
    request<void>(`/api/admin/mock-interview-questions/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  highlightMockInterviewQuestion: (id: string) =>
    request<AdminMockInterviewQuestionSummary>(
      `/api/admin/mock-interview-questions/${id}/highlight`,
      {
        method: 'POST',
        headers: authHeaders(),
      },
    ),
  unhighlightMockInterviewQuestion: (id: string) =>
    request<AdminMockInterviewQuestionSummary>(
      `/api/admin/mock-interview-questions/${id}/unhighlight`,
      {
        method: 'POST',
        headers: authHeaders(),
      },
    ),

  candidateSubscriptions: () =>
    request<AdminCandidateSubscriptionSummary[]>('/api/admin/candidate-billing', {
      headers: authHeaders(),
    }),
  setCandidatePlan: (candidateId: string, payload: AdminGrantCandidatePlanPayload) =>
    request<AdminCandidateSubscriptionSummary>(`/api/admin/candidate-billing/${candidateId}/plan`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),

  companySubscriptions: () =>
    request<AdminCompanySubscriptionSummary[]>('/api/admin/company-billing', {
      headers: authHeaders(),
    }),
  setCompanyPlan: (companyId: string, payload: AdminGrantCompanyPlanPayload) =>
    request<AdminCompanySubscriptionSummary>(`/api/admin/company-billing/${companyId}/plan`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),

  billingStats: () =>
    request<AdminBillingStats>('/api/admin/billing/stats', { headers: authHeaders() }),
  invoiceHistory: () =>
    request<AdminInvoiceSummary[]>('/api/admin/billing/invoices', { headers: authHeaders() }),

  sendBroadcastEmail: (payload: SendBroadcastEmailPayload) =>
    request<BroadcastEmailResult>('/api/admin/broadcast-email', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
}
