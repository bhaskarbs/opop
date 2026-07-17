import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'
import type { IdeaSummary } from './ideasApi'
import type { JobSummary } from './jobsApi'

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
}
