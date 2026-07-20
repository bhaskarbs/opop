import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type NotificationType =
  | 'JOB_APPROVED'
  | 'JOB_REJECTED'
  | 'IDEA_APPROVED'
  | 'IDEA_REJECTED'
  | 'IDEA_INTEREST_RECEIVED'
  | 'COMPANY_VERIFIED'
  | 'COMPANY_REJECTED'
  | 'APPLICATION_STATUS_CHANGED'

export interface NotificationSummary {
  id: string
  type: NotificationType
  message: string
  // App-relative route (no /:lang prefix — the caller localizes it), or null if there's nothing
  // to navigate to.
  link: string | null
  read: boolean
  createdAt: string
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const notificationsApi = {
  mine: () => request<NotificationSummary[]>('/api/notifications', { headers: authHeaders() }),
  unreadCount: () =>
    request<{ count: number }>('/api/notifications/unread-count', { headers: authHeaders() }),
  markRead: (id: string) =>
    request<NotificationSummary>(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  markAllRead: () =>
    request<void>('/api/notifications/read-all', { method: 'POST', headers: authHeaders() }),
}
