import { request } from './apiClient'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestPayload {
  message: string
  history: ChatTurn[]
}

export interface ChatResponse {
  reply: string
}

export const chatApi = {
  // Public — the support widget has to work for a visitor who hasn't signed up yet (see
  // SecurityConfig/ChatController), so this never attaches an auth header.
  send: (payload: ChatRequestPayload) =>
    request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
