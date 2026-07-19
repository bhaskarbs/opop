import { useAuthStore } from '../stores/authStore'
import { blobRequest, request, uploadRequest } from './apiClient'

export interface MockInterviewSessionSummary {
  id: string
  category: string
  questionCount: number
  durationSeconds: number
  recordedAt: string
}

export interface MockInterviewUploadPayload {
  video: Blob
  category: string
  questionCount: number
  durationSeconds: number
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const mockInterviewApi = {
  mine: () =>
    request<MockInterviewSessionSummary[]>('/api/candidate/mock-interviews', {
      headers: authHeaders(),
    }),
  upload: (payload: MockInterviewUploadPayload) => {
    const formData = new FormData()
    formData.append('video', payload.video, 'interview.webm')
    formData.append('category', payload.category)
    formData.append('questionCount', String(payload.questionCount))
    formData.append('durationSeconds', String(payload.durationSeconds))
    return uploadRequest<MockInterviewSessionSummary>(
      '/api/candidate/mock-interviews',
      formData,
      authHeaders(),
    )
  },
  // Returns the raw video bytes — the caller wraps it in URL.createObjectURL() for playback
  // (see MockInterviewPage), since <video src> can't send an Authorization header itself.
  video: (id: string) => blobRequest(`/api/candidate/mock-interviews/${id}/video`, authHeaders()),
}
