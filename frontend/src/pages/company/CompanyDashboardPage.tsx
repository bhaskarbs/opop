import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { companyApi, type CompanyProfileResponse } from '../../lib/companyApi'
import { jobsApi, type JobSummary } from '../../lib/jobsApi'
import { ROUTES } from '../../routes/paths'

const VERIFICATION_LABEL_KEYS: Record<CompanyProfileResponse['verificationStatus'], string> = {
  PENDING: 'dashboard.verification.pending',
  VERIFIED: 'dashboard.verification.verified',
  REJECTED: 'dashboard.verification.rejected',
}

// Mock content, not translated UI copy — same treatment as mock data elsewhere.
const APPLICANTS = [
  { name: 'Rohan Mehta', initial: 'R', skills: 'React · UI Systems · 5 yrs' },
  { name: 'Anita Sharma', initial: 'A', skills: 'QA · Embedded · 3 yrs' },
  { name: 'Karan Patel', initial: 'K', skills: 'Customer Success · 4 yrs' },
]

const SEMINARS = [
  { title: 'Partner intro session — Frontend', date: 'Jul 14, 4:00 PM', invited: 22 },
  { title: 'Hardware QA meetup', date: 'Jul 21, 11:00 AM', invited: 12 },
]

const STATUS_LABEL_KEYS: Record<JobSummary['status'], string> = {
  ACTIVE: 'dashboard.status.active',
  DRAFT: 'dashboard.status.draft',
  PENDING_APPROVAL: 'dashboard.status.pendingReview',
  REJECTED: 'dashboard.status.rejected',
  CLOSED: 'dashboard.status.closed',
}

const STATUS_BADGE_CLASSES: Record<JobSummary['status'], string> = {
  ACTIVE: 'bg-teal-tint text-teal',
  DRAFT: 'bg-neutral-tint text-slate',
  PENDING_APPROVAL: 'bg-amber-tint text-amber',
  REJECTED: 'bg-danger/10 text-danger',
  CLOSED: 'bg-neutral-tint text-slate',
}

function formatPostedLabel(t: TFunction<'company'>, createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  if (days <= 0) return t('dashboard.postedToday')
  if (days === 1) return t('dashboard.postedOneDayAgo')
  if (days < 7) return t('dashboard.postedDaysAgo', { days })
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? t('dashboard.postedOneWeekAgo') : t('dashboard.postedWeeksAgo', { weeks })
}

