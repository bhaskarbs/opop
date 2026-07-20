import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card } from '../components/ui'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import { ApiError } from '../lib/apiClient'
import { applicationsApi } from '../lib/applicationsApi'
import { jobsApi, type JobDetail, type JobSummary } from '../lib/jobsApi'
import { workModeFromBackend } from '../lib/jobEnums'
import { ROUTES } from '../routes/paths'
import { useAuthStore } from '../stores/authStore'
import type { TFunction } from 'i18next'

function formatSalary(
  t: TFunction<'public'>,
  minLakhs: number | null,
  maxLakhs: number | null,
): string {
  if (minLakhs == null && maxLakhs == null) return t('jobDetail.salaryNotDisclosed')
  if (minLakhs != null && maxLakhs != null) return `₹${minLakhs}L–${maxLakhs}L`
  return `₹${minLakhs ?? maxLakhs}L`
}

function formatPostedLabel(t: TFunction<'public'>, createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  if (days <= 0) return t('jobDetail.postedToday')
  if (days === 1) return t('jobDetail.postedOneDayAgo')
  if (days < 7) return t('jobDetail.postedDaysAgo', { days })
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? t('jobDetail.postedOneWeekAgo') : t('jobDetail.postedWeeksAgo', { weeks })
}

function findSimilarJobs(current: JobDetail, allJobs: JobSummary[], count = 3): JobSummary[] {
  const scored = allJobs
    .filter((job) => job.id !== current.id)
    .map((job) => ({
      job,
      sharedSkills: job.skills.filter((skill) => current.skills.includes(skill)).length,
    }))
    .sort((a, b) => b.sharedSkills - a.sharedSkills)
  return scored.slice(0, count).map((entry) => entry.job)
}

/** Shared by the header apply CTA and the one repeated after the job description — same
 * applicationId/applying state drives both, so a click on either stays in sync. */
function ApplyButton({
  applied,
  applying,
  onApply,
  t,
}: {
  applied: boolean
  applying: boolean
  onApply: () => void
  t: TFunction<'public'>
}) {
  if (applied) {
    return (
      <span className="rounded-control bg-teal px-6 py-2.5 text-sm font-bold text-white">
        {t('jobDetail.applied')}
      </span>
    )
  }
  return (
    <button
      type="button"
      disabled={applying}
      onClick={onApply}
      className="rounded-control bg-primary px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-primary/50"
    >
      {applying ? t('jobDetail.applying') : t('jobDetail.applyNow')}
    </button>
  )
}

function NotFound() {
  const { t } = useTranslation('public')
  const localize = useLocalizedPath()
  return (
    <main className="mx-auto max-w-[640px] px-6 py-24 text-center">
      <h1 className="mb-2 text-h2 text-ink">{t('jobDetail.notFound.title')}</h1>
      <p className="mb-6 text-body text-slate">{t('jobDetail.notFound.description')}</p>
      <Link to={localize(ROUTES.jobs)} className="text-sm font-bold text-primary no-underline">
        {t('jobDetail.notFound.backToSearch')}
      </Link>
    </main>
  )
}

