import { request } from './apiClient'

export interface CommunityInterestPayload {
  name: string
  companyName: string | null
  email: string
  phone: string | null
}

export const communityApi = {
  // Public — anyone can submit this, signed in or not (see SecurityConfig); the form itself
  // carries whatever contact details the backend needs, so there's no session lookup involved.
  notifyInterest: (payload: CommunityInterestPayload) =>
    request<void>('/api/community/interest', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
