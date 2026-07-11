import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type BackendEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP'
export type BackendExperienceLevel = 'ENTRY_LEVEL' | 'MID_LEVEL' | 'SENIOR' | 'LEADERSHIP'
export type BackendWorkMode = 'REMOTE' | 'HYBRID' | 'ON_SITE'
export type BackendJobStatus = 'ACTIVE' | 'DRAFT' | 'CLOSED'

export interface JobSummary {
  id: string
  title: string
  companyName: string
  location: string
  workMode: BackendWorkMode
  experienceLevel: BackendExperienceLevel
  employmentType: BackendEmploymentType
  salaryMinLakhs: number | null
  salaryMaxLakhs: number | null
  skills: string[]
  status: BackendJobStatus
  applicantCount: number
  createdAt: string
}

export interface JobDetail extends JobSummary {
  applicationDeadline: string | null
  aboutRole: string
  responsibilities: string[]
  requirements: string[]
}

export interface JobRequestPayload {
  title: string
  employmentType: BackendEmploymentType
  experienceLevel: BackendExperienceLevel
  workMode: BackendWorkMode
  location: string
  salaryMinLakhs: number | null
  salaryMaxLakhs: number | null
  applicationDeadline: string | null
  aboutRole: string
  responsibilities: string[]
  requirements: string[]
  skills: string[]
  status: BackendJobStatus
}

export interface JobSearchParams {
  q?: string
  location?: string
  level?: BackendExperienceLevel[]
  mode?: BackendWorkMode[]
  minSalaryLakhs?: number
  sort?: 'relevant' | 'newest' | 'salary'
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function buildQuery(params: JobSearchParams): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.location) search.set('location', params.location)
  if (params.minSalaryLakhs != null) search.set('minSalaryLakhs', String(params.minSalaryLakhs))
  if (params.sort) search.set('sort', params.sort)
  params.level?.forEach((level) => search.append('level', level))
  params.mode?.forEach((mode) => search.append('mode', mode))
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const jobsApi = {
  search: (params: JobSearchParams = {}) => request<JobSummary[]>(`/api/jobs${buildQuery(params)}`),
  detail: (id: string) => request<JobDetail>(`/api/jobs/${id}`),
  mine: () => request<JobSummary[]>('/api/jobs/mine', { headers: authHeaders() }),
  create: (payload: JobRequestPayload) =>
    request<JobDetail>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  update: (id: string, payload: JobRequestPayload) =>
    request<JobDetail>(`/api/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  remove: (id: string) =>
    request<void>(`/api/jobs/${id}`, { method: 'DELETE', headers: authHeaders() }),
}
