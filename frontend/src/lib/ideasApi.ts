import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type BackendIdeaStage = 'CONCEPT' | 'PROTOTYPE' | 'LIVE'
export type BackendIdeaStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface IdeaDetail {
  id: string
  submitterName: string
  title: string
  category: string
  stage: BackendIdeaStage
  problem: string
  solution: string
  targetMarket: string
  funding: string | null
  equity: string | null
  teamSize: number | null
  timeline: string | null
  videoLink: string | null
  contactEmail: string
  status: BackendIdeaStatus
  createdAt: string
}

export interface IdeaRequestPayload {
  title: string
  category: string
  stage: BackendIdeaStage
  problem: string
  solution: string
  targetMarket: string
  funding: string | null
  equity: string | null
  teamSize: number | null
  timeline: string | null
  videoLink: string | null
  contactEmail: string
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const ideasApi = {
  get: (id: string) => request<IdeaDetail>(`/api/ideas/${id}`, { headers: authHeaders() }),
  create: (payload: IdeaRequestPayload) =>
    request<IdeaDetail>('/api/ideas', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  update: (id: string, payload: IdeaRequestPayload) =>
    request<IdeaDetail>(`/api/ideas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
}
