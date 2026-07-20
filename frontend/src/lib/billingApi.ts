import { useAuthStore } from '../stores/authStore'
import { request } from './apiClient'

export type BackendSubscriptionPlan = 'FREE' | 'PLUS' | 'PRO'
export type BillingTransactionStatus = 'PENDING' | 'PAID' | 'FAILED'

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

export interface CheckoutSummary {
  transactionId: string
  razorpayOrderId: string
  razorpayKeyId: string
  amountRupees: number
  plan: BackendSubscriptionPlan
}

export interface VerifyCheckoutPayload {
  transactionId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const billingApi = {
  mine: () =>
    request<CandidateBillingSummary>('/api/candidate/billing', { headers: authHeaders() }),
  // Free downgrade only — upgrading to a paid plan goes through checkout()/verifyCheckout()
  // instead (see CandidateBillingService.changePlan).
  changePlan: (plan: BackendSubscriptionPlan) =>
    request<CandidateBillingSummary>('/api/candidate/billing/plan', {
      method: 'POST',
      body: JSON.stringify({ plan }),
      headers: authHeaders(),
    }),
  checkout: (plan: BackendSubscriptionPlan) =>
    request<CheckoutSummary>('/api/candidate/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
      headers: authHeaders(),
    }),
  verifyCheckout: (payload: VerifyCheckoutPayload) =>
    request<CandidateBillingSummary>('/api/candidate/billing/checkout/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
}
