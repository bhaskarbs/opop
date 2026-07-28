import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { adminApi, type AdminDashboardStats, type AdminUserSummary } from '../../lib/adminApi'
import { ROUTES } from '../../routes/paths'

const RECENT_COMPANIES_LIMIT = 5

// Month labels ('Feb', 'Mar', ...) are short calendar abbreviations rendered as chart axis
// ticks — left as-is rather than localized, same as elsewhere digits/dates aren't translated.
const MONTHS = [
  { label: 'Feb', job: 60, partnership: 22, community: 18 },
  { label: 'Mar', job: 55, partnership: 25, community: 20 },
  { label: 'Apr', job: 58, partnership: 24, community: 22 },
  { label: 'May', job: 52, partnership: 28, community: 24 },
  { label: 'Jun', job: 50, partnership: 30, community: 26 },
  { label: 'Jul', job: 48, partnership: 30, community: 28 },
]

const STATUS_CLASS: Record<'VERIFIED' | 'PENDING' | 'REJECTED', string> = {
  VERIFIED: 'bg-teal-tint text-teal',
  PENDING: 'bg-amber-tint text-amber',
  REJECTED: 'bg-danger/10 text-danger',
}

const STATUS_LABEL_KEYS: Record<'VERIFIED' | 'PENDING' | 'REJECTED', string> = {
  VERIFIED: 'dashboard.companyStatus.verified',
  PENDING: 'dashboard.companyStatus.pendingReview',
  REJECTED: 'dashboard.companyStatus.rejected',
}

