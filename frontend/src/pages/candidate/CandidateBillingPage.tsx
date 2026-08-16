import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingState, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import {
  billingApi,
  type BackendSubscriptionPlan,
  type BillingTransactionSummary,
} from '../../lib/billingApi'

type PlanKey = 'free' | 'plus' | 'pro'

// 'pro' commented out per request — Pro plan hidden from candidates for now. Its content stays
// in candidate.json's billing.plans.pro so it's a one-line change to bring back.
const PLAN_KEYS: PlanKey[] = ['free', 'plus' /* , 'pro' */]

// Razorpay live checkout isn't approved yet (business category under review) — paid plans are
// activated manually by support in the meantime (see the contact banner below). Flip back to
// true to re-enable self-serve upgrade/renew once live checkout is back, same idiom as Footer's
// SHOW_SOCIAL_LINKS.
const ENABLE_PLAN_UPGRADE = false

const WHATSAPP_NUMBER = '918088076264'
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hi, I want to activate the Plus plan on OpenOpportunity.',
)}`

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

// Billing history accrues one row per renewal, so it can grow long for an old account — show a
// first page and let the candidate reveal the rest instead of dumping the full list at once.
const HISTORY_PAGE_SIZE = 5

function toPlanKey(plan: BackendSubscriptionPlan): PlanKey {
  return plan.toLowerCase() as PlanKey
}

function toBackendPlan(key: PlanKey): BackendSubscriptionPlan {
  return key.toUpperCase() as BackendSubscriptionPlan
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Loads the Razorpay Checkout script at most once per page load — cheap to call from every
 * upgrade click, since a second call is a no-op once the tag is already in the DOM. */
function loadRazorpayCheckoutScript(): Promise<void> {
  if (document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SRC}"]`)) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = RAZORPAY_CHECKOUT_SRC
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'))
    document.body.appendChild(script)
  })
}

