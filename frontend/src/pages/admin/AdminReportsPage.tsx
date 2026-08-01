import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  adminApi,
  type AdminCandidateReportStats,
  type AdminCommunityInterestSummary,
  type AdminEmployerReportStats,
  type AdminFinancialReportStats,
  type AdminPartnershipReportStats,
} from '../../lib/adminApi'

type Tab = 'candidates' | 'employers' | 'partnerships' | 'community' | 'financial'

const TABS: Array<{ key: Tab; labelKey: string }> = [
  { key: 'candidates', labelKey: 'reports.tabs.candidates' },
  { key: 'employers', labelKey: 'reports.tabs.employers' },
  { key: 'partnerships', labelKey: 'reports.tabs.partnerships' },
  { key: 'community', labelKey: 'reports.tabs.community' },
  { key: 'financial', labelKey: 'reports.tabs.financial' },
]

interface Kpi {
  labelKey: string
  value: string
  trend?: string
  trendMuted?: boolean
}

function candidateKpis(stats: AdminCandidateReportStats | null): Kpi[] {
  return [
    {
      labelKey: 'reports.candidates.totalRegistered',
      value: stats ? stats.totalRegistered.toLocaleString() : '…',
    },
    {
      labelKey: 'reports.candidates.resumesUploaded',
      value: stats ? stats.resumesUploaded.toLocaleString() : '…',
    },
    {
      labelKey: 'reports.candidates.mockInterviewsTaken',
      value: stats ? stats.mockInterviewsTaken.toLocaleString() : '…',
    },
  ]
}

function employerKpis(stats: AdminEmployerReportStats | null): Kpi[] {
  return [
    {
      labelKey: 'reports.employers.registeredCompanies',
      value: stats ? stats.registeredCompanies.toLocaleString() : '…',
    },
    {
      labelKey: 'reports.employers.verifiedCompanies',
      value: stats ? stats.verifiedCompanies.toLocaleString() : '…',
    },
    {
      labelKey: 'reports.employers.liveJobPostings',
      value: stats ? stats.liveJobPostings.toLocaleString() : '…',
    },
  ]
}

function partnershipKpis(stats: AdminPartnershipReportStats | null): Kpi[] {
  return [
    {
      labelKey: 'reports.partnerships.totalPartnershipMatches',
      value: stats ? stats.totalPartnershipMatches.toLocaleString() : '…',
    },
    {
      labelKey: 'reports.partnerships.startupsOffering',
      value: stats ? stats.startupsOffering.toLocaleString() : '…',
    },
  ]
}

function partnershipTracks(stats: AdminPartnershipReportStats) {
  const total = stats.fundedListings + stats.listingsWithoutFunding
  const fundedPct = total === 0 ? 0 : Math.round((stats.fundedListings / total) * 100)
  const withoutFundingPct = total === 0 ? 0 : 100 - fundedPct
  return [
    {
      labelKey: 'reports.partnerships.funded',
      value: `${stats.fundedListings.toLocaleString()} (${fundedPct}%)`,
      pct: fundedPct,
      colorClass: 'bg-primary',
      textColorClass: 'text-primary',
    },
    {
      labelKey: 'reports.partnerships.withoutFunding',
      value: `${stats.listingsWithoutFunding.toLocaleString()} (${withoutFundingPct}%)`,
      pct: withoutFundingPct,
      colorClass: 'bg-teal',
      textColorClass: 'text-teal',
    },
  ]
}

