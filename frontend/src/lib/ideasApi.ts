import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type BackendIdeaStage = 'CONCEPT' | 'PROTOTYPE' | 'LIVE'
export type BackendIdeaStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type BackendIdeaSubmitterRole = 'CANDIDATE' | 'COMPANY'
export type BackendIdeaInterestRole = 'INVESTOR' | 'PARTICIPANT'

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
  status: BackendIdeaStatus
  // True once the submitter has edited the idea at least once — the frontend uses this to tell
  // a re-review-after-edit PENDING idea apart from a brand new submission.
  edited: boolean
  interestedCount: number
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
  edited: boolean
  interestedCount: number
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

export interface IdeaInterestSummary {
  id: string
  interestedUserName: string
  role: BackendIdeaInterestRole
  ticketSize: string | null
  message: string | null
  // Only ever populated for the idea owner's own view, and only when they're entitled to see
  // it — a candidate on the Plus (or higher) plan (see billingApi). Null both when not entitled
  // and when the interested user has no mobile on file.
  contactNumber: string | null
  createdAt: string
}

export interface MyIdeaInterestSummary {
  id: string
  ideaId: string
  ideaTitle: string
  ideaSubmitterName: string
  role: BackendIdeaInterestRole
  ticketSize: string | null
  message: string | null
  createdAt: string
}

export interface IdeaInterestRequestPayload {
  role: BackendIdeaInterestRole
  ticketSize: string | null
  message: string | null
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
  mine: () => request<IdeaSummary[]>('/api/ideas/mine', { headers: authHeaders() }),
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
  remove: (id: string) =>
    request<void>(`/api/ideas/${id}`, { method: 'DELETE', headers: authHeaders() }),
  submitInterest: (id: string, payload: IdeaInterestRequestPayload) =>
    request<IdeaInterestSummary>(`/api/ideas/${id}/interests`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  // Owner-only server-side — see IdeaService.getInterests. Backs MyIdeasPage's applicant list.
  interests: (id: string) =>
    request<IdeaInterestSummary[]>(`/api/ideas/${id}/interests`, { headers: authHeaders() }),
  // The caller's own expressed interests across all ideas — backs ApplicationsPage's
  // Partnership tab (a candidate applying as investor/participant on someone's idea).
  myInterests: () =>
    request<MyIdeaInterestSummary[]>('/api/ideas/interests/mine', { headers: authHeaders() }),
}
