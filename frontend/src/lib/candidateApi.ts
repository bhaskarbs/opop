import { useAuthStore } from '../stores/authStore'
import { request, uploadRequest } from './apiClient'
import type { BackendExperienceLevel } from './jobsApi'

export interface CandidateProfileResponse {
  fullName: string
  email: string
  mobile: string
  mobileVerified: boolean
  location: string | null
  title: string | null
  experienceLevel: BackendExperienceLevel | null
  industry: string | null
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
}

export interface UpdateGoalsPayload {
  lifeGoals: string
  workCulture: string
}

export interface UpdatePreferencesPayload {
  workMode: string
  openTo: string
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
}
