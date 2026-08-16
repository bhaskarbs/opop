import { useAuthStore } from '../stores/authStore'
import { blobRequest, request } from './apiClient'

export type BackendCompanySubscriptionPlan = 'FREE' | 'GROWTH' | 'ENTERPRISE'
export type CompanyBillingTransactionStatus = 'PENDING' | 'PAID' | 'FAILED'

export interface CompanyBillingTransactionSummary {
  id: string
  plan: BackendCompanySubscriptionPlan
  amountRupees: number
  status: CompanyBillingTransactionStatus
  // See candidate billingApi.ts's BillingTransactionSummary.invoiceAvailable.
  invoiceAvailable: boolean
  createdAt: string
}

export interface CompanyBillingSummary {
  currentPlan: BackendCompanySubscriptionPlan
  // Null for Free (or a company who's never subscribed). Paid plans expire 30 days after the
  // payment that (re)activated them — see CompanyBillingService.expireOverdueSubscriptions.
  currentPlanValidUntil: string | null
  history: CompanyBillingTransactionSummary[]
}

export interface CompanyCheckoutSummary {
  transactionId: string
  razorpayOrderId: string
  razorpayKeyId: string
  amountRupees: number
  plan: BackendCompanySubscriptionPlan
}

export interface CompanyVerifyCheckoutPayload {
  transactionId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const companyBillingApi = {
  mine: () => request<CompanyBillingSummary>('/api/company/billing', { headers: authHeaders() }),
  // Free downgrade only — upgrading to a paid plan goes through checkout()/verifyCheckout()
  // instead (see CompanyBillingService.changePlan).
  changePlan: (plan: BackendCompanySubscriptionPlan) =>
    request<CompanyBillingSummary>('/api/company/billing/plan', {
      method: 'POST',
      body: JSON.stringify({ plan }),
      headers: authHeaders(),
    }),
  checkout: (plan: BackendCompanySubscriptionPlan) =>
    request<CompanyCheckoutSummary>('/api/company/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
      headers: authHeaders(),
    }),
  verifyCheckout: (payload: CompanyVerifyCheckoutPayload) =>
    request<CompanyBillingSummary>('/api/company/billing/checkout/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: authHeaders(),
    }),
  // Only ever called for PAID history rows — see CompanyBillingService.generateInvoice.
  invoice: (transactionId: string) =>
    blobRequest(`/api/company/billing/transactions/${transactionId}/invoice`, authHeaders()),
}
