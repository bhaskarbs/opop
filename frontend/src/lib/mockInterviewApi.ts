import { useAuthStore } from '../stores/authStore'
import { blobRequest, request, uploadRequest } from './apiClient'

export interface MockInterviewSessionSummary {
  id: string
  category: string
  questionCount: number
  durationSeconds: number
  hasThumbnail: boolean
  recordedAt: string
}

export interface MockInterviewUploadPayload {
  video: Blob
  thumbnail: Blob | null
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
    if (payload.thumbnail) formData.append('thumbnail', payload.thumbnail, 'thumbnail.jpg')
    formData.append('category', payload.category)
    formData.append('questionCount', String(payload.questionCount))
    formData.append('durationSeconds', String(payload.durationSeconds))
    return uploadRequest<MockInterviewSessionSummary>(
      '/api/candidate/mock-interviews',
      formData,
      authHeaders(),
    )
  },
  remove: (id: string) =>
    request<void>(`/api/candidate/mock-interviews/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  // Both return raw bytes — the caller wraps them in URL.createObjectURL() (see
  // MockInterviewPage), since <video src>/<img src> can't send an Authorization header.
  video: (id: string) => blobRequest(`/api/candidate/mock-interviews/${id}/video`, authHeaders()),
  thumbnail: (id: string) =>
    blobRequest(`/api/candidate/mock-interviews/${id}/thumbnail`, authHeaders()),
}
