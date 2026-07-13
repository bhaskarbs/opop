import { useAuthStore } from '../stores/authStore'
import { uploadRequest } from './apiClient'

export interface ResumeUploadResponse {
  resumeFileName: string
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const candidateApi = {
  uploadResume: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return uploadRequest<ResumeUploadResponse>('/api/candidate/resume', formData, authHeaders())
  },
}
