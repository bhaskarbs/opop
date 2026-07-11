import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi, type JobSummary } from '../../lib/jobsApi'
import { ROUTES } from '../../routes/paths'

const APPLICANTS = [
  { name: 'Rohan Mehta', initial: 'R', skills: 'React · UI Systems · 5 yrs' },
  { name: 'Anita Sharma', initial: 'A', skills: 'QA · Embedded · 3 yrs' },
  { name: 'Karan Patel', initial: 'K', skills: 'Customer Success · 4 yrs' },
]

const SEMINARS = [
  { title: 'Partner intro session — Frontend', date: 'Jul 14, 4:00 PM', invited: 22 },
  { title: 'Hardware QA meetup', date: 'Jul 21, 11:00 AM', invited: 12 },
]

const STATUS_LABELS: Record<JobSummary['status'], string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  CLOSED: 'Closed',
}

function formatPostedLabel(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
}

export default function CompanyDashboardPage() {
  const [postings, setPostings] = useState<JobSummary[]>([])

  useEffect(() => {
    jobsApi
      .mine()
      .then(setPostings)
      .catch(() => setPostings([]))
  }, [])

  const activeCount = postings.filter((posting) => posting.status === 'ACTIVE').length

  const kpis = [
    {
      label: 'Active job postings',
      value: String(activeCount),
      trend: '+2 this month',
      trendColorClass: 'text-teal',
    },
    {
      label: 'Total applicants',
      value: '412',
      trend: '+58 this week',
      trendColorClass: 'text-teal',
    },
    {
      label: 'Partnership applicants',
      value: '87',
      trend: '+12 this week',
      trendColorClass: 'text-teal',
    },
    { label: 'Seminar RSVPs', value: '34', trend: 'Next: Jul 14', trendColorClass: 'text-fog' },
  ]

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">Employer dashboard</h1>
          <div className="text-sm text-slate">Vertex Robotics · Deep Tech · Seed stage</div>
        </div>
        <div className="flex gap-2.5">
          <Link
            to={ROUTES.companySearchCandidates}
            className="rounded-lg border border-border bg-surface px-[18px] py-2.5 text-[13.5px] font-bold text-ink no-underline"
          >
            Search candidates
          </Link>
          <Link
            to={ROUTES.companyPostJob}
            className="rounded-lg bg-primary px-[18px] py-2.5 text-[13.5px] font-bold text-white no-underline"
          >
            + Post a job
          </Link>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-card border border-border bg-surface px-5 py-[18px]"
          >
            <div className="mb-1.5 text-[13px] text-fog">{kpi.label}</div>
            <div className="text-2xl font-extrabold text-ink">{kpi.value}</div>
            <div className={`mt-1 text-[12.5px] ${kpi.trendColorClass}`}>{kpi.trend}</div>
          </div>
        ))}
      </div>

      <div className="header:grid-cols-[minmax(0,1fr)_300px] grid grid-cols-1 gap-5">
        <div className="rounded-card border border-border bg-surface p-[22px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Active job postings</h2>
            <a
              href="#postings"
              onClick={(event) => event.preventDefault()}
              className="text-[13px] font-bold text-primary no-underline"
            >
              Manage all →
            </a>
          </div>
          {postings.map((posting) => (
            <div
              key={posting.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F1F3] py-3"
            >
              <div>
                <div className="text-[14.5px] font-bold text-ink">{posting.title}</div>
                <div className="mt-0.5 text-[12.5px] text-fog">
                  {posting.applicantCount} applicants · Posted{' '}
                  {formatPostedLabel(posting.createdAt)}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  posting.status === 'ACTIVE'
                    ? 'bg-teal-tint text-teal'
                    : 'bg-neutral-tint text-slate'
                }`}
              >
                {STATUS_LABELS[posting.status]}
              </span>
            </div>
          ))}

          <div className="mt-[26px] mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Partnership applicants</h2>
            <a
              href="#applicants"
              onClick={(event) => event.preventDefault()}
              className="text-[13px] font-bold text-primary no-underline"
            >
              View all →
            </a>
          </div>
          {APPLICANTS.map((applicant) => (
            <div
              key={applicant.name}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F1F3] py-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-[13px] font-bold text-primary">
                  {applicant.initial}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink">{applicant.name}</div>
                  <div className="text-[12.5px] text-fog">{applicant.skills}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink"
                >
                  View profile
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white"
                >
                  Invite to seminar
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="header:order-none order-first">
          <div className="mb-4 rounded-card border border-border bg-surface p-[22px]">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">Upcoming seminars & meetups</h3>
            {SEMINARS.map((seminar) => (
              <div key={seminar.title} className="border-t border-[#F0F1F3] py-2.5">
                <div className="text-[13.5px] font-bold text-ink">{seminar.title}</div>
                <div className="mt-0.5 text-[12.5px] text-fog">
                  {seminar.date} · {seminar.invited} invited
                </div>
              </div>
            ))}
            <Link
              to={ROUTES.companySeminars}
              className="mt-3 block w-full rounded-lg border border-dashed border-[#C7CCD6] py-2.5 text-center text-[13px] font-bold text-primary no-underline"
            >
              + Schedule new seminar
            </Link>
          </div>
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">Notifications sent</h3>
            <div className="flex justify-between border-t border-[#F0F1F3] py-2 text-sm text-slate">
              <span>Email</span>
              <strong className="text-ink">1,204</strong>
            </div>
            <div className="flex justify-between border-t border-[#F0F1F3] py-2 text-sm text-slate">
              <span>WhatsApp</span>
              <strong className="text-ink">860</strong>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