export default function JobDetailPage() {
  const { t } = useTranslation('public')
  const localize = useLocalizedPath()
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)

  const [job, setJob] = useState<JobDetail | null>(null)
  const [similarJobs, setSimilarJobs] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setNotFound(false)
      try {
        const [detail, allJobs] = await Promise.all([
          jobsApi.detail(jobId as string),
          jobsApi.search({ sort: 'newest' }),
        ])
        if (cancelled) return
        setJob(detail)
        setSimilarJobs(findSimilarJobs(detail, allJobs))

        if (authStatus === 'authenticated' && user?.role === 'CANDIDATE') {
          const mine = await applicationsApi.mine()
          if (cancelled) return
          const existing = mine.find(
            (application) => application.jobId === jobId && application.status !== 'WITHDRAWN',
          )
          setApplicationId(existing?.id ?? null)
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [jobId, authStatus, user?.role])

  // Withdrawing lives on the Applications page only (see ApplicationsPage) — once applied, this
  // page just shows a static "Applied" label rather than offering a withdraw action here too.
  async function handleApplyClick() {
    if (!job) return
    if (authStatus !== 'authenticated') {
      navigate(localize(ROUTES.login))
      return
    }
    setApplyError(null)
    setApplying(true)
    try {
      const created = await applicationsApi.apply(job.id)
      setApplicationId(created.id)
      setJob((prev) => (prev ? { ...prev, applicantCount: prev.applicantCount + 1 } : prev))
    } catch (error) {
      setApplyError(error instanceof ApiError ? error.message : t('jobDetail.applyError'))
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[640px] px-6 py-24 text-center text-slate">
        {t('jobDetail.loading')}
      </main>
    )
  }

  if (notFound || !job) {
    return <NotFound />
  }

  const mode = workModeFromBackend(job.workMode)
  const initial = job.companyName.charAt(0).toUpperCase()

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <div className="search:grid-cols-[minmax(0,1fr)_300px] grid grid-cols-1 gap-6">
        <div>
          <Card className="mb-5 p-7">
            <div className="flex flex-wrap justify-between gap-[18px]">
              <div className="flex gap-4">
                <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
                  {initial}
                </div>
                <div>
                  <h1 className="mb-1.5 text-[23px] font-extrabold tracking-[-0.01em] text-ink">
                    {job.title}
                  </h1>
                  <div className="text-[15px] text-slate">
                    {job.companyName} · {job.location} · {mode}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      ...job.skills,
                      formatSalary(t, job.salaryMinLakhs, job.salaryMaxLakhs) + ' / yr',
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-neutral-tint px-3 py-1 text-[12.5px] font-semibold text-[#3A414D]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2.5">
                <ApplyButton
                  applied={applicationId != null}
                  applying={applying}
                  onApply={handleApplyClick}
                  t={t}
                />
              </div>
            </div>
            {applyError && (
              <div className="mt-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
                {applyError}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#F0F1F3] pt-4 text-[13.5px] text-fog">
              <span>
                {t('jobDetail.postedPrefix', { label: formatPostedLabel(t, job.createdAt) })}
              </span>
              <span>·</span>
              <span>{t('jobDetail.applicantsCount', { count: job.applicantCount })}</span>
              <span>·</span>
              <span>{t('jobDetail.sourcedFrom')}</span>
            </div>
          </Card>

          <Card className="mb-5 p-7">
            <h2 className="mb-3.5 text-[17px] font-bold text-ink">{t('jobDetail.aboutRole')}</h2>
            <p className="mb-[18px] text-[14.5px] leading-[1.7] whitespace-pre-line text-[#3A414D]">
              {job.aboutRole}
            </p>
            <h3 className="mb-2.5 text-[15px] font-bold text-ink">
              {t('jobDetail.responsibilities')}
            </h3>
            <ul className="mb-[18px] list-disc pl-5 text-[14.5px] leading-[1.8] text-[#3A414D]">
              {job.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className="mb-2.5 text-[15px] font-bold text-ink">{t('jobDetail.requirements')}</h3>
            <ul className="mb-[18px] list-disc pl-5 text-[14.5px] leading-[1.8] text-[#3A414D]">
              {job.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="flex justify-end border-t border-[#F0F1F3] pt-5">
              <ApplyButton
                applied={applicationId != null}
                applying={applying}
                onApply={handleApplyClick}
                t={t}
              />
            </div>
          </Card>
        </div>

        <aside className="search:order-none order-first">
          <div className="mb-4 rounded-card border border-[#FCE3B8] bg-amber-tint p-5">
            <span className="rounded-full bg-surface px-2.5 py-[3px] text-[11.5px] font-bold text-amber">
              {t('jobDetail.sidebar.whileYouWait')}
            </span>
            <h3 className="mt-3 mb-2 text-[15px] font-bold text-ink">
              {t('jobDetail.sidebar.partnerHeading')}
            </h3>
            <p className="mb-3.5 text-[13.5px] leading-[1.55] text-slate">
              {t('jobDetail.sidebar.partnerBody')}
            </p>
            <Link
              to={localize(ROUTES.partnerships)}
              className="block rounded-lg bg-amber py-2.5 text-center text-[13.5px] font-bold text-white no-underline"
            >
              {t('jobDetail.sidebar.viewPartnership')}
            </Link>
          </div>

          <div className="mb-4 rounded-card border border-[#C9EEDF] bg-teal-tint p-5">
            <span className="rounded-full bg-surface px-2.5 py-[3px] text-[11.5px] font-bold text-teal">
              {t('jobDetail.sidebar.communityIncome')}
            </span>
            <h3 className="mt-3 mb-2 text-[15px] font-bold text-ink">
              {t('jobDetail.sidebar.communityIncomeHeading')}
            </h3>
            <p className="mb-3.5 text-[13.5px] leading-[1.55] text-slate">
              {t('jobDetail.sidebar.communityIncomeBody')}
            </p>
            <Link
              to={localize(ROUTES.community)}
              className="block rounded-lg bg-teal py-2.5 text-center text-[13.5px] font-bold text-white no-underline"
            >
              {t('jobDetail.sidebar.learnMore')}
            </Link>
          </div>

          {similarJobs.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 text-[14.5px] font-bold text-ink">
                {t('jobDetail.sidebar.similarJobs')}
              </h3>
              {similarJobs.map((similar) => (
                <Link
                  key={similar.id}
                  to={localize(ROUTES.jobDetail(similar.id))}
                  className="block border-t border-[#F0F1F3] py-2.5 no-underline first:border-t-0"
                >
                  <div className="text-sm font-semibold text-ink">{similar.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-fog">
                    {similar.companyName} ·{' '}
                    {formatSalary(t, similar.salaryMinLakhs, similar.salaryMaxLakhs)}
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </aside>
      </div>
    </main>
  )
}