function formatSubmittedDate(locale: string, submittedAt: string): string {
  return new Date(submittedAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function financialKpis(stats: AdminFinancialReportStats | null): Kpi[] {
  return [
    {
      labelKey: 'reports.financial.totalRevenue',
      value: stats ? `₹${stats.totalRevenueRupees.toLocaleString()}` : '…',
    },
    {
      labelKey: 'reports.financial.candidateSubscriptions',
      value: stats ? `₹${stats.candidateSubscriptionRevenueRupees.toLocaleString()}` : '…',
    },
    {
      labelKey: 'reports.financial.companySubscriptions',
      value: stats ? `₹${stats.companySubscriptionRevenueRupees.toLocaleString()}` : '…',
    },
  ]
}

function financialRevenueRows(stats: AdminFinancialReportStats) {
  const share = (amountRupees: number) =>
    stats.totalRevenueRupees === 0 ? 0 : Math.round((amountRupees / stats.totalRevenueRupees) * 100)
  return [
    {
      labelKey: 'reports.financial.candidateSubscriptions',
      amount: stats.candidateSubscriptionRevenueRupees,
      share: share(stats.candidateSubscriptionRevenueRupees),
    },
    {
      labelKey: 'reports.financial.companySubscriptions',
      amount: stats.companySubscriptionRevenueRupees,
      share: share(stats.companySubscriptionRevenueRupees),
    },
  ]
}

function KpiRow({ t, kpis }: { t: TFunction<'admin'>; kpis: Kpi[] }) {
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
      {kpis.map((kpi) => (
        <div
          key={kpi.labelKey}
          className="rounded-card border border-border bg-surface px-5 py-[18px]"
        >
          <div className="mb-1.5 text-[13px] text-fog">{t(kpi.labelKey)}</div>
          <div className="text-[22px] font-extrabold text-ink">{kpi.value}</div>
          {kpi.trend && (
            <div className={`mt-1 text-[12.5px] ${kpi.trendMuted ? 'text-fog' : 'text-teal'}`}>
              {kpi.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AdminReportsPage() {
  const { t, i18n } = useTranslation('admin')
  const [tab, setTab] = useState<Tab>('candidates')
  const [candidateStats, setCandidateStats] = useState<AdminCandidateReportStats | null>(null)
  const [employerStats, setEmployerStats] = useState<AdminEmployerReportStats | null>(null)
  const [partnershipStats, setPartnershipStats] = useState<AdminPartnershipReportStats | null>(null)
  const [communitySubmissions, setCommunitySubmissions] = useState<
    AdminCommunityInterestSummary[] | null
  >(null)
  const [financialStats, setFinancialStats] = useState<AdminFinancialReportStats | null>(null)

  useEffect(() => {
    adminApi
      .getCandidateReportStats()
      .then(setCandidateStats)
      .catch(() => {
        // Best-effort — the KPI cards just stay blank if this fails.
      })
  }, [])

  useEffect(() => {
    adminApi
      .getEmployerReportStats()
      .then(setEmployerStats)
      .catch(() => {
        // Best-effort — the KPI cards/table just stay blank if this fails.
      })
  }, [])

  useEffect(() => {
    adminApi
      .getPartnershipReportStats()
      .then(setPartnershipStats)
      .catch(() => {
        // Best-effort — the KPI cards/track breakdown just stay blank if this fails.
      })
  }, [])

  useEffect(() => {
    adminApi
      .getCommunityInterestSubmissions()
      .then(setCommunitySubmissions)
      .catch(() => {
        // Best-effort — the list just stays blank if this fails.
      })
  }, [])

  useEffect(() => {
    adminApi
      .getFinancialReportStats()
      .then(setFinancialStats)
      .catch(() => {
        // Best-effort — the KPI cards/revenue table just stay blank if this fails.
      })
  }, [])

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('reports.title')}</h1>
          <p className="text-sm text-slate">{t('reports.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <select className="rounded-lg border border-border bg-surface px-3 py-2.5 text-[13.5px] text-ink">
            <option>{t('reports.dateRange.last30Days')}</option>
            <option>{t('reports.dateRange.last90Days')}</option>
            <option>{t('reports.dateRange.last6Months')}</option>
            <option>{t('reports.dateRange.yearToDate')}</option>
          </select>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-[18px] py-2.5 text-[13.5px] font-bold text-ink"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#14181F"
              strokeWidth={2}
            >
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            {t('reports.exportCsv')}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-5 border-b border-border">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => setTab(tabItem.key)}
            className={`border-b-2 py-2.5 text-sm font-bold ${
              tab === tabItem.key ? 'border-primary text-ink' : 'border-transparent text-fog'
            }`}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'candidates' && <KpiRow t={t} kpis={candidateKpis(candidateStats)} />}

      {tab === 'employers' && (
        <>
          <KpiRow t={t} kpis={employerKpis(employerStats)} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">
              {t('reports.employers.topHiringSectors')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-xs text-fog uppercase">
                    <th className="py-0 pr-3 pb-2.5 font-semibold">
                      {t('reports.employers.table.sector')}
                    </th>
                    <th className="px-3 pb-2.5 font-semibold">
                      {t('reports.employers.table.openJobs')}
                    </th>
                    <th className="pb-2.5 font-semibold">
                      {t('reports.employers.table.applications')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(employerStats?.topHiringSectors ?? []).map((sector) => (
                    <tr key={sector.sector} className="border-t border-[#F0F1F3]">
                      <td className="py-3 pr-3 font-bold text-ink">{sector.sector}</td>
                      <td className="p-3 text-[#3A414D]">{sector.openJobs.toLocaleString()}</td>
                      <td className="py-3 text-[#3A414D]">
                        {sector.applications.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {employerStats && employerStats.topHiringSectors.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate">
                        {t('reports.employers.noSectors')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'partnerships' && (
        <>
          <KpiRow t={t} kpis={partnershipKpis(partnershipStats)} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">
              {t('reports.partnerships.byTrack')}
            </h2>
            {partnershipStats && partnershipStats.startupsOffering === 0 && (
              <p className="text-sm text-slate">{t('reports.partnerships.noListings')}</p>
            )}
            {partnershipStats && partnershipStats.startupsOffering > 0 && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
                {partnershipTracks(partnershipStats).map((track) => (
                  <div key={track.labelKey}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`text-[13.5px] font-bold ${track.textColorClass}`}>
                        {t(track.labelKey)}
                      </span>
                      <span className="text-[13px] text-fog">{track.value}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-tint">
                      <div
                        className={`h-full rounded-full ${track.colorClass}`}
                        style={{ width: `${track.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'community' && (
        <div className="rounded-card border border-border bg-surface p-[22px]">
          <h2 className="mb-4 text-[15px] font-bold text-ink">{t('reports.community.heading')}</h2>
          {communitySubmissions && communitySubmissions.length === 0 && (
            <p className="text-sm text-slate">{t('reports.community.none')}</p>
          )}
          {communitySubmissions && communitySubmissions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-xs text-fog uppercase">
                    <th className="py-0 pr-3 pb-2.5 font-semibold">
                      {t('reports.community.table.name')}
                    </th>
                    <th className="px-3 pb-2.5 font-semibold">
                      {t('reports.community.table.company')}
                    </th>
                    <th className="px-3 pb-2.5 font-semibold">
                      {t('reports.community.table.email')}
                    </th>
                    <th className="px-3 pb-2.5 font-semibold">
                      {t('reports.community.table.phone')}
                    </th>
                    <th className="pb-2.5 font-semibold">
                      {t('reports.community.table.submitted')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {communitySubmissions.map((submission) => (
                    <tr key={submission.id} className="border-t border-[#F0F1F3]">
                      <td className="py-3 pr-3 font-bold text-ink">{submission.name}</td>
                      <td className="p-3 text-[#3A414D]">
                        {submission.companyName ?? t('reports.community.notProvided')}
                      </td>
                      <td className="p-3 text-[#3A414D]">{submission.email}</td>
                      <td className="p-3 text-[#3A414D]">
                        {submission.phone ?? t('reports.community.notProvided')}
                      </td>
                      <td className="py-3 text-[#3A414D]">
                        {formatSubmittedDate(i18n.language, submission.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'financial' && (
        <>
          <KpiRow t={t} kpis={financialKpis(financialStats)} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">
              {t('reports.financial.byRevenue')}
            </h2>
            {financialStats && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-[13.5px]">
                  <thead>
                    <tr className="text-left text-xs text-fog uppercase">
                      <th className="py-0 pr-3 pb-2.5 font-semibold">
                        {t('reports.financial.table.source')}
                      </th>
                      <th className="px-3 pb-2.5 font-semibold">
                        {t('reports.financial.table.amount')}
                      </th>
                      <th className="pb-2.5 font-semibold">{t('reports.financial.table.share')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialRevenueRows(financialStats).map((row) => (
                      <tr key={row.labelKey} className="border-t border-[#F0F1F3]">
                        <td className="py-3 pr-3 font-bold text-ink">{t(row.labelKey)}</td>
                        <td className="p-3 text-[#3A414D]">₹{row.amount.toLocaleString()}</td>
                        <td className="py-3 text-[#3A414D]">{row.share}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  )
}