export default function CompanyDashboardPage() {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const [profile, setProfile] = useState<CompanyProfileResponse | null>(null)
  const [postings, setPostings] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([companyApi.getProfile(), jobsApi.mine()])
      .then(([profileData, postingsData]) => {
        if (cancelled) return
        setProfile(profileData)
        setPostings(postingsData)
      })
      .catch(() => {
        // Best-effort — an empty dashboard is a reasonable fallback rather than blocking the
        // whole page on either call failing.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const activeCount = postings.filter((posting) => posting.status === 'ACTIVE').length
  const totalApplicants = postings.reduce((sum, posting) => sum + posting.applicantCount, 0)

  if (loading) {
    return (
      <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16 text-center text-sm text-slate">
        {t('dashboard.loading')}
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16 text-center text-sm text-danger">
        {t('dashboard.loadError')}
      </main>
    )
  }

  const kpis = [
    {
      labelKey: 'dashboard.kpis.activeJobPostings',
      value: String(activeCount),
      trend: '+2 this month',
      trendColorClass: 'text-teal',
    },
    {
      labelKey: 'dashboard.kpis.totalApplicants',
      value: String(totalApplicants),
      trend: '',
      trendColorClass: 'text-fog',
    },
    {
      labelKey: 'dashboard.kpis.partnershipApplicants',
      value: '87',
      trend: '+12 this week',
      trendColorClass: 'text-teal',
    },
    {
      labelKey: 'dashboard.kpis.seminarRsvps',
      value: '34',
      trend: 'Next: Jul 14',
      trendColorClass: 'text-fog',
    },
  ]

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('dashboard.title')}</h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="text-sm text-slate">
              {profile.companyName} · {profile.industry}
            </div>
            {profile.verificationStatus !== 'VERIFIED' && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  profile.verificationStatus === 'REJECTED'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-amber-tint text-amber'
                }`}
              >
                {t(VERIFICATION_LABEL_KEYS[profile.verificationStatus])}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2.5">
          <Link
            to={localize(ROUTES.companySearchCandidates)}
            className="rounded-lg border border-border bg-surface px-[18px] py-2.5 text-[13.5px] font-bold text-ink no-underline"
          >
            {t('dashboard.searchCandidates')}
          </Link>
          <Link
            to={localize(ROUTES.companyPostJob)}
            className="rounded-lg bg-primary px-[18px] py-2.5 text-[13.5px] font-bold text-white no-underline"
          >
            {t('dashboard.postJob')}
          </Link>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.labelKey}
            className="rounded-card border border-border bg-surface px-5 py-[18px]"
          >
            <div className="mb-1.5 text-[13px] text-fog">{t(kpi.labelKey)}</div>
            <div className="text-2xl font-extrabold text-ink">{kpi.value}</div>
            <div className={`mt-1 text-[12.5px] ${kpi.trendColorClass}`}>{kpi.trend}</div>
          </div>
        ))}
      </div>

      <div className="header:grid-cols-[minmax(0,1fr)_300px] grid grid-cols-1 gap-5">
        <div className="rounded-card border border-border bg-surface p-[22px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">{t('dashboard.activeJobPostings')}</h2>
            <a
              href="#postings"
              onClick={(event) => event.preventDefault()}
              className="text-[13px] font-bold text-primary no-underline"
            >
              {t('dashboard.manageAll')}
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
                  {t('dashboard.applicantsPosted', {
                    count: posting.applicantCount,
                    posted: formatPostedLabel(t, posting.createdAt),
                  })}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[posting.status]}`}
              >
                {t(STATUS_LABEL_KEYS[posting.status])}
              </span>
            </div>
          ))}

          <div className="mt-[26px] mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">{t('dashboard.partnershipApplicants')}</h2>
            <a
              href="#applicants"
              onClick={(event) => event.preventDefault()}
              className="text-[13px] font-bold text-primary no-underline"
            >
              {t('dashboard.viewAll')}
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
                  {t('dashboard.viewProfile')}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white"
                >
                  {t('dashboard.inviteToSeminar')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="header:order-none order-first">
          <div className="mb-4 rounded-card border border-border bg-surface p-[22px]">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">
              {t('dashboard.upcomingSeminars')}
            </h3>
            {SEMINARS.map((seminar) => (
              <div key={seminar.title} className="border-t border-[#F0F1F3] py-2.5">
                <div className="text-[13.5px] font-bold text-ink">{seminar.title}</div>
                <div className="mt-0.5 text-[12.5px] text-fog">
                  {t('dashboard.seminarInvited', { date: seminar.date, count: seminar.invited })}
                </div>
              </div>
            ))}
            <Link
              to={localize(ROUTES.companySeminars)}
              className="mt-3 block w-full rounded-lg border border-dashed border-[#C7CCD6] py-2.5 text-center text-[13px] font-bold text-primary no-underline"
            >
              {t('dashboard.scheduleNewSeminar')}
            </Link>
          </div>
          <div className="rounded-card border border-border bg-surface p-[22px]">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">
              {t('dashboard.notificationsSent')}
            </h3>
            <div className="flex justify-between border-t border-[#F0F1F3] py-2 text-sm text-slate">
              <span>{t('dashboard.email')}</span>
              <strong className="text-ink">1,204</strong>
            </div>
            <div className="flex justify-between border-t border-[#F0F1F3] py-2 text-sm text-slate">
              <span>{t('dashboard.whatsapp')}</span>
              <strong className="text-ink">860</strong>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
