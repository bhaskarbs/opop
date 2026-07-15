import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface CompanyProfileResponse {
  companyName: string
  email: string
  // Null until the company fills these in (see CompanyProfilePage) — always null right after
  // Google sign-in, since Google never supplies CIN/GSTIN/PAN/etc.
  entityType: string | null
  cin: string | null
  gstin: string | null
  pan: string | null
  industry: string | null
  address: string | null
  signatoryName: string | null
  verificationStatus: VerificationStatus
  // True once every field above is filled in. Posting jobs and (see SearchCandidatesPage)
  // contacting candidates both require this AND verificationStatus === 'VERIFIED'.
  profileComplete: boolean
}

export interface UpdateCompanyProfilePayload {
  entityType: string
  cin: string
  gstin: string
  pan: string
  industry: string
  address: string
  signatoryName: string
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
  getProfile: () =>
    request<CompanyProfileResponse>('/api/company/profile', { headers: authHeaders() }),
  updateProfile: (payload: UpdateCompanyProfilePayload) =>
    request<CompanyProfileResponse>('/api/company/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  searchCandidates: (params: CandidateSearchParams = {}) =>
    request<CandidateSearchSummary[]>(`/api/company/candidates${buildQuery(params)}`, {
      headers: authHeaders(),
    }),
}
