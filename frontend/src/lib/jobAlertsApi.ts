import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'
import type { BackendExperienceLevel, BackendWorkMode } from './jobsApi'

export interface JobAlertSummary {
  id: string
  keywords: string[]
  locations: string[]
  experienceLevel: BackendExperienceLevel | null
  workMode: BackendWorkMode | null
  createdAt: string
}

export interface JobAlertRequestPayload {
  keywords: string[]
  locations: string[]
  experienceLevel: BackendExperienceLevel | null
  workMode: BackendWorkMode | null
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const jobAlertsApi = {
  mine: () => request<JobAlertSummary[]>('/api/candidate/job-alerts', { headers: authHeaders() }),
  create: (payload: JobAlertRequestPayload) =>
    request<JobAlertSummary>('/api/candidate/job-alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  remove: (id: string) =>
    request<void>(`/api/candidate/job-alerts/${id}`, { method: 'DELETE', headers: authHeaders() }),
}
