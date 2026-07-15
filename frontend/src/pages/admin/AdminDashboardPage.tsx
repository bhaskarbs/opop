import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'

const KPIS = [
  { labelKey: 'dashboard.kpis.totalCandidates', value: '84,210', trend: '+1,204 this week' },
  { labelKey: 'dashboard.kpis.registeredCompanies', value: '2,340', trend: '+38 this week' },
  { labelKey: 'dashboard.kpis.liveJobPostings', value: '12,406', trend: '+312 this week' },
  { labelKey: 'dashboard.kpis.partnershipMatches', value: '3,880', trend: '+94 this week' },
  { labelKey: 'dashboard.kpis.communitySignUps', value: '9,120', trend: '+210 this week' },
]

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

const FUNNEL = [
  { labelKey: 'dashboard.funnel.registered', value: '84,210', pct: 100 },
  { labelKey: 'dashboard.funnel.appliedToJob', value: '61,340', pct: 73 },
  { labelKey: 'dashboard.funnel.appliedForPartnership', value: '18,420', pct: 22 },
  { labelKey: 'dashboard.funnel.hiredOrPartnered', value: '9,880', pct: 12 },
]

// Mock content, not translated UI copy — same treatment as mock data elsewhere.
const COMPANIES = [
  {
    name: 'Vertex Robotics Pvt. Ltd.',
    sector: 'Deep Tech',
    cin: 'U74999KA2021PTC145632',
    date: 'Jul 6, 2026',
    status: 'Verified' as const,
  },
  {
    name: 'Lumen Health Solutions',
    sector: 'Healthtech',
    cin: 'U85100MH2020PTC338211',
    date: 'Jul 5, 2026',
    status: 'Verified' as const,
  },
  {
    name: 'Sahaay Finance Ltd.',
    sector: 'Fintech',
    cin: 'U65999DL2022PTC401987',
    date: 'Jul 4, 2026',
    status: 'Pending review' as const,
  },
  {
    name: 'Greenline Logistics',
    sector: 'Climate Tech',
    cin: 'U60232KA2019PTC121044',
    date: 'Jul 3, 2026',
    status: 'Verified' as const,
  },
  {
    name: 'Northstar EdTech',
    sector: 'Education',
    cin: 'U80903TN2023PTC167754',
    date: 'Jul 2, 2026',
    status: 'Pending review' as const,
  },
]

const STATUS_CLASS = {
  Verified: 'bg-teal-tint text-teal',
  'Pending review': 'bg-amber-tint text-amber',
}

const STATUS_LABEL_KEYS: Record<keyof typeof STATUS_CLASS, string> = {
  Verified: 'dashboard.companyStatus.verified',
  'Pending review': 'dashboard.companyStatus.pendingReview',
}

export default function AdminDashboardPage() {
  const { t } = useTranslation('admin')
  const localize = useLocalizedPath()
  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <h1 className="mb-5 text-[22px] font-extrabold text-ink">{t('dashboard.title')}</h1>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {KPIS.map((kpi) => (
          <div
            key={kpi.labelKey}
            className="rounded-card border border-border bg-surface px-5 py-[18px]"
          >
            <div className="mb-1.5 text-[13px] text-fog">{t(kpi.labelKey)}</div>
            <div className="text-2xl font-extrabold text-ink">{kpi.value}</div>
            <div className="mt-1 text-[12.5px] text-teal">{kpi.trend}</div>
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
          {FUNNEL.map((stage) => (
            <div key={stage.labelKey} className="mb-3.5">
              <div className="mb-1 flex justify-between text-[13px] text-[#3A414D]">
                <span>{t(stage.labelKey)}</span>
                <strong className="text-ink">{stage.value}</strong>
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
            to={localize(ROUTES.adminCompanyApprovals)}
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
              {COMPANIES.map((company) => (
                <tr key={company.name} className="border-t border-[#F0F1F3]">
                  <td className="py-3 pr-3 font-bold text-ink">{company.name}</td>
                  <td className="p-3 text-[#3A414D]">{company.sector}</td>
                  <td className="p-3 font-mono text-[12.5px] text-fog">{company.cin}</td>
                  <td className="p-3 text-fog">{company.date}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[company.status]}`}
                    >
                      {t(STATUS_LABEL_KEYS[company.status])}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
