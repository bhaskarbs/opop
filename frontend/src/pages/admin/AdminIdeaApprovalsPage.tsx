import { useEffect, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { adminApi } from '../../lib/adminApi'
import type { BackendIdeaStage, IdeaDetail } from '../../lib/ideasApi'

const STAGE_KEYS: Record<BackendIdeaStage, string> = {
  CONCEPT: 'browse.stages.concept',
  PROTOTYPE: 'browse.stages.prototype',
  LIVE: 'browse.stages.live',
}

export default function AdminIdeaApprovalsPage() {
  const { t } = useTranslation('ideas')
  // queryInput tracks every keystroke (controlled input value); submittedQuery only updates on
  // Enter and is what actually drives the search request — typing alone doesn't trigger it.
  const [queryInput, setQueryInput] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [ideas, setIdeas] = useState<IdeaDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<IdeaDetail | null>(null)
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
        .pendingIdeas(submittedQuery.trim() || undefined)
        .then((result) => {
          if (!cancelled) setIdeas(result)
        })
        .catch((caught) => {
          if (!cancelled) {
            setError(caught instanceof ApiError ? caught.message : t('adminApprovals.loadError'))
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

  async function handleApprove(ideaId: string) {
    setActioningId(ideaId)
    try {
      await adminApi.approveIdea(ideaId)
      setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId))
    } catch {
      // Best-effort — the idea simply stays in the pending list if the call fails.
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
      await adminApi.rejectIdea(rejectTarget.id, rejectReason.trim())
      setIdeas((prev) => prev.filter((idea) => idea.id !== rejectTarget.id))
      closeRejectModal()
    } catch {
      // Best-effort — the idea simply stays in the pending list if the call fails.
    } finally {
      setRejectSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('adminApprovals.title')}</h1>
          <p className="text-sm text-slate">{t('adminApprovals.subtitle')}</p>
        </div>
        <div className="rounded-full bg-amber-tint px-3.5 py-1.5 text-[13.5px] font-bold text-amber">
          {t('adminApprovals.pendingCount', { count: ideas.length })}
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
            placeholder={t('adminApprovals.searchPlaceholder')}
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
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('adminApprovals.loading')}
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {submittedQuery.trim() ? t('adminApprovals.noMatches') : t('adminApprovals.noneWaiting')}
        </div>
      ) : (
        (() => {
          const idea = ideas[0]
          return (
            <div key={idea.id} className="rounded-card border border-border bg-surface p-[22px]">
              <div className="mb-3 flex flex-wrap justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15.5px] font-bold text-ink">{idea.title}</h3>
                    <span className="rounded-full bg-teal-tint px-2.5 py-[3px] text-[11px] font-bold text-teal">
                      {idea.category}
                    </span>
                  </div>
                  <div className="mt-[3px] text-[13px] text-slate">
                    {t('adminApprovals.submittedMeta', {
                      submitter: idea.submitterName,
                      type: t(`browse.submitterTypes.${idea.submitterRole.toLowerCase()}`),
                      date: new Date(idea.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }),
                    })}
                  </div>
                </div>
                <span className="h-fit rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-amber">
                  {idea.edited
                    ? t('myIdeas.statuses.updatedPendingReview')
                    : t('myIdeas.statuses.pendingReview')}
                </span>
              </div>

              <p className="mb-1.5 text-[13.5px] leading-[1.6] text-[#3A414D]">{idea.problem}</p>
              <p className="mb-3.5 text-[13.5px] leading-[1.6] text-[#3A414D]">{idea.solution}</p>

              <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 rounded-[10px] bg-page p-3.5">
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('adminApprovals.stage')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">
                    {t(STAGE_KEYS[idea.stage])}
                  </div>
                </div>
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('adminApprovals.targetMarket')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{idea.targetMarket}</div>
                </div>
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('adminApprovals.fundingSought')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{idea.funding ?? '—'}</div>
                </div>
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('adminApprovals.equity')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{idea.equity ?? '—'}</div>
                </div>
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('adminApprovals.teamNeeded')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{idea.teamSize ?? '—'}</div>
                </div>
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('adminApprovals.timeline')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{idea.timeline ?? '—'}</div>
                </div>
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('adminApprovals.contactEmail')}
                  </div>
                  <a
                    href={`mailto:${idea.contactEmail}`}
                    className="text-[13px] font-semibold text-primary"
                  >
                    {idea.contactEmail}
                  </a>
                </div>
                {idea.videoLink && (
                  <div>
                    <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                      {t('adminApprovals.videoLink')}
                    </div>
                    <a
                      href={idea.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[13px] font-semibold text-primary"
                    >
                      {idea.videoLink}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={actioningId === idea.id}
                  onClick={() => handleApprove(idea.id)}
                  className="flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-60"
                >
                  {actioningId === idea.id && <Spinner className="h-4 w-4" />}
                  {t('adminApprovals.approveAndPublish')}
                </button>
                <button
                  type="button"
                  disabled={actioningId === idea.id}
                  onClick={() => setRejectTarget(idea)}
                  className="rounded-lg border border-[#FCA5A5] bg-surface px-5 py-2.5 text-[13.5px] font-bold text-danger disabled:opacity-60"
                >
                  {t('adminApprovals.reject')}
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
              aria-label={t('adminApprovals.rejectModal.cancel')}
              className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-tint text-[15px]"
            >
              ×
            </button>
            <h3 className="mb-1 text-[17px] font-bold text-ink">
              {t('adminApprovals.rejectModal.title')}
            </h3>
            <p className="mb-4 text-[13.5px] text-slate">{rejectTarget.title}</p>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">
              {t('adminApprovals.rejectModal.reasonLabel')}
            </label>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder={t('adminApprovals.rejectModal.reasonPlaceholder')}
              rows={4}
              className="mb-1.5 w-full rounded-lg border border-border p-3 text-[13.5px] text-ink outline-none"
            />
            {!rejectReason.trim() && (
              <p className="mb-1.5 text-[12px] text-fog">
                {t('adminApprovals.rejectModal.reasonRequired')}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-[13px] font-bold text-ink"
              >
                {t('adminApprovals.rejectModal.cancel')}
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || rejectSubmitting}
                onClick={handleConfirmReject}
                className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {rejectSubmitting && <Spinner className="h-3.5 w-3.5" />}
                {rejectSubmitting
                  ? t('adminApprovals.rejectModal.submitting')
                  : t('adminApprovals.rejectModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
