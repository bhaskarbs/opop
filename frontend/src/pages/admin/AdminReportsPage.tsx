import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

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
  trend: string
  trendMuted?: boolean
}

const CANDIDATE_KPIS: Kpi[] = [
  { labelKey: 'reports.candidates.totalRegistered', value: '84,210', trend: '+1,204 this period' },
  { labelKey: 'reports.candidates.activeJobSeekers', value: '52,340', trend: '+890 this period' },
  {
    labelKey: 'reports.candidates.resumesUploaded',
    value: '79,880',
    trend: '95% of registered',
    trendMuted: true,
  },
  {
    labelKey: 'reports.candidates.mockInterviewsTaken',
    value: '18,210',
    trend: '+2,110 this period',
  },
]

const CANDIDATE_OUTCOMES = [
  { labelKey: 'reports.candidates.hiredViaJobListing', value: '9,880', pct: 100, colorClass: 'bg-primary' },
  { labelKey: 'reports.candidates.enteredPartnership', value: '4,120', pct: 42, colorClass: 'bg-amber' },
  { labelKey: 'reports.candidates.joinedCommunityRole', value: '3,340', pct: 34, colorClass: 'bg-teal' },
  { labelKey: 'reports.candidates.stillSearching', value: '38,900', pct: 74, colorClass: 'bg-fog' },
]

const EMPLOYER_KPIS: Kpi[] = [
  { labelKey: 'reports.employers.registeredCompanies', value: '2,340', trend: '+38 this period' },
  {
    labelKey: 'reports.employers.verifiedCompanies',
    value: '2,110',
    trend: '90% verified',
    trendMuted: true,
  },
  { labelKey: 'reports.employers.liveJobPostings', value: '12,406', trend: '+312 this period' },
  { labelKey: 'reports.employers.avgTimeToFill', value: '18 days', trend: '-2 days vs last period' },
]

// Sector/session/revenue-source names are treated like categorical report data, not translated
// UI copy — same treatment as mock content elsewhere.
const SECTORS = [
  { sector: 'Technology', openJobs: 4820, applications: '210,400', fillRate: '68%' },
  { sector: 'Healthtech', openJobs: 1240, applications: '58,200', fillRate: '61%' },
  { sector: 'Fintech', openJobs: 980, applications: '44,100', fillRate: '57%' },
  { sector: 'Retail & E-commerce', openJobs: 1560, applications: '72,300', fillRate: '64%' },
  { sector: 'Education', openJobs: 640, applications: '25,900', fillRate: '52%' },
]

const PARTNERSHIP_KPIS: Kpi[] = [
  {
    labelKey: 'reports.partnerships.totalPartnershipMatches',
    value: '3,880',
    trend: '+94 this period',
  },
  {
    labelKey: 'reports.partnerships.startupsOffering',
    value: '860',
    trend: '+22 this period',
  },
  { labelKey: 'reports.partnerships.seminarsHeld', value: '146', trend: '+18 this period' },
  {
    labelKey: 'reports.partnerships.avgDuration',
    value: '4.2 months',
    trend: 'Stable',
    trendMuted: true,
  },
]

const PARTNERSHIP_TRACKS = [
  {
    labelKey: 'reports.partnerships.funded',
    value: '2,140 (55%)',
    pct: 55,
    colorClass: 'bg-primary',
    textColorClass: 'text-primary',
  },
  {
    labelKey: 'reports.partnerships.withoutFunding',
    value: '1,740 (45%)',
    pct: 45,
    colorClass: 'bg-teal',
    textColorClass: 'text-teal',
  },
]

const COMMUNITY_KPIS: Kpi[] = [
  { labelKey: 'reports.community.signUps', value: '9,120', trend: '+210 this period' },
  { labelKey: 'reports.community.sessionsRun', value: '340', trend: '+28 this period' },
  {
    labelKey: 'reports.community.avgAttendanceRate',
    value: '78%',
    trend: '+4pts vs last period',
  },
  {
    labelKey: 'reports.community.incomeTypeGuidesRead',
    value: '21,400',
    trend: '+1,890 this period',
  },
]

const SESSIONS = [
  { name: 'Peer Mentor Circle — Tech Careers', attendees: 640, rating: '4.8' },
  { name: 'Local Skill Exchange Meetup — Pune', attendees: 480, rating: '4.6' },
  { name: 'Volunteer Coordination Orientation', attendees: 310, rating: '4.7' },
  { name: 'Community Income Explainer Session', attendees: 890, rating: '4.9' },
]

