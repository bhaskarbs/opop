import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { applicationsApi } from '../../lib/applicationsApi'
import { savedJobsApi } from '../../lib/savedJobsApi'
import { ResultCard } from '../job-search/ResultCard'
import { toDisplayJob, type DisplayJob } from '../job-search/jobDisplay'

const PAGE_SIZE = 10

export default function SavedJobsPage() {
  const { t } = useTranslation('candidate')
  const [jobs, setJobs] = useState<DisplayJob[]>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [saved, applications] = await Promise.all([
          savedJobsApi.mine(),
          applicationsApi.mine(),
        ])
        if (cancelled) return
        setJobs(saved.map(toDisplayJob))
        setAppliedJobIds(
          new Set(
            applications
              .filter((application) => application.status !== 'WITHDRAWN')
              .map((application) => application.jobId),
          ),
        )
      } catch (caught) {
        if (!cancelled)
          setError(caught instanceof ApiError ? caught.message : t('savedJobs.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [t])

  // Optimistic — removes the row immediately rather than waiting on the request; a failed
  // unsave just leaves it absent locally until the next reload, when it'll reappear since the
  // backend never actually removed the bookmark.
  function handleUnsave(jobId: string) {
    setJobs((prev) => prev.filter((job) => job.id !== jobId))
    savedJobsApi.unsave(jobId).catch(() => {
      // See comment above.
    })
  }

  const pageCount = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = jobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <main className="mx-auto max-w-[1000px] px-6 pt-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('savedJobs.title')}</h1>
      <p className="mb-5 text-sm text-slate">{t('savedJobs.subtitle')}</p>

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10">
          <LoadingState message={t('savedJobs.loading')} />
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {visible.map((job) => (
            <ResultCard
              key={job.id}
              job={job}
              applied={appliedJobIds.has(job.id)}
              saved
              onToggleSave={() => handleUnsave(job.id)}
            />
          ))}
          {visible.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
              {t('savedJobs.empty')}
            </div>
          )}
          {pageCount > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('savedJobs.previousPage')}
              </button>
              <span className="text-[13px] text-slate">
                {t('savedJobs.pageLabel', { page: currentPage, total: pageCount })}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                disabled={currentPage === pageCount}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('savedJobs.nextPage')}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
