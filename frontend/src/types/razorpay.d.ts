// Razorpay Checkout doesn't ship TypeScript types — this covers only what
// CandidateBillingPage.tsx actually uses. The script itself is loaded dynamically (see
// loadRazorpayCheckoutScript in that file), not bundled as an npm dependency.
interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name?: string
  description?: string
  handler: (response: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) => void
  modal?: {
    ondismiss?: () => void
  }
  theme?: {
    color?: string
  }
}

interface RazorpayCheckoutInstance {
  open: () => void
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance
  }
}

export {}
