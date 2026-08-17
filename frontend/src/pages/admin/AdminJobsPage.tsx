import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingState, ShareButton, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { adminApi } from '../../lib/adminApi'
import { jobShareUrl, jobsApi, type JobSummary } from '../../lib/jobsApi'
import { workModeFromBackend } from '../../lib/jobEnums'

const PAGE_SIZE = 10

export default function AdminJobsPage() {
  const { t } = useTranslation('admin')
  const [query, setQuery] = useState('')
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [featuringId, setFeaturingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Resets to page 1 whenever the search query itself changes — adjusted during render (see
  // JobSearchPage for the same pattern) rather than inside the fetch effect below, since that
  // effect also depends on `page` (a Previous/Next click needs to refetch, unlike the old
  // client-side-only pagination this replaced) and resetting page there too would fight it.
  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setPage(1)
  }

  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
      jobsApi
        .search({ ...(query.trim() ? { q: [query.trim()] } : {}), page: page - 1, size: PAGE_SIZE })
        .then((result) => {
          if (!cancelled) {
            setJobs(result.jobs)
            setTotalPages(Math.max(1, result.totalPages))
          }
        })
        .catch((caught) => {
          if (!cancelled) {
            setError(caught instanceof ApiError ? caught.message : t('jobs.loadError'))
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [query, page, t])

  async function handleToggleFeatured(job: JobSummary) {
    setFeaturingId(job.id)
    try {
      const updated = job.isFeatured
        ? await adminApi.unfeatureJob(job.id)
        : await adminApi.featureJob(job.id)
      setJobs((prev) => prev.map((existing) => (existing.id === job.id ? updated : existing)))
    } catch {
      // Best-effort — the row simply keeps its current featured state if the call fails.
    } finally {
      setFeaturingId(null)
    }
  }

  async function handleDelete(job: JobSummary) {
    if (!window.confirm(t('jobs.confirmDelete', { title: job.title }))) return
    setDeletingId(job.id)
    try {
      await adminApi.deleteJob(job.id)
      setJobs((prev) => prev.filter((existing) => existing.id !== job.id))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('jobs.deleteError'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="mb-5">
        <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('jobs.title')}</h1>
        <p className="text-sm text-slate">{t('jobs.subtitle')}</p>
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
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('jobs.searchPlaceholder')}
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
        <div className="rounded-card border border-border bg-surface p-8">
          <LoadingState message={t('jobs.loading')} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] font-bold text-ink">{job.title}</span>
                  {job.isFeatured && (
                    <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-primary">
                      {t('jobs.featured')}
                    </span>
                  )}
                  {job.isPromoted && (
                    <span className="rounded-full bg-amber-tint px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-amber">
                      {t('jobs.promoted')}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[13px] text-slate">
                  {t('jobs.jobMeta', {
                    company: job.companyName,
                    location: job.location,
                    mode: workModeFromBackend(job.workMode),
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShareButton
                  url={jobShareUrl(job.id)}
                  label={t('jobs.share')}
                  copiedLabel={t('jobs.linkCopied')}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink"
                />
                <button
                  type="button"
                  disabled={featuringId === job.id}
                  onClick={() => handleToggleFeatured(job)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                >
                  {featuringId === job.id && <Spinner className="h-3.5 w-3.5" />}
                  {job.isFeatured ? t('jobs.unfeature') : t('jobs.feature')}
                </button>
                <button
                  type="button"
                  disabled={deletingId === job.id}
                  onClick={() => handleDelete(job)}
                  className="flex items-center gap-1.5 rounded-md border border-[#FCA5A5] bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-danger disabled:opacity-60"
                >
                  {deletingId === job.id && <Spinner className="h-3.5 w-3.5" />}
                  {t('jobs.delete')}
                </button>
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
              {t('jobs.none')}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('jobs.previousPage')}
              </button>
              <span className="text-[13px] text-slate">
                {t('jobs.pageLabel', { page, total: totalPages })}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('jobs.nextPage')}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
