import { useAuthStore } from '../stores/authStore'
import { request, uploadRequest } from './apiClient'
import type { BackendExperienceLevel } from './jobsApi'

export type BackendNoticePeriod = 'IMMEDIATE' | 'DAYS_15' | 'MONTH_1' | 'MONTH_2' | 'MONTHS_3_PLUS'
export type BackendGender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'
export type BackendMaritalStatus =
  'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'PREFER_NOT_TO_SAY'

export interface CandidateProfileResponse {
  fullName: string
  email: string
  mobile: string
  mobileVerified: boolean
  location: string | null
  title: string | null
  experienceLevel: BackendExperienceLevel | null
  industry: string | null
  // Shown only on the candidate's own profile — deliberately absent from a company's view of a
  // candidate (CandidateProfileForCompany) or the search results list (CandidateSearchSummary),
  // since gender/marital status/date of birth are classic vectors for hiring bias.
  gender: BackendGender | null
  maritalStatus: BackendMaritalStatus | null
  dateOfBirth: string | null
  address: string | null
  languages: string[]
  skills: string[]
  resumeFileName: string | null
  resumeUploadedAt: string | null
  resumeSizeBytes: number | null
  // Relative path (e.g. "/api/candidates/{id}/photo") — prefix with API_BASE_URL for <img src>.
  photoUrl: string | null
  lifeGoals: string | null
  workCulture: string | null
  workModePreference: string | null
  openToPreference: string | null
  yearsOfExperience: number | null
  currentSalaryLakhs: number | null
  noticePeriod: BackendNoticePeriod | null
  educationDegree: string | null
  educationInstitution: string | null
  educationGraduationYear: number | null
  // Dashboard visibility stats — see CandidateDashboardPage.
  searchAppearanceCount: number
  profileViewCount: number
  createdAt: string
}

export interface ResumeUploadResponse {
  resumeFileName: string
  resumeUploadedAt: string
  resumeSizeBytes: number
}

export interface PhotoUploadResponse {
  photoUrl: string
}

export interface UpdatePersonalDetailsPayload {
  fullName: string
  location: string
  title: string
  mobile: string
  experienceLevel: BackendExperienceLevel | null
  industry: string
  gender: BackendGender | null
  maritalStatus: BackendMaritalStatus | null
  dateOfBirth: string | null
  address: string | null
  languages: string[]
}

export interface UpdateGoalsPayload {
  lifeGoals: string
  workCulture: string
}

export interface UpdatePreferencesPayload {
  workMode: string
  openTo: string
}

export interface UpdateBackgroundPayload {
  yearsOfExperience: number | null
  currentSalaryLakhs: number | null
  noticePeriod: BackendNoticePeriod | null
  educationDegree: string | null
  educationInstitution: string | null
  educationGraduationYear: number | null
}

// Work samples, research papers, and certifications are each managed independently of the main
// profile (own list/add/delete endpoints), not fields on CandidateProfileResponse — so a page
// only needs to touch these when it actually renders that section, same reasoning as resume/
// photo being separate upload endpoints rather than fields on UpdatePersonalDetailsPayload.
export interface CandidateWorkSampleSummary {
  id: string
  title: string
  url: string
  description: string | null
  createdAt: string
}

export interface CandidateResearchPaperSummary {
  id: string
  title: string
  url: string
  description: string | null
  createdAt: string
}

// logoUrl is null until a logo has been uploaded — relative path, prefix with API_BASE_URL for
// an <img src>, same convention as CandidateProfileResponse.photoUrl.
export interface CandidateCertificationSummary {
  id: string
  name: string
  certificationId: string | null
  certificationUrl: string | null
  logoUrl: string | null
  createdAt: string
}

export const WORK_SAMPLE_LIMIT = 10
export const RESEARCH_PAPER_LIMIT = 10
export const CERTIFICATION_LIMIT = 10

export interface AddWorkSamplePayload {
  title: string
  url: string
  description: string
}

export interface AddResearchPaperPayload {
  title: string
  url: string
  description: string
}

export interface AddCertificationPayload {
  name: string
  certificationId: string
  certificationUrl: string
  logo: File | null
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const candidateApi = {
  getProfile: () =>
    request<CandidateProfileResponse>('/api/candidate/profile', { headers: authHeaders() }),
  updatePersonalDetails: (payload: UpdatePersonalDetailsPayload) =>
    request<CandidateProfileResponse>('/api/candidate/profile/personal', {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  updateSkills: (skills: string[]) =>
    request<CandidateProfileResponse>('/api/candidate/profile/skills', {
      method: 'PATCH',
      body: JSON.stringify({ skills }),
      headers: authHeaders(),
    }),
  updateGoals: (payload: UpdateGoalsPayload) =>
    request<CandidateProfileResponse>('/api/candidate/profile/goals', {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  updateMobile: (mobile: string) =>
    request<CandidateProfileResponse>('/api/candidate/profile/mobile', {
      method: 'PATCH',
      body: JSON.stringify({ mobile }),
      headers: authHeaders(),
    }),
  updatePreferences: (payload: UpdatePreferencesPayload) =>
    request<CandidateProfileResponse>('/api/candidate/profile/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  updateBackground: (payload: UpdateBackgroundPayload) =>
    request<CandidateProfileResponse>('/api/candidate/profile/background', {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  uploadResume: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return uploadRequest<ResumeUploadResponse>('/api/candidate/resume', formData, authHeaders())
  },
  uploadPhoto: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return uploadRequest<PhotoUploadResponse>('/api/candidate/photo', formData, authHeaders())
  },
  listWorkSamples: () =>
    request<CandidateWorkSampleSummary[]>('/api/candidate/work-samples', {
      headers: authHeaders(),
    }),
  addWorkSample: (payload: AddWorkSamplePayload) =>
    request<CandidateWorkSampleSummary>('/api/candidate/work-samples', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  deleteWorkSample: (id: string) =>
    request<void>(`/api/candidate/work-samples/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  listResearchPapers: () =>
    request<CandidateResearchPaperSummary[]>('/api/candidate/research-papers', {
      headers: authHeaders(),
    }),
  addResearchPaper: (payload: AddResearchPaperPayload) =>
    request<CandidateResearchPaperSummary>('/api/candidate/research-papers', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  deleteResearchPaper: (id: string) =>
    request<void>(`/api/candidate/research-papers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  listCertifications: () =>
    request<CandidateCertificationSummary[]>('/api/candidate/certifications', {
      headers: authHeaders(),
    }),
  addCertification: (payload: AddCertificationPayload) => {
    const formData = new FormData()
    formData.append('name', payload.name)
    if (payload.certificationId) formData.append('certificationId', payload.certificationId)
    if (payload.certificationUrl) formData.append('certificationUrl', payload.certificationUrl)
    if (payload.logo) formData.append('logo', payload.logo)
    return uploadRequest<CandidateCertificationSummary>(
      '/api/candidate/certifications',
      formData,
      authHeaders(),
    )
  },
  deleteCertification: (id: string) =>
    request<void>(`/api/candidate/certifications/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
}
