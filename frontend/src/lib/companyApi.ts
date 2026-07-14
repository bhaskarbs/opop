import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface CompanyProfileResponse {
  companyName: string
  email: string
  entityType: string
  industry: string
  verificationStatus: VerificationStatus
}

export interface CandidateSearchSummary {
  userId: string
  fullName: string
  title: string | null
  location: string | null
  skills: string[]
}

export interface CandidateSearchParams {
  q?: string
  location?: string
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function buildQuery(params: CandidateSearchParams): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.location) search.set('location', params.location)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const companyApi = {
  getProfile: () => request<CompanyProfileResponse>('/api/company/profile', { headers: authHeaders() }),
  searchCandidates: (params: CandidateSearchParams = {}) =>
    request<CandidateSearchSummary[]>(`/api/company/candidates${buildQuery(params)}`, {
      headers: authHeaders(),
    }),
}
