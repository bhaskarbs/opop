import { useAuthStore } from '../stores/authStore'
import { blobRequest, request } from './apiClient'
import type { BackendSubscriptionPlan } from './billingApi'
import type { CompanyCertificateSummary } from './companyApi'
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

export interface AdminCompanyProfileSummary {
  userId: string
  companyName: string
  email: string
  entityType: string
  cin: string
  gstin: string
  // Only meaningful when entityType is "Company Not Yet Registered" — substitutes for
  // cin/gstin as the identity check on a company that isn't formally registered yet.
  aadhaarNumber: string | null
  pan: string
  industry: string
  address: string
  signatoryName: string
  contactNumber: string
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
  // verificationStatus/industry/cin are only meaningful for role === 'COMPANY' — null for
  // candidates.
  verificationStatus: VerificationStatus | null
  industry: string | null
  cin: string | null
  createdAt: string
}

export interface AdminUserListParams {
  role?: AdminUserRole
  status?: AccountStatus
  q?: string
}

export type MockInterviewQuestionSource = 'AI' | 'ADMIN'

export interface AdminMockInterviewQuestionSummary {
  id: string
  text: string
  skills: string[]
  industry: string | null
  experienceLevel: BackendExperienceLevel | null
  important: boolean
  source: MockInterviewQuestionSource
  createdAt: string
}

export interface MockInterviewQuestionListParams {
  skill?: string
  industry?: string
  experienceLevel?: BackendExperienceLevel
  q?: string
}

export interface CreateMockInterviewQuestionPayload {
  text: string
  skills: string[]
  industry: string | null
  experienceLevel: BackendExperienceLevel | null
}

export interface AdminCandidateSubscriptionSummary {
  candidateId: string
  fullName: string
  email: string
  plan: BackendSubscriptionPlan
  validUntil: string | null
}

// The backend only lets an admin comp Free or Plus directly (see
// PlanNotAdminAssignableException) — Pro always has to go through a real Razorpay checkout.
export type AdminAssignableSubscriptionPlan = 'FREE' | 'PLUS'

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

function buildMockInterviewQuestionQuery(params: MockInterviewQuestionListParams): string {
  const search = new URLSearchParams()
  if (params.skill) search.set('skill', params.skill)
  if (params.industry) search.set('industry', params.industry)
  if (params.experienceLevel) search.set('experienceLevel', params.experienceLevel)
  if (params.q) search.set('q', params.q)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export interface PlatformSettings {
  emailVerificationEnabled: boolean
}

export const adminApi = {
  getDashboardStats: () =>
    request<AdminDashboardStats>('/api/admin/dashboard/stats', { headers: authHeaders() }),
  getCandidateReportStats: () =>
    request<AdminCandidateReportStats>('/api/admin/reports/candidates', { headers: authHeaders() }),
  getPartnershipReportStats: () =>
    request<AdminPartnershipReportStats>('/api/admin/reports/partnerships', {
      headers: authHeaders(),
    }),
  getCommunityInterestSubmissions: () =>
    request<AdminCommunityInterestSummary[]>('/api/admin/reports/community', {
      headers: authHeaders(),
    }),
  getSettings: () => request<PlatformSettings>('/api/admin/settings', { headers: authHeaders() }),
  setEmailVerificationEnabled: (enabled: boolean) =>
    request<PlatformSettings>('/api/admin/settings/email-verification', {
      method: 'PUT',
      body: JSON.stringify({ emailVerificationEnabled: enabled }),
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

  pendingCompanies: (q?: string) =>
    request<AdminCompanyProfileSummary[]>(
      `/api/admin/companies/pending${q ? `?q=${encodeURIComponent(q)}` : ''}`,
      { headers: authHeaders() },
    ),
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
  setCandidatePlan: (candidateId: string, plan: AdminAssignableSubscriptionPlan) =>
    request<AdminCandidateSubscriptionSummary>(`/api/admin/candidate-billing/${candidateId}/plan`, {
      method: 'POST',
      body: JSON.stringify({ plan }),
      headers: authHeaders(),
    }),
}
