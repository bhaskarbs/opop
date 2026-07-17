import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/apiClient'
import { adminApi } from '../../lib/adminApi'
import type { BackendIdeaStage, IdeaSummary } from '../../lib/ideasApi'

const STAGE_KEYS: Record<BackendIdeaStage, string> = {
  CONCEPT: 'browse.stages.concept',
  PROTOTYPE: 'browse.stages.prototype',
  LIVE: 'browse.stages.live',
}

export default function AdminIdeaApprovalsPage() {
  const { t } = useTranslation('ideas')
  const [ideas, setIdeas] = useState<IdeaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi
      .pendingIdeas()
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
    return () => {
      cancelled = true
    }
  }, [t])

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

  async function handleReject(ideaId: string) {
    setActioningId(ideaId)
    try {
      await adminApi.rejectIdea(ideaId)
      setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId))
    } catch {
      // Best-effort — the idea simply stays in the pending list if the call fails.
    } finally {
      setActioningId(null)
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

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">{error}</div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('adminApprovals.loading')}
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('adminApprovals.noneWaiting')}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {ideas.map((idea) => (
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
                  {t('myIdeas.statuses.pendingReview')}
                </span>
              </div>

              <p className="mb-3.5 text-[13.5px] leading-[1.6] text-[#3A414D]">{idea.problem}</p>

              <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 rounded-[10px] bg-page p-3.5">
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('adminApprovals.stage')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{t(STAGE_KEYS[idea.stage])}</div>
                </div>
                <div>
                  <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                    {t('adminApprovals.fundingSought')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{idea.funding ?? '—'}</div>
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
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={actioningId === idea.id}
                  onClick={() => handleApprove(idea.id)}
                  className="rounded-lg bg-teal px-5 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-60"
                >
                  {t('adminApprovals.approveAndPublish')}
                </button>
                <button
                  type="button"
                  disabled={actioningId === idea.id}
                  onClick={() => handleReject(idea.id)}
                  className="rounded-lg border border-[#FCA5A5] bg-surface px-5 py-2.5 text-[13.5px] font-bold text-danger disabled:opacity-60"
                >
                  {t('adminApprovals.reject')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
