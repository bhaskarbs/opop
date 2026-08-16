import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const EFFECTIVE_DATE = 'July 18, 2026'

interface Section {
  heading: string
  body: ReactNode
}

const SECTIONS: Section[] = [
  {
    heading: '1. Scope',
    body: (
      <p>
        This Refund and Cancellation Policy applies to paid subscription plans (currently Plus and
        Pro, priced in INR) purchased by candidates and companies on OpenOpportunity, and to any
        other paid feature we may introduce. It supplements, and should be read together with, our{' '}
        <a href="/terms-of-service" className="font-semibold text-primary">
          Terms of Service
        </a>
        .
      </p>
    ),
  },
  {
    heading: '2. Cancellation',
    body: (
      <p>
        You may cancel a paid plan at any time from your Billing page (Candidate Dashboard →
        Billing, or Company Dashboard → Billing). Cancelling stops future billing at the end of your
        current billing period — your plan remains active with its paid features until that period
        ends, after which your account moves to the Free plan.
      </p>
    ),
  },
  {
    heading: '3. Refunds',
    body: (
      <p>
        Fees already paid for a billing period are non-refundable, except where required by
        applicable law. Because paid features (e.g. increased visibility, candidate search, mock
        interview access) are made available immediately on payment, we do not offer prorated or
        partial refunds for early cancellation.
      </p>
    ),
  },
  {
    heading: '4. Failed or Duplicate Payments',
    body: (
      <p>
        If a payment fails but an amount is debited from your account, or if you are charged more
        than once for the same billing period due to a processing error, contact us with your
        payment reference and we will investigate and refund the erroneous amount to your original
        payment method, typically within 5–7 business days of confirmation.
      </p>
    ),
  },
  {
    heading: '5. How Refunds Are Processed',
    body: (
      <p>
        Approved refunds are issued through Razorpay to the original payment method used for the
        transaction. Depending on your bank or card issuer, it may take a few additional business
        days for the refund to reflect in your account after we initiate it.
      </p>
    ),
  },
  {
    heading: '6. Contact Us',
    body: (
      <p>
        For cancellation help, billing disputes, or refund requests, email{' '}
        <a href="mailto:customersupport@openopportunity.in" className="font-semibold text-primary">
          customersupport@openopportunity.in
        </a>{' '}
        with your account email and payment reference.
      </p>
    ),
  },
]

export default function RefundPolicyPage() {
  const { t } = useTranslation('layout')

  return (
    <main className="mx-auto max-w-[840px] px-6 py-14">
      <h1 className="mb-2 text-[32px] font-extrabold tracking-[-0.01em] text-ink">
        {t('footer.legal.refundPolicy')}
      </h1>
      <p className="mb-10 text-sm text-fog">Effective date: {EFFECTIVE_DATE}</p>
      <div className="flex flex-col gap-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2.5 text-[18px] font-bold text-ink">{section.heading}</h2>
            <div className="flex flex-col gap-3 text-[15px] leading-[1.7] text-slate">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
