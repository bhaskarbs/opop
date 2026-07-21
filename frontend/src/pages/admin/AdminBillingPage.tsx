import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/apiClient'
import { adminApi, type AdminCandidateSubscriptionSummary } from '../../lib/adminApi'

type UpgradeDecision = 'approved' | 'rejected'
type SubTab = 'candidates' | 'companies'

// No aggregate revenue/MRR backend exists yet — these figures are a fixed mock, same treatment
// as AdminDashboardPage's platform stats. The candidate subscriptions list below this, though,
// is wired to the real admin candidate-billing endpoints.
const STATS = [
  {
    labelKey: 'billing.stats.mrr',
    value: '₹8,42,600',
    delta: '+12% vs last month',
    positive: true,
  },
  {
    labelKey: 'billing.stats.activeSubscriptions',
    value: '312',
    delta: '+18 this month',
    positive: true,
  },
  { labelKey: 'billing.stats.pendingUpgrades', value: '3', delta: '', positive: false },
  { labelKey: 'billing.stats.churned', value: '4', delta: '-2 vs last month', positive: true },
]

const REQUESTS = [
  {
    id: 'r1',
    name: 'Sahaay Finance Ltd.',
    type: 'Company',
    from: 'Free',
    to: 'Growth',
    date: '2 days ago',
  },
  {
    id: 'r2',
    name: 'Rohan Mehta',
    type: 'Candidate',
    from: 'Free',
    to: 'Plus',
    date: '3 days ago',
  },
  {
    id: 'r3',
    name: 'Northstar EdTech',
    type: 'Company',
    from: 'Growth',
    to: 'Enterprise',
    date: '5 days ago',
  },
]

const COMPANY_SUBS = [
  { name: 'Vertex Robotics Pvt. Ltd.', plan: 'Enterprise', since: 'Mar 3, 2026' },
  { name: 'Sahaay Finance Ltd.', plan: 'Free', since: 'Jul 2, 2026' },
  { name: 'Northstar EdTech', plan: 'Growth', since: 'Feb 18, 2026' },
]

const INVOICES = [
  {
    name: 'Rohan Mehta',
    plan: 'Plus',
    date: 'Jul 1, 2026',
    amount: '₹499',
    statusKey: 'billing.statusPaid' as const,
  },
  {
    name: 'Vertex Robotics Pvt. Ltd.',
    plan: 'Enterprise',
    date: 'Jul 1, 2026',
    amount: '₹14,999',
    statusKey: 'billing.statusPaid' as const,
  },
  {
    name: 'Northstar EdTech',
    plan: 'Growth',
    date: 'Jul 1, 2026',
    amount: '₹4,999',
    statusKey: 'billing.statusPaid' as const,
  },
  {
    name: 'Karan Patel',
    plan: 'Pro',
    date: 'Jun 30, 2026',
    amount: '₹1,499',
    statusKey: 'billing.statusFailed' as const,
  },
]

const PLAN_BADGE_CLASSES: Record<string, string> = {
  Free: 'bg-neutral-tint text-slate',
  Plus: 'bg-primary-tint text-primary',
  Pro: 'bg-[#FFF6E9] text-[#8A5A0F]',
  Growth: 'bg-primary-tint text-primary',
  Enterprise: 'bg-[#FFF6E9] text-[#8A5A0F]',
}

const PLAN_LABELS: Record<AdminCandidateSubscriptionSummary['plan'], string> = {
  FREE: 'Free',
  PLUS: 'Plus',
  PRO: 'Pro',
}

