import { useTranslation } from 'react-i18next'

type PlanKey = 'free' | 'plus' | 'pro'

const PLAN_KEYS: PlanKey[] = ['free', 'plus', 'pro']

// No billing/subscription backend exists yet — the candidate's plan is a fixed mock, same
// treatment as billing history below.
const CURRENT_PLAN: PlanKey = 'free'

const HISTORY = [
  {
    plan: 'Plus — Monthly',
    date: 'Jul 1, 2026',
    amount: '₹499',
    statusKey: 'billing.statusPaid' as const,
  },
  {
    plan: 'Plus — Monthly',
    date: 'Jun 1, 2026',
    amount: '₹499',
    statusKey: 'billing.statusPaid' as const,
  },
  { plan: 'Free', date: 'May 1, 2026', amount: '₹0', statusKey: 'billing.statusPaid' as const },
]

export default function CandidateBillingPage() {
  const { t } = useTranslation('candidate')

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('billing.title')}</h1>
      <p className="mb-6 text-sm text-slate">
        {t('billing.currentPlan', { plan: t(`billing.plans.${CURRENT_PLAN}.name`) })}
      </p>

      <div className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {PLAN_KEYS.map((key) => {
          const isCurrent = key === CURRENT_PLAN
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
                disabled={isCurrent}
                className={`rounded-[9px] border py-2.5 text-[13.5px] font-bold ${
                  isCurrent
                    ? 'border-border bg-neutral-tint text-fog'
                    : 'border-ink bg-ink text-white'
                }`}
              >
                {isCurrent
                  ? t('billing.currentPlanBadge')
                  : key === 'free'
                    ? t('billing.downgrade')
                    : t('billing.upgrade')}
              </button>
            </div>
          )
        })}
      </div>

      <h2 className="mb-3.5 text-[16.5px] font-bold text-ink">{t('billing.billingHistory')}</h2>
      <div className="flex flex-col gap-2.5">
        {HISTORY.map((entry, index) => (
          <div
            key={`${entry.plan}-${index}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-[18px] py-3.5"
          >
            <div className="text-[13.5px] font-semibold text-ink">{entry.plan}</div>
            <div className="text-[13px] text-fog">{entry.date}</div>
            <div className="text-[13.5px] font-bold text-ink">{entry.amount}</div>
            <span className="rounded-full bg-teal-tint px-2.5 py-1 text-xs font-semibold text-teal">
              {t(entry.statusKey)}
            </span>
            <a
              href="#invoice"
              onClick={(event) => event.preventDefault()}
              className="text-[12.5px] font-bold no-underline"
            >
              {t('billing.downloadInvoice')}
            </a>
          </div>
        ))}
      </div>
    </main>
  )
}
