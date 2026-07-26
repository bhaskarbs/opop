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

// Company-facing, unlike ApplicationSummary above (candidate-facing, no candidate identity in
// it) — backs the "view applicants" page reached from company/job-postings. contactNumber is
// null until this company has clicked "View contact" (see companyApi.revealCandidateContact),
// same reveal-gated pattern as candidate search.
export interface JobApplicantSummary {
  applicationId: string
  candidateUserId: string
  fullName: string
  title: string | null
  location: string | null
  skills: string[]
  status: ApplicationStatus
  appliedAt: string
  contactNumber: string | null
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
  forJob: (jobId: string) =>
    request<JobApplicantSummary[]>(`/api/applications/job/${jobId}`, { headers: authHeaders() }),
}