function formatValidUntil(locale: string, validUntil: string | null): string | null {
  if (!validUntil) return null
  return new Date(validUntil).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AdminBillingPage() {
  const { t, i18n } = useTranslation('admin')
  const [tab, setTab] = useState<SubTab>('candidates')
  const [decisions, setDecisions] = useState<Record<string, UpgradeDecision>>({})

  const [candidates, setCandidates] = useState<AdminCandidateSubscriptionSummary[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)
  const [candidatesError, setCandidatesError] = useState<string | null>(null)
  const [actioningCandidateId, setActioningCandidateId] = useState<string | null>(null)

  const requests = REQUESTS.map((request) => ({ ...request, decision: decisions[request.id] }))

  useEffect(() => {
    let cancelled = false
    adminApi
      .candidateSubscriptions()
      .then((result) => {
        if (!cancelled) setCandidates(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setCandidatesError(
            caught instanceof ApiError ? caught.message : t('billing.candidatePlans.loadError'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCandidatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  async function handleSetCandidatePlan(candidateId: string, plan: 'FREE' | 'PLUS') {
    if (plan === 'FREE' && !window.confirm(t('billing.candidatePlans.confirmDowngrade'))) return
    setActioningCandidateId(candidateId)
    try {
      const updated = await adminApi.setCandidatePlan(candidateId, plan)
      setCandidates((prev) =>
        prev.map((existing) => (existing.candidateId === candidateId ? updated : existing)),
      )
    } catch {
      // Best-effort — the row simply keeps its current plan if the call fails.
    } finally {
      setActioningCandidateId(null)
    }
  }

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('billing.title')}</h1>
      <p className="mb-[22px] text-sm text-slate">{t('billing.subtitle')}</p>

      <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {STATS.map((stat) => (
          <div
            key={stat.labelKey}
            className="rounded-card border border-border bg-surface px-5 py-[18px]"
          >
            <div className="mb-1.5 text-xs tracking-[0.03em] text-fog uppercase">
              {t(stat.labelKey)}
            </div>
            <div className="text-[22px] font-extrabold text-ink">{stat.value}</div>
            {stat.delta && (
              <div className={`mt-1 text-[12.5px] ${stat.positive ? 'text-teal' : 'text-amber'}`}>
                {stat.delta}
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-3.5 text-[16.5px] font-bold text-ink">
        {t('billing.pendingUpgradeRequests')}
      </h2>
      <div className="mb-8 flex flex-col gap-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface px-5 py-4"
          >
            <div>
              <div className="text-sm font-bold text-ink">
                {request.name} <span className="font-medium text-fog">· {request.type}</span>
              </div>
              <div className="mt-0.5 text-[13px] text-slate">
                {t('billing.requestMeta', {
                  from: request.from,
                  to: request.to,
                  date: request.date,
                })}
              </div>
            </div>
            {!request.decision && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDecisions((prev) => ({ ...prev, [request.id]: 'approved' }))}
                  className="rounded-[7px] bg-teal px-4 py-2 text-[12.5px] font-bold text-white"
                >
                  {t('billing.approve')}
                </button>
                <button
                  type="button"
                  onClick={() => setDecisions((prev) => ({ ...prev, [request.id]: 'rejected' }))}
                  className="rounded-[7px] border border-[#FCA5A5] bg-surface px-4 py-2 text-[12.5px] font-bold text-danger"
                >
                  {t('billing.reject')}
                </button>
              </div>
            )}
            {request.decision === 'approved' && (
              <span className="text-[12.5px] font-bold text-teal">{t('billing.approved')}</span>
            )}
            {request.decision === 'rejected' && (
              <span className="text-[12.5px] font-bold text-danger">{t('billing.rejected')}</span>
            )}
          </div>
        ))}
      </div>

      <div className="mb-[18px] flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('candidates')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'candidates'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          {t('users.tabs.candidates')}
        </button>
        <button
          type="button"
          onClick={() => setTab('companies')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'companies'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          {t('users.tabs.companies')}
        </button>
      </div>

      <div className="mb-8 flex flex-col gap-2.5">
        {tab === 'companies' &&
          COMPANY_SUBS.map((sub) => (
            <div
              key={sub.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-[18px] py-3.5"
            >
              <div className="text-[13.5px] font-bold text-ink">{sub.name}</div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${PLAN_BADGE_CLASSES[sub.plan]}`}
              >
                {sub.plan}
              </span>
              <div className="text-[13px] text-fog">{t('billing.since', { date: sub.since })}</div>
            </div>
          ))}

        {tab === 'candidates' && candidatesError && (
          <div className="rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
            {candidatesError}
          </div>
        )}

        {tab === 'candidates' && candidatesLoading && (
          <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
            {t('billing.candidatePlans.loading')}
          </div>
        )}

        {tab === 'candidates' &&
          !candidatesLoading &&
          !candidatesError &&
          candidates.map((candidate) => {
            const planLabel = PLAN_LABELS[candidate.plan]
            const validUntil = formatValidUntil(i18n.language, candidate.validUntil)
            const isActioning = actioningCandidateId === candidate.candidateId
            return (
              <div
                key={candidate.candidateId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-[18px] py-3.5"
              >
                <div>
                  <div className="text-[13.5px] font-bold text-ink">{candidate.fullName}</div>
                  <div className="text-[12.5px] text-fog">{candidate.email}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${PLAN_BADGE_CLASSES[planLabel]}`}
                >
                  {planLabel}
                </span>
                <div className="text-[13px] text-fog">
                  {validUntil ? t('billing.since', { date: validUntil }) : ''}
                </div>
                <div className="flex gap-2">
                  {candidate.plan !== 'FREE' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleSetCandidatePlan(candidate.candidateId, 'FREE')}
                      className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                    >
                      {t('billing.candidatePlans.downgradeToFree')}
                    </button>
                  )}
                  {candidate.plan !== 'PLUS' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleSetCandidatePlan(candidate.candidateId, 'PLUS')}
                      className="rounded-md border border-border bg-primary-tint px-3.5 py-1.5 text-[12.5px] font-bold text-primary disabled:opacity-60"
                    >
                      {t('billing.candidatePlans.upgradeToPlus')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

        {tab === 'candidates' &&
          !candidatesLoading &&
          !candidatesError &&
          candidates.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
              {t('billing.candidatePlans.none')}
            </div>
          )}
      </div>

      <h2 className="mb-3.5 text-[16.5px] font-bold text-ink">{t('billing.invoiceHistory')}</h2>
      <div className="flex flex-col gap-2.5">
        {INVOICES.map((invoice, index) => (
          <div
            key={`${invoice.name}-${index}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-[18px] py-3.5"
          >
            <div className="text-[13.5px] font-semibold text-ink">{invoice.name}</div>
            <div className="text-[13px] text-fog">{invoice.plan}</div>
            <div className="text-[13px] text-fog">{invoice.date}</div>
            <div className="text-[13.5px] font-bold text-ink">{invoice.amount}</div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                invoice.statusKey === 'billing.statusPaid'
                  ? 'bg-teal-tint text-teal'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              {t(invoice.statusKey)}
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
