import { useEffect, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { LoadingState, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { adminApi } from '../../lib/adminApi'
import type { JobDetail } from '../../lib/jobsApi'
import {
  employmentTypeFromBackend,
  experienceLevelFromBackend,
  workModeFromBackend,
} from '../../lib/jobEnums'

function formatSubmittedLabel(t: TFunction<'admin'>, createdAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
  if (minutes < 60)
    return minutes <= 1 ? t('jobApprovals.justNow') : t('jobApprovals.minutesAgo', { minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return hours === 1 ? t('jobApprovals.oneHourAgo') : t('jobApprovals.hoursAgo', { hours })
  const days = Math.floor(hours / 24)
  return days === 1 ? t('jobApprovals.oneDayAgo') : t('jobApprovals.daysAgo', { days })
}

function formatSalary(
  t: TFunction<'admin'>,
  minLakhs: number | null,
  maxLakhs: number | null,
): string {
  if (minLakhs == null && maxLakhs == null) return t('jobApprovals.salaryNotDisclosed')
  if (minLakhs != null && maxLakhs != null) return `₹${minLakhs}L–${maxLakhs}L`
  return `₹${minLakhs ?? maxLakhs}L`
}

export default function AdminJobApprovalsPage() {
  const { t } = useTranslation('admin')
  // queryInput tracks every keystroke (controlled input value); submittedQuery only updates on
  // Enter and is what actually drives the search request — typing alone doesn't trigger it.
  const [queryInput, setQueryInput] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [jobs, setJobs] = useState<JobDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<JobDetail | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    // submittedQuery only changes on Enter (see handleSearchKeyDown), so this isn't debouncing
    // keystrokes — the setTimeout wrapper just keeps the setState calls out of the effect body
    // proper, same as the other admin list pages.
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
      adminApi
        .pendingJobs(submittedQuery.trim() || undefined)
        .then((result) => {
          if (!cancelled) setJobs(result)
        })
        .catch((caught) => {
          if (!cancelled) {
            setError(caught instanceof ApiError ? caught.message : t('jobApprovals.loadError'))
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [submittedQuery, t])

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      setSubmittedQuery(queryInput)
    }
  }

  async function handleApprove(jobId: string) {
    setActioningId(jobId)
    try {
      await adminApi.approveJob(jobId)
      setJobs((prev) => prev.filter((job) => job.id !== jobId))
    } catch {
      // Best-effort — the job simply stays in the pending list if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  function closeRejectModal() {
    setRejectTarget(null)
    setRejectReason('')
  }

  async function handleConfirmReject() {
    if (!rejectTarget || !rejectReason.trim()) return
    setRejectSubmitting(true)
    try {
      await adminApi.rejectJob(rejectTarget.id, rejectReason.trim())
      setJobs((prev) => prev.filter((job) => job.id !== rejectTarget.id))
      closeRejectModal()
    } catch {
      // Best-effort — the job simply stays in the pending list if the call fails.
    } finally {
      setRejectSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('jobApprovals.title')}</h1>
          <p className="text-sm text-slate">{t('jobApprovals.subtitle')}</p>
        </div>
        <div className="rounded-full bg-amber-tint px-3.5 py-1.5 text-[13.5px] font-bold text-amber">
          {t('jobApprovals.pendingCount', { count: jobs.length })}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5 rounded-card border border-border bg-surface p-4">
        <div className="flex min-w-[220px] flex-[2] items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="shrink-0 text-fog"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('jobApprovals.searchPlaceholder')}
            className="w-full text-[13.5px] text-ink outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10">
          <LoadingState message={t('jobApprovals.loading')} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {submittedQuery.trim() ? t('jobApprovals.noMatches') : t('jobApprovals.noneWaiting')}
        </div>
      ) : (
        (() => {
          const job = jobs[0]
          return (
            <div key={job.id} className="rounded-card border border-border bg-surface p-[22px]">
              <div className="mb-3.5 flex flex-wrap justify-between gap-4">
                <div className="flex gap-3.5">
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-primary-tint">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2451D6"
                      strokeWidth={2}
                    >
                      <path d="M3 7h18v13H3zM3 7l9-4 9 4" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15.5px] font-bold text-ink">{job.title}</span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-slate">
                      {t('jobApprovals.jobMeta', {
                        company: job.companyName,
                        location: job.location,
                        mode: workModeFromBackend(job.workMode),
                        submitted: formatSubmittedLabel(t, job.createdAt),
                      })}
                    </div>
                  </div>
                </div>
                <span className="h-fit rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-amber">
                  {t('dashboard.companyStatus.pendingReview')}
                </span>
              </div>

              <p className="mb-3.5 text-[13.5px] leading-[1.6] text-[#3A414D]">{job.aboutRole}</p>

              <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 rounded-[10px] bg-page p-3.5">
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('jobApprovals.employmentType')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">
                    {employmentTypeFromBackend(job.employmentType)}
                  </div>
                </div>
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('jobApprovals.experienceLevel')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">
                    {experienceLevelFromBackend(job.experienceLevel)}
                  </div>
                </div>
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('jobApprovals.salary')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">
                    {formatSalary(t, job.salaryMinLakhs, job.salaryMaxLakhs)}
                  </div>
                </div>
                {job.applicationDeadline && (
                  <div>
                    <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                      {t('jobApprovals.applicationDeadline')}
                    </div>
                    <div className="text-[13px] font-semibold text-ink">
                      {new Date(job.applicationDeadline).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                )}
              </div>

              {job.responsibilities.length > 0 && (
                <div className="mb-3.5">
                  <div className="mb-1 text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('jobApprovals.responsibilities')}
                  </div>
                  <ul className="list-disc space-y-0.5 pl-4 text-[13.5px] leading-[1.6] text-[#3A414D]">
                    {job.responsibilities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.requirements.length > 0 && (
                <div className="mb-3.5">
                  <div className="mb-1 text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('jobApprovals.requirements')}
                  </div>
                  <ul className="list-disc space-y-0.5 pl-4 text-[13.5px] leading-[1.6] text-[#3A414D]">
                    {job.requirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.skills.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-neutral-tint px-2.5 py-1 text-[12px] font-semibold text-[#3A414D]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={actioningId === job.id}
                  onClick={() => handleApprove(job.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-teal px-5 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-60"
                >
                  {actioningId === job.id ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={3}
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                  {t('jobApprovals.approve')}
                </button>
                <button
                  type="button"
                  disabled={actioningId === job.id}
                  onClick={() => setRejectTarget(job)}
                  className="rounded-lg border border-[#FCA5A5] bg-surface px-5 py-2.5 text-[13.5px] font-bold text-danger disabled:opacity-60"
                >
                  {t('jobApprovals.reject')}
                </button>
              </div>
            </div>
          )
        })()
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#14181F]/75 p-5">
          <div className="relative w-full max-w-[440px] rounded-2xl bg-surface p-7">
            <button
              type="button"
              onClick={closeRejectModal}
              aria-label={t('rejectModal.cancel')}
              className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-tint text-[15px]"
            >
              ×
            </button>
            <h3 className="mb-1 text-[17px] font-bold text-ink">{t('rejectModal.title')}</h3>
            <p className="mb-4 text-[13.5px] text-slate">{rejectTarget.title}</p>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">
              {t('rejectModal.reasonLabel')}
            </label>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder={t('rejectModal.reasonPlaceholder')}
              rows={4}
              className="mb-1.5 w-full rounded-lg border border-border p-3 text-[13.5px] text-ink outline-none"
            />
            {!rejectReason.trim() && (
              <p className="mb-1.5 text-[12px] text-fog">{t('rejectModal.reasonRequired')}</p>
            )}
            <div className="mt-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-[13px] font-bold text-ink"
              >
                {t('rejectModal.cancel')}
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || rejectSubmitting}
                onClick={handleConfirmReject}
                className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {rejectSubmitting && <Spinner className="h-3.5 w-3.5" />}
                {rejectSubmitting ? t('rejectModal.submitting') : t('rejectModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