export default function CandidateBillingPage() {
  const { t } = useTranslation('candidate')

  const [currentPlan, setCurrentPlan] = useState<PlanKey>('free')
  const [currentPlanValidUntil, setCurrentPlanValidUntil] = useState<string | null>(null)
  const [history, setHistory] = useState<BillingTransactionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [changingPlan, setChangingPlan] = useState<PlanKey | null>(null)
  const [changeError, setChangeError] = useState<string | null>(null)
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE_SIZE)

  useEffect(() => {
    let cancelled = false
    billingApi
      .mine()
      .then((summary) => {
        if (cancelled) return
        setCurrentPlan(toPlanKey(summary.currentPlan))
        setCurrentPlanValidUntil(summary.currentPlanValidUntil)
        setHistory(summary.history)
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(caught instanceof ApiError ? caught.message : t('billing.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  /** Free is the only instant path — no money involved. Upgrading to a paid plan goes through
   * handleUpgrade's real Razorpay checkout instead (see CandidateBillingService.changePlan). */
  async function handleDowngradeToFree() {
    setChangeError(null)
    setChangingPlan('free')
    try {
      const summary = await billingApi.changePlan('FREE')
      setCurrentPlan(toPlanKey(summary.currentPlan))
      setCurrentPlanValidUntil(summary.currentPlanValidUntil)
      setHistory(summary.history)
    } catch (caught) {
      setChangeError(caught instanceof ApiError ? caught.message : t('billing.changeError'))
    } finally {
      setChangingPlan(null)
    }
  }

  async function handleUpgrade(key: PlanKey) {
    setChangeError(null)
    setChangingPlan(key)
    try {
      await loadRazorpayCheckoutScript()
      const checkout = await billingApi.checkout(toBackendPlan(key))

      const razorpay = new window.Razorpay({
        key: checkout.razorpayKeyId,
        amount: checkout.amountRupees * 100,
        currency: 'INR',
        order_id: checkout.razorpayOrderId,
        name: 'OpenOpportunity',
        description: t(`billing.plans.${key}.name`),
        handler: (response) => {
          billingApi
            .verifyCheckout({
              transactionId: checkout.transactionId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            .then((summary) => {
              setCurrentPlan(toPlanKey(summary.currentPlan))
              setCurrentPlanValidUntil(summary.currentPlanValidUntil)
              setHistory(summary.history)
            })
            .catch((caught) => {
              setChangeError(caught instanceof ApiError ? caught.message : t('billing.changeError'))
            })
            .finally(() => setChangingPlan(null))
        },
        modal: {
          ondismiss: () => setChangingPlan(null),
        },
      })
      razorpay.open()
    } catch (caught) {
      setChangeError(caught instanceof ApiError ? caught.message : t('billing.changeError'))
      setChangingPlan(null)
    }
  }

  async function handleDownloadInvoice(transactionId: string) {
    setInvoiceError(null)
    setDownloadingInvoiceId(transactionId)
    try {
      const blob = await billingApi.invoice(transactionId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${transactionId.slice(0, 8)}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (caught) {
      setInvoiceError(caught instanceof ApiError ? caught.message : t('billing.invoiceError'))
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1080px] px-6 py-7 pb-16">
        <LoadingState message={t('billing.loading')} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('billing.title')}</h1>
      <p className={`text-sm text-slate ${currentPlanValidUntil ? 'mb-1' : 'mb-6'}`}>
        {t('billing.currentPlan', { plan: t(`billing.plans.${currentPlan}.name`) })}
      </p>
      {currentPlanValidUntil && (
        <p className="mb-6 text-[15px] text-fog">
          <span className="font-bold">
            {t('billing.validUntil', { date: formatDate(currentPlanValidUntil) })}
          </span>{' '}
          {t('billing.validUntilNote')}
        </p>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {loadError}
        </div>
      )}
      {changeError && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {changeError}
        </div>
      )}
      {invoiceError && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {invoiceError}
        </div>
      )}

      <div className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {PLAN_KEYS.map((key) => {
          const isCurrent = key === currentPlan
          const isChanging = changingPlan === key
          const features = t(`billing.plans.${key}.features`, { returnObjects: true }) as string[]
          return (
            <div
              key={key}
              className={`relative flex flex-col rounded-2xl border-2 bg-surface p-[26px] ${
                isCurrent ? 'border-primary' : 'border-border'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-[11px] left-6 rounded-full bg-primary px-3 py-[3px] text-[11px] font-bold text-white">
                  {t('billing.currentPlanBadge')}
                </span>
              )}
              <div className="mb-1.5 text-sm font-bold text-ink">
                {t(`billing.plans.${key}.name`)}
              </div>
              <div className="mb-4">
                <span className="text-[28px] font-extrabold text-ink">
                  {t(`billing.plans.${key}.price`)}
                </span>
                <span className="text-[13px] text-fog">{t(`billing.plans.${key}.period`)}</span>
              </div>
              <div className="mb-[22px] flex flex-1 flex-col gap-2.5">
                {features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0F8A6B"
                      strokeWidth={2.5}
                      className="mt-0.5 shrink-0"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span className="text-[13px] leading-[1.5] text-[#3A414D]">{feature}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={
                  (isCurrent && key === 'free') ||
                  (key !== 'free' && !ENABLE_PLAN_UPGRADE) ||
                  changingPlan !== null
                }
                onClick={() => (key === 'free' ? handleDowngradeToFree() : handleUpgrade(key))}
                className={`flex items-center justify-center gap-2 rounded-[9px] border py-2.5 text-[13.5px] font-bold disabled:cursor-not-allowed ${
                  isCurrent && key === 'free'
                    ? 'border-border bg-neutral-tint text-fog'
                    : 'border-ink bg-ink text-white disabled:opacity-60'
                }`}
              >
                {isChanging && <Spinner className="h-3.5 w-3.5" />}
                {isCurrent && key === 'free'
                  ? t('billing.currentPlanBadge')
                  : isChanging
                    ? t('billing.changing')
                    : key === 'free'
                      ? t('billing.downgrade')
                      : isCurrent
                        ? t('billing.renew')
                        : t('billing.upgrade')}
              </button>
            </div>
          )
        })}
      </div>

      {!ENABLE_PLAN_UPGRADE && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-3.5 rounded-xl border border-border bg-neutral-tint px-7 py-7 text-[25px] text-slate">
          <span>{t('billing.contactToActivate.prefix')}</span>
          <a
            href="mailto:customersupport@openopportunity.in"
            className="font-semibold text-primary"
          >
            customersupport@openopportunity.in
          </a>
          <span>{t('billing.contactToActivate.orCall')}</span>
          <a href="tel:+918088076264" className="font-semibold text-primary">
            +91 80880 76264
          </a>
          <span>{t('billing.contactToActivate.orWhatsapp')}</span>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-primary"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="12" fill="#25D366" />
              <path
                d="M12.04 5.5c-3.6 0-6.52 2.92-6.52 6.52 0 1.15.3 2.27.88 3.26L5.5 18.5l3.33-.87a6.5 6.5 0 0 0 3.21.85h.003c3.6 0 6.52-2.92 6.52-6.52 0-1.74-.68-3.38-1.91-4.61a6.48 6.48 0 0 0-4.6-1.91Zm3.83 9.32c-.16.46-.93.88-1.28.93-.33.05-.74.07-1.19-.08a10.9 10.9 0 0 1-1.06-.39c-1.87-.81-3.09-2.7-3.18-2.82-.09-.13-.76-1.01-.76-1.93 0-.92.48-1.37.65-1.56.17-.19.37-.23.5-.23l.36.01c.11 0 .27-.04.42.32.16.37.53 1.29.58 1.38.05.09.08.2.02.33-.06.13-.09.2-.19.31l-.28.33c-.09.09-.19.2-.08.38.11.19.48.8 1.04 1.29.71.63 1.31.83 1.5.92.19.09.3.08.41-.05.11-.12.47-.55.59-.74.13-.19.25-.16.42-.09.17.06 1.09.51 1.28.6.19.1.31.14.36.22.05.08.05.45-.11.9Z"
                fill="#fff"
              />
            </svg>
            {t('billing.contactToActivate.whatsapp')}
          </a>
        </div>
      )}

      <h2 className="mb-3.5 text-[16.5px] font-bold text-ink">{t('billing.billingHistory')}</h2>
      {history.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('billing.noHistory')}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {history.slice(0, historyShown).map((entry) => {
            const planKey = toPlanKey(entry.plan)
            const planLabel =
              planKey === 'free'
                ? t(`billing.plans.${planKey}.name`)
                : `${t(`billing.plans.${planKey}.name`)} — Monthly`
            return (
              <div
                key={entry.id}
                className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr_1.2fr] items-center gap-3 rounded-xl border border-border bg-surface px-[18px] py-3.5"
              >
                <div className="text-[13.5px] font-semibold text-ink">{planLabel}</div>
                <div className="text-[13px] text-fog">{formatDate(entry.createdAt)}</div>
                <div className="text-[13.5px] font-bold text-ink">
                  ₹{entry.amountRupees.toLocaleString()}
                </div>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                    entry.status === 'PAID'
                      ? 'bg-teal-tint text-teal'
                      : entry.status === 'FAILED'
                        ? 'bg-[#FDECEC] text-danger'
                        : 'bg-amber-tint text-amber'
                  }`}
                >
                  {entry.status === 'PAID'
                    ? t('billing.statusPaid')
                    : entry.status === 'FAILED'
                      ? t('billing.statusFailed')
                      : t('billing.statusPending')}
                </span>
                {entry.status === 'PAID' && entry.invoiceAvailable && (
                  <button
                    type="button"
                    disabled={downloadingInvoiceId === entry.id}
                    onClick={() => handleDownloadInvoice(entry.id)}
                    className="flex items-center justify-self-end gap-1.5 text-[12.5px] font-bold text-primary disabled:opacity-60"
                  >
                    {downloadingInvoiceId === entry.id && <Spinner className="h-3.5 w-3.5" />}
                    {downloadingInvoiceId === entry.id
                      ? t('billing.downloadingInvoice')
                      : t('billing.downloadInvoice')}
                  </button>
                )}
              </div>
            )
          })}
          {historyShown < history.length && (
            <button
              type="button"
              onClick={() => setHistoryShown((prev) => prev + HISTORY_PAGE_SIZE)}
              className="mt-1 self-center text-[13px] font-bold text-primary"
            >
              {t('billing.showMoreHistory')}
            </button>
          )}
        </div>
      )}
    </main>
  )
}
