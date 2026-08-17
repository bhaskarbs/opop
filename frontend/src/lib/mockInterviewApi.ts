import { useAuthStore } from '../stores/authStore'
import { blobRequest, request, uploadRequest } from './apiClient'
import type { BackendExperienceLevel } from './jobsApi'

export type MockInterviewQuestionDifficulty = 'EASY' | 'NORMAL' | 'DIFFICULT' | 'VERY_DIFFICULT'

// One question in a generated session, already ordered easy to very difficult by the backend
// (see MockInterviewQuestionService.getSessionQuestions) — skills is what MockInterviewPage
// highlights alongside the question text so the candidate knows what it's testing.
export interface MockInterviewSessionQuestion {
  text: string
  skills: string[]
  difficulty: MockInterviewQuestionDifficulty | null
}

export interface MockInterviewSessionSummary {
  id: string
  questionCount: number
  durationSeconds: number
  hasThumbnail: boolean
  recordedAt: string
  // Off by default — a company only ever sees this session once the candidate opts it in (see
  // mockInterviewApi.updateVisibility). Shown on the candidate's own "Recorded logs" list as a
  // toggle; also embedded (always true) on a company's view of the candidate's profile.
  visibleToCompanies: boolean
}

export interface GenerateQuestionsPayload {
  skills: string[]
  experienceLevel: BackendExperienceLevel | null
  industry: string | null
  count: number
}

export interface MockInterviewUploadPayload {
  video: Blob
  thumbnail: Blob | null
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
  // LLM-generated (Claude) — MockInterviewPage falls back to its own local template generator
  // if this fails, so a candidate can always start a session.
  generateQuestions: (payload: GenerateQuestionsPayload) =>
    request<{ questions: MockInterviewSessionQuestion[] }>(
      '/api/candidate/mock-interviews/questions',
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: authHeaders(),
      },
    ),
  upload: (payload: MockInterviewUploadPayload) => {
    const formData = new FormData()
    formData.append('video', payload.video, 'interview.webm')
    if (payload.thumbnail) formData.append('thumbnail', payload.thumbnail, 'thumbnail.jpg')
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
  updateVisibility: (id: string, visible: boolean) =>
    request<MockInterviewSessionSummary>(`/api/candidate/mock-interviews/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ visible }),
      headers: authHeaders(),
    }),
  // Both return raw bytes — the caller wraps them in URL.createObjectURL() (see
  // MockInterviewPage), since <video src>/<img src> can't send an Authorization header.
  video: (id: string) => blobRequest(`/api/candidate/mock-interviews/${id}/video`, authHeaders()),
  thumbnail: (id: string) =>
    blobRequest(`/api/candidate/mock-interviews/${id}/thumbnail`, authHeaders()),
}