function formatRegisteredLabel(locale: string, createdAt: string): string {
  return new Date(createdAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation('admin')
  const localize = useLocalizedPath()
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [recentCompanies, setRecentCompanies] = useState<AdminUserSummary[]>([])

  useEffect(() => {
    adminApi
      .getDashboardStats()
      .then(setStats)
      .catch(() => {
        // Best-effort — the KPI cards just stay blank if this fails.
      })
  }, [])

  useEffect(() => {
    adminApi
      .users({ role: 'COMPANY' })
      .then((companies) => {
        const sorted = [...companies].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        setRecentCompanies(sorted.slice(0, RECENT_COMPANIES_LIMIT))
      })
      .catch(() => {
        // Best-effort — the table just stays empty if this fails.
      })
  }, [])

  const kpis = [
    { labelKey: 'dashboard.kpis.totalCandidates', value: stats?.totalCandidates ?? null },
    { labelKey: 'dashboard.kpis.registeredCompanies', value: stats?.registeredCompanies ?? null },
    { labelKey: 'dashboard.kpis.liveJobPostings', value: stats?.liveJobPostings ?? null },
    { labelKey: 'dashboard.kpis.partnershipMatches', value: stats?.partnershipMatches ?? null },
    { labelKey: 'dashboard.kpis.communitySignUps', value: stats?.communitySignUps ?? null },
  ]

  // pct is always relative to totalCandidates ("Registered", stage 1 = 100%) — each later
  // stage is a subset of registered candidates, not of the previous stage.
  const registeredCount = stats?.totalCandidates ?? 0
  function pctOfRegistered(count: number): number {
    return registeredCount === 0 ? 0 : Math.round((count / registeredCount) * 100)
  }
  const funnel = stats
    ? [
        {
          labelKey: 'dashboard.funnel.registered',
          value: stats.totalCandidates,
          pct: 100,
        },
        {
          labelKey: 'dashboard.funnel.appliedToJob',
          value: stats.candidatesAppliedToJob,
          pct: pctOfRegistered(stats.candidatesAppliedToJob),
        },
        {
          labelKey: 'dashboard.funnel.appliedForPartnership',
          value: stats.candidatesAppliedForPartnership,
          pct: pctOfRegistered(stats.candidatesAppliedForPartnership),
        },
      ]
    : []

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <h1 className="mb-5 text-[22px] font-extrabold text-ink">{t('dashboard.title')}</h1>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.labelKey}
            className="rounded-card border border-border bg-surface px-5 py-[18px]"
          >
            <div className="mb-1.5 text-[13px] text-fog">{t(kpi.labelKey)}</div>
            <div className="text-2xl font-extrabold text-ink">
              {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : '…'}
            </div>
          </div>
        ))}
      </div>

      <div className="header:grid-cols-[1.4fr_1fr] mb-6 grid grid-cols-1 gap-4">
        <div className="rounded-card border border-border bg-surface p-[22px]">
          <h2 className="mb-4 text-[15px] font-bold text-ink">
            {t('dashboard.applicationsByPath')}
          </h2>
          <div className="flex h-40 items-end gap-3.5">
            {MONTHS.map((month) => (
              <div
                key={month.label}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              >
                <div className="flex h-full w-full flex-col justify-end gap-0.5">
                  <div
                    className="rounded-t-[3px] bg-teal"
                    style={{ height: `${month.community}%` }}
                  />
                  <div className="bg-amber" style={{ height: `${month.partnership}%` }} />
                  <div className="bg-primary" style={{ height: `${month.job}%` }} />
                </div>
                <div className="text-[11.5px] text-fog">{month.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3.5 flex justify-center gap-4">
            <div className="flex items-center gap-1.5 text-[12.5px] text-slate">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
              {t('dashboard.legend.jobs')}
            </div>
            <div className="flex items-center gap-1.5 text-[12.5px] text-slate">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber" />
              {t('dashboard.legend.partnerships')}
            </div>
            <div className="flex items-center gap-1.5 text-[12.5px] text-slate">
              <span className="h-2.5 w-2.5 rounded-sm bg-teal" />
              {t('dashboard.legend.community')}
            </div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-[22px]">
          <h2 className="mb-4 text-[15px] font-bold text-ink">{t('dashboard.candidateFunnel')}</h2>
          {funnel.map((stage) => (
            <div key={stage.labelKey} className="mb-3.5">
              <div className="mb-1 flex justify-between text-[13px] text-[#3A414D]">
                <span>{t(stage.labelKey)}</span>
                <strong className="text-ink">{stage.value.toLocaleString()}</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-tint">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${stage.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-[22px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-[15px] font-bold text-ink">
            {t('dashboard.recentCompanyRegistrations')}
          </h2>
          <Link
            to={`${localize(ROUTES.adminUsers)}?tab=companies`}
            className="text-[13px] font-bold text-primary no-underline"
          >
            {t('dashboard.manageAll')}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-[12.5px] tracking-[0.03em] text-fog uppercase">
                <th className="py-0 pr-3 pb-2.5 font-semibold">{t('dashboard.table.company')}</th>
                <th className="px-3 pb-2.5 font-semibold">{t('dashboard.table.sector')}</th>
                <th className="px-3 pb-2.5 font-semibold">{t('dashboard.table.cin')}</th>
                <th className="px-3 pb-2.5 font-semibold">{t('dashboard.table.registered')}</th>
                <th className="pb-2.5 font-semibold">{t('dashboard.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {recentCompanies.map((company) => (
                <tr key={company.id} className="border-t border-[#F0F1F3]">
                  <td className="py-3 pr-3 font-bold text-ink">{company.fullName}</td>
                  <td className="p-3 text-[#3A414D]">{company.industry ?? '—'}</td>
                  <td className="p-3 font-mono text-[12.5px] text-fog">{company.cin ?? '—'}</td>
                  <td className="p-3 text-fog">
                    {formatRegisteredLabel(i18n.language, company.createdAt)}
                  </td>
                  <td className="py-3">
                    {company.verificationStatus && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[company.verificationStatus]}`}
                      >
                        {t(STATUS_LABEL_KEYS[company.verificationStatus])}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {recentCompanies.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate">
                    {t('dashboard.noRecentCompanies')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
