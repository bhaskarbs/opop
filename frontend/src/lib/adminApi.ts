import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'
import type { BackendSubscriptionPlan } from './billingApi'
import type { IdeaSummary } from './ideasApi'
import type { BackendExperienceLevel, JobSummary } from './jobsApi'

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export type AccountStatus = 'ACTIVE' | 'SUSPENDED'
export type AdminUserRole = 'CANDIDATE' | 'COMPANY'

export interface AdminCompanyProfileSummary {
  userId: string
  companyName: string
  email: string
  entityType: string
  cin: string
  gstin: string
  pan: string
  industry: string
  address: string
  signatoryName: string
  verificationStatus: VerificationStatus
  submittedAt: string
}

export interface AdminUserSummary {
  id: string
  email: string
  fullName: string
  role: AdminUserRole
  accountStatus: AccountStatus
  verificationStatus: VerificationStatus | null
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

export const adminApi = {
  pendingJobs: () => request<JobSummary[]>('/api/jobs/pending', { headers: authHeaders() }),
  approveJob: (id: string) =>
    request<JobSummary>(`/api/jobs/${id}/approve`, { method: 'POST', headers: authHeaders() }),
  rejectJob: (id: string) =>
    request<JobSummary>(`/api/jobs/${id}/reject`, { method: 'POST', headers: authHeaders() }),

  pendingIdeas: () => request<IdeaSummary[]>('/api/ideas/pending', { headers: authHeaders() }),
  approveIdea: (id: string) =>
    request<IdeaSummary>(`/api/ideas/${id}/approve`, { method: 'POST', headers: authHeaders() }),
  rejectIdea: (id: string) =>
    request<IdeaSummary>(`/api/ideas/${id}/reject`, { method: 'POST', headers: authHeaders() }),

  pendingCompanies: () =>
    request<AdminCompanyProfileSummary[]>('/api/admin/companies/pending', {
      headers: authHeaders(),
    }),
  verifyCompany: (userId: string) =>
    request<AdminCompanyProfileSummary>(`/api/admin/companies/${userId}/verify`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  rejectCompany: (userId: string) =>
    request<AdminCompanyProfileSummary>(`/api/admin/companies/${userId}/reject`, {
      method: 'POST',
      headers: authHeaders(),
    }),

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
