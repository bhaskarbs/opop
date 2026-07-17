import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type BackendIdeaStage = 'CONCEPT' | 'PROTOTYPE' | 'LIVE'
export type BackendIdeaStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type BackendIdeaSubmitterRole = 'CANDIDATE' | 'COMPANY'

export interface IdeaSummary {
  id: string
  title: string
  category: string
  stage: BackendIdeaStage
  problem: string
  submitterName: string
  submitterRole: BackendIdeaSubmitterRole
  funding: string | null
  teamSize: number | null
  timeline: string | null
  createdAt: string
}

export interface IdeaDetail {
  id: string
  submitterName: string
  submitterRole: BackendIdeaSubmitterRole
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

export interface IdeaBrowseParams {
  q?: string
  category?: string
  stage?: BackendIdeaStage
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

function buildBrowseQuery(params: IdeaBrowseParams): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.category) search.set('category', params.category)
  if (params.stage) search.set('stage', params.stage)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const ideasApi = {
  browse: (params: IdeaBrowseParams = {}) =>
    request<IdeaSummary[]>(`/api/ideas${buildBrowseQuery(params)}`),
  // Public detail — an anonymous visitor can fetch an APPROVED idea, and the backend also
  // allows the owner to fetch their own PENDING/REJECTED one (see IdeaSubmitPage's edit flow).
  // Auth headers are attached whenever a token exists so that owner check can succeed; they're
  // simply ignored server-side for a logged-out visitor.
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
