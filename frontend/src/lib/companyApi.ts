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

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const companyApi = {
  getProfile: () => request<CompanyProfileResponse>('/api/company/profile', { headers: authHeaders() }),
}
