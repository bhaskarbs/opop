import { useAuthStore } from '../stores/authStore'
import { request, uploadRequest } from './apiClient'

export type BackendEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP'
export type BackendExperienceLevel = 'ENTRY_LEVEL' | 'MID_LEVEL' | 'SENIOR' | 'LEADERSHIP'
export type BackendWorkMode = 'REMOTE' | 'HYBRID' | 'ON_SITE'
// ACTIVE and REJECTED are admin-only transitions (see Step 18's admin job-approval flow) —
// a company can only ever request DRAFT or PENDING_APPROVAL when creating/updating a job.
export type BackendJobStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'CLOSED'

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
  // Null unless the posting company has uploaded a logo (see companyApi.uploadLogo) — used by
  // job search results and the job detail page to show it instead of the initial-letter badge.
  companyLogoUrl: string | null
  // Backs the "Promoted" / "Featured" badges — also what JobService ranks above everyone else
  // in search results, featured leading promoted. isPromoted mirrors a candidate's Plus-plan
  // boost one level up: it reflects the posting *company's* plan (GROWTH/ENTERPRISE).
  isPromoted: boolean
  isFeatured: boolean
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
  q?: string[]
  location?: string[]
  level?: BackendExperienceLevel[]
  mode?: BackendWorkMode[]
  minSalaryLakhs?: number
  sort?: 'relevant' | 'newest' | 'salary'
  // 0-indexed, matching the backend (see JobController.search) — omit to get page 0.
  page?: number
  // Capped server-side at 50 (JobService.MAX_SEARCH_PAGE_SIZE) regardless of what's requested.
  size?: number
}

// page/size in the response are what the backend actually applied after its own bounds-clamping
// (see JobService.search), not necessarily an echo of the request — a huge or negative size gets
// silently clamped rather than trusted verbatim.
export interface JobSearchResult {
  jobs: JobSummary[]
  page: number
  size: number
  totalCount: number
  totalPages: number
}

// companyName here is the display-name override when one is set (same resolved value as every
// other job listing — see JobService#displayCompanyName); realCompanyName is always the real
// owning account's name regardless of any override, so an admin can tell the two apart on
// AdminJobsPage's list. The two only ever visibly differ on a job with an active override — see
// AdminJobSummary.java.
export interface AdminJobSummary extends JobSummary {
  realCompanyName: string
}

export interface AdminJobSearchResult {
  jobs: AdminJobSummary[]
  page: number
  size: number
  totalCount: number
  totalPages: number
}

// Admin browsing across every status (AdminJobsPage's status filter) — see jobsApi.adminSearch.
// Unlike JobSearchParams above, an absent/empty `status` means "every status", not "no filter
// applied to an otherwise-ACTIVE-only listing" — see JobController#adminSearch.
export interface AdminJobSearchParams {
  status?: BackendJobStatus[]
  q?: string
  page?: number
  size?: number
}

