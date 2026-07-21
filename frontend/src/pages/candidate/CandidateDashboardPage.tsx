import { useEffect, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import {
  applicationsApi,
  type ApplicationStatus,
  type ApplicationSummary,
} from '../../lib/applicationsApi'
import { candidateApi, type CandidateProfileResponse } from '../../lib/candidateApi'
import {
  deriveCompletedSections,
  profileCompletionPercent,
} from '../../lib/candidateProfileCompletion'
import { ideasApi, type IdeaSummary, type MyIdeaInterestSummary } from '../../lib/ideasApi'
import { jobsApi } from '../../lib/jobsApi'
import { mockInterviewApi, type MockInterviewSessionSummary } from '../../lib/mockInterviewApi'
import { toDisplayJob, type DisplayJob } from '../job-search/jobDisplay'
import { ROUTES } from '../../routes/paths'

const NUDGE_MIN_DAYS = 30
const MS_PER_DAY = 86_400_000
const MAX_RECENT_RECORDINGS = 2
const MAX_MATCHED_JOBS = 4
const MAX_FEATURED_STARTUPS = 3

const ACTIVITY_STATUS_COLOR_CLASS: Record<ApplicationStatus, string> = {
  APPLIED: 'bg-primary',
  UNDER_REVIEW: 'bg-teal',
  REJECTED: 'bg-danger',
  WITHDRAWN: 'bg-fog',
}

interface ActivityEntry {
  id: string
  timestamp: string
  text: string
  colorClass: string
}

function activityTextForApplication(
  t: TFunction<'candidate'>,
  application: ApplicationSummary,
): string {
  switch (application.status) {
    case 'APPLIED':
      return t('dashboard.activity.appliedToJob', {
        jobTitle: application.jobTitle,
        company: application.companyName,
      })
    case 'UNDER_REVIEW':
      return t('dashboard.activity.underReview', { jobTitle: application.jobTitle })
    case 'REJECTED':
      return t('dashboard.activity.notSelected', { jobTitle: application.jobTitle })
    case 'WITHDRAWN':
      return t('dashboard.activity.withdrawn', { jobTitle: application.jobTitle })
  }
}

export default function CandidateDashboardPage() {
  const { t } = useTranslation('candidate')
  const localize = useLocalizedPath()
  const [showNudge, setShowNudge] = useState(true)

  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null)
  const [jobs, setJobs] = useState<DisplayJob[]>([])
  // Ideas have no structured skills list (unlike jobs), so there's no reliable signal to match
  // them against a candidate's profile — a random sample is picked once when the data arrives
  // (not during render, since Math.random() is impure) rather than filtered by skill.
  const [featuredStartups, setFeaturedStartups] = useState<IdeaSummary[]>([])
  const [applications, setApplications] = useState<ApplicationSummary[]>([])
  const [myInterests, setMyInterests] = useState<MyIdeaInterestSummary[]>([])
  const [mockInterviewSessions, setMockInterviewSessions] = useState<MockInterviewSessionSummary[]>(
    [],
  )
  // The "no offer yet" nudge only makes sense once the candidate has actually had time to
  // hear back — 30+ days since they started applying (their earliest application), or since
  // they registered if they haven't applied to anything yet. Computed once when the data
  // arrives (not during render) since Date.now() is impure.
  const [daysSinceSearchStarted, setDaysSinceSearchStarted] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      candidateApi.getProfile(),
      jobsApi.search({}),
      applicationsApi.mine(),
      ideasApi.browse(),
      ideasApi.myInterests(),
      mockInterviewApi.mine(),
    ])
      .then(
        ([
          profileData,
          jobResults,
          applicationResults,
          ideaResults,
          interestResults,
          sessionResults,
        ]) => {
          if (cancelled) return
          setProfile(profileData)
          setJobs(jobResults.map(toDisplayJob))
          setFeaturedStartups(
            [...ideaResults].sort(() => Math.random() - 0.5).slice(0, MAX_FEATURED_STARTUPS),
          )
          setApplications(applicationResults)
          setMyInterests(interestResults)
          setMockInterviewSessions(sessionResults)
          const earliestAppliedAt = applicationResults.reduce<string | null>(
            (earliestSoFar, application) =>
              !earliestSoFar || application.appliedAt < earliestSoFar
                ? application.appliedAt
                : earliestSoFar,
            null,
          )
          const searchStartedAt = earliestAppliedAt ?? profileData.createdAt
          setDaysSinceSearchStarted(
            Math.floor((Date.now() - new Date(searchStartedAt).getTime()) / MS_PER_DAY),
          )
        },
      )
      .catch(() => {
        // Best-effort — an empty dashboard (no matches, 0% complete) is a reasonable fallback
        // rather than blocking the whole page on either call failing.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const matchedJobs = useMemo(() => {
    if (!profile) return []
    const skillSet = new Set(profile.skills.map((skill) => skill.toLowerCase()))
    return jobs
      .filter((job) => job.tags.some((tag) => skillSet.has(tag.toLowerCase())))
      .slice(0, MAX_MATCHED_JOBS)
  }, [profile, jobs])

  // Real activity feed: recent job applications (status-aware) merged with recent partnership
  // interests, newest first — no "viewed by recruiter" / "profile views" tracking exists in the
  // backend, so unlike the earlier mock this only surfaces events we actually record.
  const recentActivity = useMemo<ActivityEntry[]>(() => {
    const jobEntries: ActivityEntry[] = applications.map((application) => ({
      id: application.id,
      timestamp: application.appliedAt,
      text: activityTextForApplication(t, application),
      colorClass: ACTIVITY_STATUS_COLOR_CLASS[application.status],
    }))
    const partnershipEntries: ActivityEntry[] = myInterests.map((interest) => ({
      id: interest.id,
      timestamp: interest.createdAt,
      text: t('dashboard.activity.appliedToPartnership', { ideaTitle: interest.ideaTitle }),
      colorClass: 'bg-amber',
    }))
    return [...jobEntries, ...partnershipEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3)
  }, [applications, myInterests, t])

  // mockInterviewApi.mine() already returns newest-first (see
  // MockInterviewSessionRepository.findByCandidateIdOrderByRecordedAtDesc) — just take the top few.
  const recentRecordings = useMemo(
    () => mockInterviewSessions.slice(0, MAX_RECENT_RECORDINGS),
    [mockInterviewSessions],
  )

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
        {t('profile.loadError')}
      </main>
    )
  }

  const completionPercent = profileCompletionPercent(deriveCompletedSections(profile))
  const firstName = profile.fullName.split(' ')[0]

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="header:grid-cols-[minmax(0,1fr)_300px] grid grid-cols-1 gap-6">
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-card bg-gradient-to-br from-primary to-[#1B3FB0] p-[26px] text-white">
            <div>
              <h1 className="mb-1.5 text-[22px] font-extrabold">
                {t('dashboard.welcomeBack', { name: firstName })}
              </h1>
              <p className="text-sm text-[#C9D8FA]">
                {t('dashboard.profileComplete', { percent: completionPercent })}
              </p>
            </div>
            <Link
              to={localize(ROUTES.candidateProfile)}
              className="rounded-lg bg-white px-[18px] py-2.5 text-[13.5px] font-bold whitespace-nowrap text-primary no-underline"
            >
              {t('dashboard.completeProfile')}
            </Link>
          </div>

          {showNudge && daysSinceSearchStarted >= NUDGE_MIN_DAYS && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-card border border-[#FCE3B8] bg-amber-tint p-[18px]">
              <div className="flex items-center gap-3.5">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C2760C"
                  strokeWidth={2}
                  className="shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                <div>
                  <div className="text-[14.5px] font-bold text-ink">
                    {t('dashboard.nudge.title', { days: daysSinceSearchStarted })}
                  </div>
                  <div className="text-[13.5px] text-slate">{t('dashboard.nudge.body')}</div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2.5">
                <Link
                  to={localize(ROUTES.community)}
                  className="rounded-lg bg-amber px-4 py-2.5 text-[13.5px] font-bold text-white no-underline"
                >
                  {t('dashboard.nudge.attendTraining')}
                </Link>
                <button
                  type="button"
                  onClick={() => setShowNudge(false)}
                  className="text-[13.5px] font-semibold text-fog"
                >
                  {t('dashboard.nudge.dismiss')}
                </button>
              </div>
            </div>
          )}

          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold text-ink">{t('dashboard.jobsMatched')}</h2>
            <Link
              to={localize(ROUTES.jobs)}
              className="text-[13.5px] font-bold text-primary no-underline"
            >
              {t('dashboard.searchJobs')}
            </Link>
          </div>
          {matchedJobs.length === 0 ? (
            <div className="mb-7 rounded-xl border border-dashed border-[#D7DBE2] bg-surface p-7 text-center">
              <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-neutral-tint">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8891A0"
                  strokeWidth={2}
                >
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div className="mb-1.5 text-[14.5px] font-bold text-ink">
                {t('dashboard.noMatchedJobs.title')}
              </div>
              <p className="mx-auto mb-4 max-w-[420px] text-[13.5px] leading-[1.55] text-slate">
                {t('dashboard.noMatchedJobs.body')}
              </p>
              <Link
                to={localize(ROUTES.jobs)}
                className="inline-block rounded-lg border border-border bg-surface px-[18px] py-2.5 text-[13.5px] font-bold text-ink no-underline"
              >
                {t('dashboard.noMatchedJobs.broadenSearch')}
              </Link>
            </div>
          ) : (
            <div className="mb-7 flex flex-col gap-3">
              {matchedJobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link
                        to={localize(ROUTES.jobDetail(job.id))}
                        className="text-[14.5px] font-bold text-ink no-underline"
                      >
                        {job.title}
                      </Link>
                      <div className="mt-0.5 text-[13px] text-slate">
                        {job.company} · {job.salary}
                      </div>
                    </div>
                    <Link
                      to={localize(ROUTES.jobDetail(job.id))}
                      className="rounded-lg bg-primary px-4 py-2 text-[13px] font-bold text-white no-underline"
                    >
                      {t('dashboard.viewJob')}
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold text-ink">{t('dashboard.startupsMatched')}</h2>
            <Link
              to={localize(ROUTES.partnerships)}
              className="text-[13.5px] font-bold text-primary no-underline"
            >
              {t('dashboard.learnMore')}
            </Link>
          </div>
          {featuredStartups.length === 0 ? (
            <div className="mb-7 rounded-xl border border-dashed border-[#D7DBE2] bg-surface p-7 text-center">
              <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-neutral-tint">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8891A0"
                  strokeWidth={2}
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                </svg>
              </div>
              <div className="mb-1.5 text-[14.5px] font-bold text-ink">
                {t('dashboard.noMatchedStartups.title')}
              </div>
              <p className="mx-auto mb-4 max-w-[420px] text-[13.5px] leading-[1.55] text-slate">
                {t('dashboard.noMatchedStartups.body')}
              </p>
              <Link
                to={localize(ROUTES.partnerships)}
                className="inline-block rounded-lg border border-border bg-surface px-[18px] py-2.5 text-[13.5px] font-bold text-ink no-underline"
              >
                {t('dashboard.noMatchedStartups.explore')}
              </Link>
            </div>
          ) : (
            <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
              {featuredStartups.map((idea) => (
                <div
                  key={idea.id}
                  className="rounded-xl border border-border bg-surface px-[18px] py-4"
                >
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF1DC] text-[13.5px] font-bold text-amber">
                      {idea.submitterName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-[14.5px] font-bold text-ink">{idea.submitterName}</div>
                  </div>
                  <p className="text-[13px] leading-[1.5] text-slate">{idea.problem}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-[#0B3B34] p-[22px]">
            <div>
              <div className="text-[14.5px] font-bold text-white">
                {t('dashboard.communityBanner.title')}
              </div>
              <div className="mt-0.5 text-[13px] text-[#B9E9DC]">
                {t('dashboard.communityBanner.body')}
              </div>
            </div>
            <div className="flex gap-2.5">
              <Link
                to={localize(ROUTES.community)}
                className="rounded-lg bg-white px-4 py-2.5 text-[13px] font-bold text-[#0B3B34] no-underline"
              >
                {t('dashboard.communityBanner.watchNow')}
              </Link>
              <Link
                to={localize(ROUTES.community)}
                className="rounded-lg border border-[rgba(255,255,255,0.3)] px-4 py-2.5 text-[13px] font-bold text-white no-underline"
              >
                {t('dashboard.communityBanner.interested')}
              </Link>
            </div>
          </div>
        </div>

        <aside className="header:order-none order-first">
          <Card className="mb-4 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[14.5px] font-bold text-ink">{t('dashboard.profileStrength')}</h3>
              <span className="text-[13px] font-bold text-primary">{completionPercent}%</span>
            </div>
            <div className="mb-3.5 h-2 overflow-hidden rounded-full bg-neutral-tint">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <Link
              to={localize(ROUTES.candidateAddDetails)}
              className="block rounded-lg border border-border py-2.5 text-center text-[13.5px] font-bold text-ink no-underline"
            >
              {t('dashboard.addMissingDetails')}
            </Link>
          </Card>

          <Card className="mb-4 p-5">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">
              {t('dashboard.mockInterviews')}
            </h3>
            <p className="mb-3.5 text-[13px] leading-[1.5] text-slate">
              {t('dashboard.mockInterviewsBody')}
            </p>
            <Link
              to={localize(ROUTES.candidateMockInterview)}
              className="mb-2.5 block rounded-lg bg-ink py-2.5 text-center text-[13.5px] font-bold text-white no-underline"
            >
              {t('dashboard.startMockInterview')}
            </Link>
            {recentRecordings.length === 0 ? (
              <p className="text-[13px] text-slate">{t('mockInterview.noSessions')}</p>
            ) : (
              recentRecordings.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between border-t border-[#F0F1F3] py-2"
                >
                  <div>
                    <div className="text-[13px] font-semibold text-ink">
                      {t('dashboard.recordingQuestions', { count: session.questionCount })}
                    </div>
                    <div className="text-xs text-fog">
                      {new Date(session.recordedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <Link
                    to={localize(ROUTES.candidateMockInterview)}
                    className="text-[12.5px] font-bold text-primary no-underline"
                  >
                    {t('dashboard.watch')}
                  </Link>
                </div>
              ))
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">
              {t('dashboard.applicationActivity')}
            </h3>
            {recentActivity.length === 0 ? (
              <p className="py-2 text-[13px] text-slate">{t('dashboard.activity.empty')}</p>
            ) : (
              recentActivity.map((entry) => (
                <div key={entry.id} className="flex gap-2.5 border-t border-[#F0F1F3] py-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${entry.colorClass}`} />
                  <div className="text-[13px] leading-[1.5] text-[#3A414D]">{entry.text}</div>
                </div>
              ))
            )}
          </Card>
        </aside>
      </div>
    </main>
  )
}
