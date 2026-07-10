import { useState } from 'react'

type Tab = 'candidates' | 'employers' | 'partnerships' | 'community' | 'financial'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'candidates', label: 'Candidates' },
  { key: 'employers', label: 'Employers & Jobs' },
  { key: 'partnerships', label: 'Partnerships' },
  { key: 'community', label: 'Community' },
  { key: 'financial', label: 'Financial' },
]

interface Kpi {
  label: string
  value: string
  trend: string
  trendMuted?: boolean
}

const CANDIDATE_KPIS: Kpi[] = [
  { label: 'Total registered', value: '84,210', trend: '+1,204 this period' },
  { label: 'Active job seekers', value: '52,340', trend: '+890 this period' },
  { label: 'Resumes uploaded', value: '79,880', trend: '95% of registered', trendMuted: true },
  { label: 'Mock interviews taken', value: '18,210', trend: '+2,110 this period' },
]

const CANDIDATE_OUTCOMES = [
  { label: 'Hired via job listing', value: '9,880', pct: 100, colorClass: 'bg-primary' },
  { label: 'Entered a partnership', value: '4,120', pct: 42, colorClass: 'bg-amber' },
  { label: 'Joined a community role', value: '3,340', pct: 34, colorClass: 'bg-teal' },
  { label: 'Still searching', value: '38,900', pct: 74, colorClass: 'bg-fog' },
]

const EMPLOYER_KPIS: Kpi[] = [
  { label: 'Registered companies', value: '2,340', trend: '+38 this period' },
  { label: 'Verified companies', value: '2,110', trend: '90% verified', trendMuted: true },
  { label: 'Live job postings', value: '12,406', trend: '+312 this period' },
  { label: 'Avg. time to fill', value: '18 days', trend: '-2 days vs last period' },
]

const SECTORS = [
  { sector: 'Technology', openJobs: 4820, applications: '210,400', fillRate: '68%' },
  { sector: 'Healthtech', openJobs: 1240, applications: '58,200', fillRate: '61%' },
  { sector: 'Fintech', openJobs: 980, applications: '44,100', fillRate: '57%' },
  { sector: 'Retail & E-commerce', openJobs: 1560, applications: '72,300', fillRate: '64%' },
  { sector: 'Education', openJobs: 640, applications: '25,900', fillRate: '52%' },
]

const PARTNERSHIP_KPIS: Kpi[] = [
  { label: 'Total partnership matches', value: '3,880', trend: '+94 this period' },
  { label: 'Startups offering partnerships', value: '860', trend: '+22 this period' },
  { label: 'Seminars held', value: '146', trend: '+18 this period' },
  { label: 'Avg. partnership duration', value: '4.2 months', trend: 'Stable', trendMuted: true },
]

const PARTNERSHIP_TRACKS = [
  {
    label: 'Funded',
    value: '2,140 (55%)',
    pct: 55,
    colorClass: 'bg-primary',
    textColorClass: 'text-primary',
  },
  {
    label: 'Without funding',
    value: '1,740 (45%)',
    pct: 45,
    colorClass: 'bg-teal',
    textColorClass: 'text-teal',
  },
]

const COMMUNITY_KPIS: Kpi[] = [
  { label: 'Community sign-ups', value: '9,120', trend: '+210 this period' },
  { label: 'Sessions run', value: '340', trend: '+28 this period' },
  { label: 'Avg. attendance rate', value: '78%', trend: '+4pts vs last period' },
  { label: 'Income-type guides read', value: '21,400', trend: '+1,890 this period' },
]

const SESSIONS = [
  { name: 'Peer Mentor Circle — Tech Careers', attendees: 640, rating: '4.8' },
  { name: 'Local Skill Exchange Meetup — Pune', attendees: 480, rating: '4.6' },
  { name: 'Volunteer Coordination Orientation', attendees: 310, rating: '4.7' },
  { name: 'Community Income Explainer Session', attendees: 890, rating: '4.9' },
]

const FINANCIAL_KPIS: Kpi[] = [
  { label: 'Total revenue (period)', value: '₹1.82 Cr', trend: '+12% vs last period' },
  { label: 'Job posting fees', value: '₹1.10 Cr', trend: '60% of revenue', trendMuted: true },
  { label: 'Featured listings', value: '₹48.6 L', trend: '27% of revenue', trendMuted: true },
  {
    label: 'Candidate search subscriptions',
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

function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-card border border-border bg-surface px-5 py-[18px]"
        >
          <div className="mb-1.5 text-[13px] text-fog">{kpi.label}</div>
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
  const [tab, setTab] = useState<Tab>('candidates')

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">Reports</h1>
          <p className="text-sm text-slate">
            Platform performance across candidates, employers, partnerships, and community.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <select className="rounded-lg border border-border bg-surface px-3 py-2.5 text-[13.5px] text-ink">
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Last 6 months</option>
            <option>Year to date</option>
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
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-5 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 py-2.5 text-sm font-bold ${
              tab === t.key ? 'border-primary text-ink' : 'border-transparent text-fog'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'candidates' && (
        <>
          <KpiRow kpis={CANDIDATE_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">Candidates by outcome</h2>
            {CANDIDATE_OUTCOMES.map((outcome) => (
              <div key={outcome.label} className="mb-3.5">
                <div className="mb-1 flex justify-between text-[13px] text-[#3A414D]">
                  <span>{outcome.label}</span>
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
          <KpiRow kpis={EMPLOYER_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">Top hiring sectors</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-xs text-fog uppercase">
                    <th className="py-0 pr-3 pb-2.5 font-semibold">Sector</th>
                    <th className="px-3 pb-2.5 font-semibold">Open jobs</th>
                    <th className="px-3 pb-2.5 font-semibold">Applications</th>
                    <th className="pb-2.5 font-semibold">Fill rate</th>
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
          <KpiRow kpis={PARTNERSHIP_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">Partnerships by track</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
              {PARTNERSHIP_TRACKS.map((track) => (
                <div key={track.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-[13.5px] font-bold ${track.textColorClass}`}>
                      {track.label}
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
          <KpiRow kpis={COMMUNITY_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">Top community sessions attended</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-xs text-fog uppercase">
                    <th className="py-0 pr-3 pb-2.5 font-semibold">Session</th>
                    <th className="px-3 pb-2.5 font-semibold">Attendees</th>
                    <th className="pb-2.5 font-semibold">Avg. rating</th>
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
          <KpiRow kpis={FINANCIAL_KPIS} />
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h2 className="mb-4 text-[15px] font-bold text-ink">Revenue by source</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-xs text-fog uppercase">
                    <th className="py-0 pr-3 pb-2.5 font-semibold">Source</th>
                    <th className="px-3 pb-2.5 font-semibold">This month</th>
                    <th className="pb-2.5 font-semibold">Share</th>
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
