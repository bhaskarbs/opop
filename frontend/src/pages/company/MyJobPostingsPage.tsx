import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from 'react-router-dom'
import { ApiError } from '../../lib/apiClient'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { jobsApi, type JobSummary } from '../../lib/jobsApi'
import { ROUTES } from '../../routes/paths'

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

// Mirrors CompanyDashboardPage's formatPostedLabel — kept as its own local copy rather than a
// shared util, same precedent as that page's own duplicate-free helper.
function formatPostedLabel(t: TFunction<'company'>, createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  if (days <= 0) return t('dashboard.postedToday')
  if (days === 1) return t('dashboard.postedOneDayAgo')
  if (days < 7) return t('dashboard.postedDaysAgo', { days })
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? t('dashboard.postedOneWeekAgo') : t('dashboard.postedWeeksAgo', { weeks })
}

/** The full, unfiltered list behind CompanyDashboardPage's "Manage all →" link and the
 * previously-inert "Job Postings" user-menu item — same GET /api/jobs/mine the dashboard's own
 * (dashboard-truncated) preview already uses, just with nothing cut off. */
export default function MyJobPostingsPage() {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const [postings, setPostings] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    jobsApi
      .mine()
      .then((result) => {
        if (!cancelled) setPostings(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(caught instanceof ApiError ? caught.message : t('myJobPostings.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <main className="mx-auto max-w-[900px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-extrabold text-ink">{t('myJobPostings.title')}</h1>
          <p className="text-sm text-slate">{t('myJobPostings.subtitle')}</p>
        </div>
        <Link
          to={localize(ROUTES.companyPostJob)}
          className="rounded-lg bg-primary px-[18px] py-2.5 text-[13.5px] font-bold text-white no-underline"
        >
          {t('dashboard.postJob')}
        </Link>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('myJobPostings.loading')}
        </div>
      ) : postings.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('myJobPostings.empty')}
        </div>
      ) : (
        <div className="rounded-card border border-border bg-surface p-[22px]">
          {postings.map((posting) => (
            <div
              key={posting.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F1F3] py-3.5 first:border-t-0"
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
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[posting.status]}`}
                >
                  {t(STATUS_LABEL_KEYS[posting.status])}
                </span>
                {posting.status === 'PENDING_APPROVAL' ? (
                  <span
                    title={t('myJobPostings.pendingReviewNotice')}
                    className="cursor-not-allowed text-[13px] font-bold text-fog"
                  >
                    {t('myJobPostings.manage')}
                  </span>
                ) : (
                  <Link
                    to={localize(ROUTES.companyJobEdit(posting.id))}
                    className="text-[13px] font-bold text-primary no-underline"
                  >
                    {t('myJobPostings.manage')}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
