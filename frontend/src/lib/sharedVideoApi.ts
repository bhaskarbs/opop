import { API_BASE_URL, request } from './apiClient'

// Fully public — no auth headers anywhere in this file. The share token embedded in the URL is
// the only access control (see backend SharedVideoController/SecurityConfig's permitAll rule).
export interface SharedVideoMetadata {
  title: string
  videoUrl: string
  durationSeconds: number | null
}

export const sharedVideoApi = {
  getMetadata: (token: string) => request<SharedVideoMetadata>(`/api/shared-videos/${token}`),
  videoSrc: (token: string) => `${API_BASE_URL}/api/shared-videos/${token}/video`,
  recordProgress: (token: string, watchedSeconds: number) =>
    request<void>(`/api/shared-videos/${token}/progress`, {
      method: 'POST',
      body: JSON.stringify({ watchedSeconds: Math.round(watchedSeconds) }),
    }),
}
