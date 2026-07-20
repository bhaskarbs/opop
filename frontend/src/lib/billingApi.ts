import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type BackendSubscriptionPlan = 'FREE' | 'PLUS' | 'PRO'
export type BillingTransactionStatus = 'PAID'

export interface BillingTransactionSummary {
  id: string
  plan: BackendSubscriptionPlan
  amountRupees: number
  status: BillingTransactionStatus
  createdAt: string
}

export interface CandidateBillingSummary {
  currentPlan: BackendSubscriptionPlan
  history: BillingTransactionSummary[]
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const billingApi = {
  mine: () =>
    request<CandidateBillingSummary>('/api/candidate/billing', { headers: authHeaders() }),
  changePlan: (plan: BackendSubscriptionPlan) =>
    request<CandidateBillingSummary>('/api/candidate/billing/plan', {
      method: 'POST',
      body: JSON.stringify({ plan }),
      headers: authHeaders(),
    }),
}
