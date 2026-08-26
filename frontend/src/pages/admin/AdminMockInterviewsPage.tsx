import { useEffect, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { adminApi, type AdminMockInterviewSessionSummary } from '../../lib/adminApi'
import { mockInterviewShareUrl } from '../../lib/mockInterviewApi'

const PAGE_SIZE = 10

const AVATAR_COLOR_CLASSES = ['bg-primary', 'bg-teal', 'bg-amber']

function colorForName(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Watching a recording opens the session's own existing public share link (same one a candidate
// can copy from MockInterviewPage) in a new tab, rather than a second admin-only video player —
// same file, same range-request-capable endpoint MockInterviewShareController already serves.
export default function AdminMockInterviewsPage() {
  const { t } = useTranslation('admin')

  // queryInput tracks every keystroke; submittedQuery only updates on Enter and is what
  // actually drives the request — same split as AdminMockInterviewQuestionsPage.
  const [queryInput, setQueryInput] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const [sessions, setSessions] = useState<AdminMockInterviewSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    // The setTimeout wrapper just keeps the setState calls out of the effect body proper, same
    // as the other admin list pages (see AdminMockInterviewQuestionsPage).
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
      setPage(1)
      adminApi
        .mockInterviews(submittedQuery.trim() || undefined)
        .then((result) => {
          if (!cancelled) setSessions(result)
        })
        .catch((caught) => {
          if (!cancelled) {
            setError(caught instanceof ApiError ? caught.message : t('mockInterviews.loadError'))
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
    if (event.key === 'Enter') setSubmittedQuery(queryInput)
  }

  const pageCount = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleSessions = sessions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <main className="mx-auto max-w-[900px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('mockInterviews.title')}</h1>
      <p className="mb-5 text-sm text-slate">{t('mockInterviews.subtitle')}</p>

      <input
        value={queryInput}
        onChange={(event) => setQueryInput(event.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder={t('mockInterviews.searchPlaceholder')}
        className="mb-5 w-full max-w-[360px] rounded-control border border-border px-3 py-2 text-[13.5px] text-ink placeholder:text-fog"
      />

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10">
          <LoadingState message={t('mockInterviews.loading')} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('mockInterviews.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleSessions.map((session) => {
            const name = session.candidateName ?? t('mockInterviews.unknownCandidate')
            return (
              <div
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface px-5 py-[18px]"
              >
                <div className="flex gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white ${colorForName(name)}`}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-ink">{name}</span>
                      {session.visibleToCompanies && (
                        <span className="rounded-full bg-teal-tint px-2.5 py-1 text-xs font-semibold text-teal">
                          {t('mockInterviews.visibleToCompanies')}
                        </span>
                      )}
                    </div>
                    {session.candidateEmail && (
                      <div className="mt-0.5 text-[13px] text-slate">{session.candidateEmail}</div>
                    )}
                    <div className="mt-0.5 text-[12px] text-fog">
                      {t('mockInterviews.recordedOn', { date: formatDate(session.recordedAt) })}
                      {' · '}
                      {t('mockInterviews.durationAndQuestions', {
                        duration: formatDuration(session.durationSeconds),
                        count: session.questionCount,
                      })}
                    </div>
                  </div>
                </div>
                <a
                  href={mockInterviewShareUrl(session.shareToken)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-primary px-3.5 py-2 text-[12.5px] font-bold text-white no-underline"
                >
                  {t('mockInterviews.watch')}
                </a>
              </div>
            )
          })}
          {pageCount > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('mockInterviews.previousPage')}
              </button>
              <span className="text-[13px] text-slate">
                {t('mockInterviews.pageLabel', { page: currentPage, total: pageCount })}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                disabled={currentPage === pageCount}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('mockInterviews.nextPage')}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
