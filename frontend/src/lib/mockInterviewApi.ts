import { useAuthStore } from '../stores/authStore'
import { API_BASE_URL, blobRequest, request, uploadRequest } from './apiClient'
import type { BackendExperienceLevel } from './jobsApi'

export type MockInterviewQuestionDifficulty = 'EASY' | 'NORMAL' | 'DIFFICULT' | 'VERY_DIFFICULT'

// One question in a generated session, already grouped by skill (in the order the candidate
// selected their own skills, general/no-skill questions last) and, within each skill, ordered
// easy to very difficult by the backend (see
// MockInterviewQuestionService.getSessionQuestions/groupBySkillThenDifficulty) — skills is what
// MockInterviewPage highlights alongside the question text so the candidate knows what it's
// testing. The backend also never repeats a question it's already asked this candidate before
// (see MockInterviewAskedQuestion).
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
  // Raw token, not a full URL — see mockInterviewShareUrl. Public on its own (the backend's
  // /api/mock-interview-shares/{token}/video route needs no auth), so this alone is what a
  // candidate copies to share the recording with anyone.
  shareToken: string
}

/** Full public link for a session's shareToken — same-origin (window.location.origin), not
 * API_BASE_URL, since /watch-interview is a frontend route, not a backend one (see App.tsx /
 * ROUTES.watchMockInterview). Hardcodes the "en" locale segment rather than the candidate's own
 * current locale, same choice AdminVideoService#shareUrl makes server-side — a link's locale
 * shouldn't vary by whatever language the sharer happened to be browsing in when they copied it. */
export function mockInterviewShareUrl(shareToken: string): string {
  return `${window.location.origin}/en/watch-interview/${shareToken}`
}

// Fully public — no auth headers, matches the backend's permitAll route (see
// MockInterviewShareController). Used as a plain <video src> on WatchMockInterviewPage.
export function mockInterviewShareVideoSrc(shareToken: string): string {
  return `${API_BASE_URL}/api/mock-interview-shares/${shareToken}/video`
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
