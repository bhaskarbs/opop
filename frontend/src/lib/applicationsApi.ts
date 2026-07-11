import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type ApplicationStatus = 'APPLIED' | 'UNDER_REVIEW' | 'REJECTED' | 'WITHDRAWN'

export interface ApplicationSummary {
  id: string
  jobId: string
  jobTitle: string
  companyName: string
  status: ApplicationStatus
  appliedAt: string
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const applicationsApi = {
  apply: (jobId: string) =>
    request<ApplicationSummary>('/api/applications', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
      headers: authHeaders(),
    }),
  withdraw: (applicationId: string) =>
    request<ApplicationSummary>(`/api/applications/${applicationId}/withdraw`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  mine: () => request<ApplicationSummary[]>('/api/applications/mine', { headers: authHeaders() }),
}
