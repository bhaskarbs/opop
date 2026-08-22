import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LoadingState, Spinner } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ApiError } from '../../lib/apiClient'
import { adminApi } from '../../lib/adminApi'
import { ideasApi, type IdeaSummary } from '../../lib/ideasApi'
import { ROUTES } from '../../routes/paths'

const PAGE_SIZE = 10

export default function AdminIdeasPage() {
  const { t } = useTranslation('admin')
  const localize = useLocalizedPath()
  const [query, setQuery] = useState('')
  const [ideas, setIdeas] = useState<IdeaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [featuringId, setFeaturingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
      setPage(1)
      ideasApi
        .browse(query.trim() ? { q: query.trim() } : {})
        .then((result) => {
          if (!cancelled) setIdeas(result)
        })
        .catch((caught) => {
          if (!cancelled) {
            setError(caught instanceof ApiError ? caught.message : t('ideas.loadError'))
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
  }, [query, t])

  async function handleToggleFeatured(idea: IdeaSummary) {
    setFeaturingId(idea.id)
    try {
      const updated = idea.isFeatured
        ? await adminApi.unfeatureIdea(idea.id)
        : await adminApi.featureIdea(idea.id)
      setIdeas((prev) =>
        prev.map((existing) =>
          existing.id === idea.id ? { ...existing, isFeatured: updated.isFeatured } : existing,
        ),
      )
    } catch {
      // Best-effort — the row simply keeps its current featured state if the call fails.
    } finally {
      setFeaturingId(null)
    }
  }

  async function handleDelete(idea: IdeaSummary) {
    if (!window.confirm(t('ideas.confirmDelete', { title: idea.title }))) return
    setDeletingId(idea.id)
    try {
      await adminApi.deleteIdea(idea.id)
      setIdeas((prev) => prev.filter((existing) => existing.id !== idea.id))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('ideas.deleteError'))
    } finally {
      setDeletingId(null)
    }
  }

  const pageCount = Math.max(1, Math.ceil(ideas.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleIdeas = ideas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('ideas.title')}</h1>
          <p className="text-sm text-slate">{t('ideas.subtitle')}</p>
        </div>
        <Link
          to={localize(ROUTES.adminPostIdea)}
          className="inline-block rounded-lg bg-primary px-4 py-2.5 text-[13px] font-bold text-white no-underline"
        >
          {t('ideas.addIdea')}
        </Link>
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
            placeholder={t('ideas.searchPlaceholder')}
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
          <LoadingState message={t('ideas.loading')} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleIdeas.map((idea) => (
            <div
              key={idea.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] font-bold text-ink">{idea.title}</span>
                  <span className="rounded-full bg-neutral-tint px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-[#3A414D]">
                    {idea.category}
                  </span>
                  {idea.isFeatured && (
                    <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-primary">
                      {t('ideas.featured')}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[13px] text-slate">
                  {t('ideas.ideaMeta', {
                    submitter: idea.submitterName,
                    type: t(`ideas.submitterTypes.${idea.submitterRole.toLowerCase()}`),
                  })}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to={localize(ROUTES.adminIdeaEdit(idea.id))}
                  className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink no-underline"
                >
                  {t('ideas.edit')}
                </Link>
                <button
                  type="button"
                  disabled={featuringId === idea.id}
                  onClick={() => handleToggleFeatured(idea)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                >
                  {featuringId === idea.id && <Spinner className="h-3.5 w-3.5" />}
                  {idea.isFeatured ? t('ideas.unfeature') : t('ideas.feature')}
                </button>
                <button
                  type="button"
                  disabled={deletingId === idea.id}
                  onClick={() => handleDelete(idea)}
                  className="flex items-center gap-1.5 rounded-md border border-[#FCA5A5] bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-danger disabled:opacity-60"
                >
                  {deletingId === idea.id && <Spinner className="h-3.5 w-3.5" />}
                  {t('ideas.delete')}
                </button>
              </div>
            </div>
          ))}
          {ideas.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
              {t('ideas.none')}
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
                {t('ideas.previousPage')}
              </button>
              <span className="text-[13px] text-slate">
                {t('ideas.pageLabel', { page: currentPage, total: pageCount })}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                disabled={currentPage === pageCount}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('ideas.nextPage')}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
