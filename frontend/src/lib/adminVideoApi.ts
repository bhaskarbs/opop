import { useAuthStore } from '../stores/authStore'
import { request, uploadRequest } from './apiClient'

export interface AdminSharedVideoSummary {
  id: string
  title: string
  contentType: string
  sizeBytes: number
  durationSeconds: number | null
  shareCount: number
  createdAt: string
}

// watchedPercent is null when the video's own durationSeconds is unknown (couldn't be read
// client-side at upload time) — maxWatchedSeconds is still meaningful on its own then, just not
// expressible as a percentage.
export interface AdminVideoShareSummary {
  id: string
  recipientName: string
  recipientEmail: string
  shareUrl: string
  maxWatchedSeconds: number
  watchedPercent: number | null
  viewCount: number
  firstViewedAt: string | null
  lastViewedAt: string | null
  createdAt: string
}

export interface CreateVideoSharePayload {
  recipientName: string
  recipientEmail: string
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const adminVideoApi = {
  list: () => request<AdminSharedVideoSummary[]>('/api/admin/videos', { headers: authHeaders() }),
  upload: (file: File, title: string, durationSeconds: number | null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)
    if (durationSeconds != null)
      formData.append('durationSeconds', String(Math.round(durationSeconds)))
    return uploadRequest<AdminSharedVideoSummary>('/api/admin/videos', formData, authHeaders())
  },
  delete: (id: string) =>
    request<void>(`/api/admin/videos/${id}`, { method: 'DELETE', headers: authHeaders() }),
  createShare: (videoId: string, payload: CreateVideoSharePayload) =>
    request<AdminVideoShareSummary>(`/api/admin/videos/${videoId}/shares`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  listShares: (videoId: string) =>
    request<AdminVideoShareSummary[]>(`/api/admin/videos/${videoId}/shares`, {
      headers: authHeaders(),
    }),
}