function buildAdminSearchQuery(params: AdminJobSearchParams): string {
  const search = new URLSearchParams()
  params.status?.forEach((status) => search.append('status', status))
  if (params.q) search.set('q', params.q)
  if (params.page != null) search.set('page', String(params.page))
  if (params.size != null) search.set('size', String(params.size))
  const query = search.toString()
  return query ? `?${query}` : ''
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function buildQuery(params: JobSearchParams): string {
  const search = new URLSearchParams()
  params.q?.forEach((keyword) => search.append('q', keyword))
  params.location?.forEach((location) => search.append('location', location))
  if (params.minSalaryLakhs != null) search.set('minSalaryLakhs', String(params.minSalaryLakhs))
  if (params.sort) search.set('sort', params.sort)
  params.level?.forEach((level) => search.append('level', level))
  params.mode?.forEach((mode) => search.append('mode', mode))
  if (params.page != null) search.set('page', String(params.page))
  if (params.size != null) search.set('size', String(params.size))
  const query = search.toString()
  return query ? `?${query}` : ''
}

/** Full public link for a job — same-origin (window.location.origin), hardcoding the "en"
 * locale segment same as mockInterviewShareUrl (see that function's comment for why: a link's
 * locale shouldn't vary by whatever language the sharer happened to be browsing in). Only ever
 * meaningful for a job whose status is ACTIVE — that's the only status a non-owner can view (see
 * JobService#get) — callers on a company/admin management view that lists every status must gate
 * this to ACTIVE rows themselves. */
export function jobShareUrl(jobId: string): string {
  return `${window.location.origin}/en/jobs/${jobId}`
}

export const jobsApi = {
  search: (params: JobSearchParams = {}) =>
    request<JobSearchResult>(`/api/jobs${buildQuery(params)}`),
  // Admin browsing across every status (AdminJobsPage's status filter) — unlike search() above,
  // this isn't limited to ACTIVE jobs, so a job an admin saves as DRAFT/CLOSED/REJECTED still
  // shows up somewhere. See JobController#adminSearch.
  adminSearch: (params: AdminJobSearchParams = {}) =>
    request<AdminJobSearchResult>(`/api/jobs/admin${buildAdminSearchQuery(params)}`, {
      headers: authHeaders(),
    }),
  // GET /{id} is public (an anonymous visitor only ever sees an ACTIVE job — see
  // JobService.get), but attaching the auth header when we have one lets a logged-in company
  // load its own DRAFT/PENDING_APPROVAL/REJECTED/CLOSED posting too (see PostJobPage's edit
  // mode) — otherwise the backend has no way to recognize the caller as the owner and 404s.
  detail: (id: string) => request<JobDetail>(`/api/jobs/${id}`, { headers: authHeaders() }),
  mine: () => request<JobSummary[]>('/api/jobs/mine', { headers: authHeaders() }),
  // Admin-only read that bypasses the ACTIVE-or-owner restriction on detail() above — needed so
  // AdminJobsPage's edit form can load a DRAFT/PENDING_APPROVAL/REJECTED/CLOSED job it doesn't
  // own. See JobController#adminDetail.
  adminDetail: (id: string) =>
    request<JobDetail>(`/api/jobs/${id}/admin`, { headers: authHeaders() }),
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
  // Admin posting on behalf of a company (AdminJobsPage) — see JobController#adminCreate.
  // Unlike create(), the admin can pick any status (including ACTIVE) and any company.
  adminCreate: (companyId: string, payload: JobRequestPayload) =>
    request<JobDetail>(`/api/jobs/admin?companyId=${encodeURIComponent(companyId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  // Admin edit of any job regardless of owning company — see JobController#adminUpdate.
  adminUpdate: (id: string, payload: JobRequestPayload) =>
    request<JobDetail>(`/api/jobs/${id}/admin`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  // Sets or clears (blank/null) the display name shown for this job instead of the owning
  // company's real name — see JobController#adminUpdateBranding.
  adminUpdateBranding: (id: string, displayCompanyName: string | null) =>
    request<JobDetail>(`/api/jobs/${id}/admin/branding`, {
      method: 'PUT',
      body: JSON.stringify({ displayCompanyName }),
      headers: authHeaders(),
    }),
  // Uploads a custom logo shown for this job instead of the owning company's own logo — see
  // JobController#adminUploadLogo.
  adminUploadLogo: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return uploadRequest<JobDetail>(`/api/jobs/${id}/admin/logo`, formData, authHeaders())
  },
  // Reverts a job back to the owning company's own logo — see JobController#adminRemoveLogo.
  adminRemoveLogo: (id: string) =>
    request<JobDetail>(`/api/jobs/${id}/admin/logo`, { method: 'DELETE', headers: authHeaders() }),
}

/** TanStack Query cache keys for the two read paths worth caching client-side (see
 * lib/queryClient.ts) — shared between JobSearchPage and JobDetailPage so an identical search
 * (e.g. JobDetailPage's "similar jobs" sort:"newest" fetch) reuses a cache entry either page
 * already populated instead of re-hitting the backend. */
export const jobQueryKeys = {
  search: (params: JobSearchParams) => ['jobs', 'search', params] as const,
  detail: (id: string) => ['jobs', 'detail', id] as const,
}
