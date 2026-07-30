import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'
import type { JobSummary } from './jobsApi'

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const savedJobsApi = {
  mine: () => request<JobSummary[]>('/api/candidate/saved-jobs', { headers: authHeaders() }),
  save: (jobId: string) =>
    request<void>(`/api/candidate/saved-jobs/${jobId}`, { method: 'POST', headers: authHeaders() }),
  unsave: (jobId: string) =>
    request<void>(`/api/candidate/saved-jobs/${jobId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
}