const FINANCIAL_KPIS: Kpi[] = [
  { labelKey: 'reports.financial.totalRevenue', value: '₹1.82 Cr', trend: '+12% vs last period' },
  {
    labelKey: 'reports.financial.jobPostingFees',
    value: '₹1.10 Cr',
    trend: '60% of revenue',
    trendMuted: true,
  },
  {
    labelKey: 'reports.financial.featuredListings',
    value: '₹48.6 L',
    trend: '27% of revenue',
    trendMuted: true,
  },
  {
    labelKey: 'reports.financial.candidateSearchSubscriptions',
    value: '₹23.4 L',
    trend: '13% of revenue',
    trendMuted: true,
  },
]

const REVENUE = [
  { source: 'Job posting fees', amount: '₹1.10 Cr', share: '60%' },
  { source: 'Featured / premium listings', amount: '₹48.6 L', share: '27%' },
  { source: 'Candidate search subscriptions', amount: '₹23.4 L', share: '13%' },
]

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
          <div className={`mt-1 text-[12.5px] ${kpi.trendMuted ? 'text-fog' : 'text-teal'}`}>
            {kpi.trend}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminReportsPage() {
  const { t } = useTranslation('admin')
  const [tab, setTab] = useState<Tab>('candidates')

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

      {tab === 'candidates' && (
        <>
          <KpiRow t={t} kpis={CANDIDATE_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">
              {t('reports.candidates.byOutcome')}
            </h2>
            {CANDIDATE_OUTCOMES.map((outcome) => (
              <div key={outcome.labelKey} className="mb-3.5">
                <div className="mb-1 flex justify-between text-[13px] text-[#3A414D]">
                  <span>{t(outcome.labelKey)}</span>
                  <strong className="text-ink">{outcome.value}</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-tint">
                  <div
                    className={`h-full rounded-full ${outcome.colorClass}`}
                    style={{ width: `${outcome.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'employers' && (
        <>
          <KpiRow t={t} kpis={EMPLOYER_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">
              {t('reports.employers.topHiringSectors')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-xs text-fog uppercase">
                    <th className="py-0 pr-3 pb-2.5 font-semibold">
                      {t('reports.employers.table.sector')}
                    </th>
                    <th className="px-3 pb-2.5 font-semibold">
                      {t('reports.employers.table.openJobs')}
                    </th>
                    <th className="px-3 pb-2.5 font-semibold">
                      {t('reports.employers.table.applications')}
                    </th>
                    <th className="pb-2.5 font-semibold">{t('reports.employers.table.fillRate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTORS.map((sector) => (
                    <tr key={sector.sector} className="border-t border-[#F0F1F3]">
                      <td className="py-3 pr-3 font-bold text-ink">{sector.sector}</td>
                      <td className="p-3 text-[#3A414D]">{sector.openJobs}</td>
                      <td className="p-3 text-[#3A414D]">{sector.applications}</td>
                      <td className="py-3 font-bold text-teal">{sector.fillRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'partnerships' && (
        <>
          <KpiRow t={t} kpis={PARTNERSHIP_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">
              {t('reports.partnerships.byTrack')}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
              {PARTNERSHIP_TRACKS.map((track) => (
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
          </div>
        </>
      )}

      {tab === 'community' && (
        <>
          <KpiRow t={t} kpis={COMMUNITY_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">
              {t('reports.community.topSessions')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-xs text-fog uppercase">
                    <th className="py-0 pr-3 pb-2.5 font-semibold">
                      {t('reports.community.table.session')}
                    </th>
                    <th className="px-3 pb-2.5 font-semibold">
                      {t('reports.community.table.attendees')}
                    </th>
                    <th className="pb-2.5 font-semibold">{t('reports.community.table.avgRating')}</th>
                  </tr>
                </thead>
                <tbody>
                  {SESSIONS.map((session) => (
                    <tr key={session.name} className="border-t border-[#F0F1F3]">
                      <td className="py-3 pr-3 font-bold text-ink">{session.name}</td>
                      <td className="p-3 text-[#3A414D]">{session.attendees}</td>
                      <td className="py-3 font-bold text-teal">{session.rating} ★</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'financial' && (
        <>
          <KpiRow t={t} kpis={FINANCIAL_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">
              {t('reports.financial.byRevenue')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-xs text-fog uppercase">
                    <th className="py-0 pr-3 pb-2.5 font-semibold">
                      {t('reports.financial.table.source')}
                    </th>
                    <th className="px-3 pb-2.5 font-semibold">
                      {t('reports.financial.table.thisMonth')}
                    </th>
                    <th className="pb-2.5 font-semibold">{t('reports.financial.table.share')}</th>
                  </tr>
                </thead>
                <tbody>
                  {REVENUE.map((row) => (
                    <tr key={row.source} className="border-t border-[#F0F1F3]">
                      <td className="py-3 pr-3 font-bold text-ink">{row.source}</td>
                      <td className="p-3 text-[#3A414D]">{row.amount}</td>
                      <td className="py-3 text-[#3A414D]">{row.share}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
