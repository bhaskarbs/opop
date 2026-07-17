import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ApiError } from '../../lib/apiClient'
import {
  ideasApi,
  type BackendIdeaInterestRole,
  type BackendIdeaStage,
  type BackendIdeaStatus,
  type IdeaInterestSummary,
  type IdeaSummary,
} from '../../lib/ideasApi'
import { ideaRoutesFor } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'

const STAGE_KEYS: Record<BackendIdeaStage, string> = {
  CONCEPT: 'browse.stages.concept',
  PROTOTYPE: 'browse.stages.prototype',
  LIVE: 'browse.stages.live',
}

const STATUS_KEYS: Record<BackendIdeaStatus, string> = {
  APPROVED: 'myIdeas.statuses.approved',
  PENDING: 'myIdeas.statuses.pendingReview',
  REJECTED: 'myIdeas.statuses.rejected',
}

const STATUS_BADGE_CLASSES: Record<BackendIdeaStatus, string> = {
  APPROVED: 'bg-teal-tint text-teal',
  PENDING: 'bg-amber-tint text-amber',
  REJECTED: 'bg-danger/10 text-danger',
}

const INTEREST_ROLE_KEYS: Record<BackendIdeaInterestRole, string> = {
  INVESTOR: 'detail.modal.investor',
  PARTICIPANT: 'detail.modal.participant',
}

const INTEREST_ROLE_CLASSES: Record<BackendIdeaInterestRole, string> = {
  INVESTOR: 'text-primary',
  PARTICIPANT: 'text-teal',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Mounted under both /candidate/ideas and /company/ideas (companies can submit ideas too —
 * see IdeasBrowsePage's "Submit your idea" CTA) — it lives under pages/candidate/ only because
 * that's where it was first built; ideaRoutesFor() picks the right link targets for whichever
 * role is actually signed in. */
export default function MyIdeasPage() {
  const { t } = useTranslation('ideas')
  const localize = useLocalizedPath()
  const role = useAuthStore((state) => state.user?.role)
  const routes = ideaRoutesFor(role === 'COMPANY' ? 'COMPANY' : 'CANDIDATE')

  const [ideas, setIdeas] = useState<IdeaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [interests, setInterests] = useState<Record<string, IdeaInterestSummary[]>>({})
  const [interestsLoading, setInterestsLoading] = useState(false)
  const [interestsError, setInterestsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ideasApi
      .mine()
      .then((result) => {
        if (!cancelled) setIdeas(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : t('myIdeas.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  async function handleDelete(ideaId: string) {
    if (!window.confirm(t('myIdeas.deleteConfirm'))) return
    setDeletingId(ideaId)
    try {
      await ideasApi.remove(ideaId)
      setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('myIdeas.loadError'))
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleApplicants(ideaId: string) {
    if (expandedId === ideaId) {
      setExpandedId(null)
      return
    }
    setExpandedId(ideaId)
    if (interests[ideaId]) return
    setInterestsError(null)
    setInterestsLoading(true)
    try {
      const result = await ideasApi.interests(ideaId)
      setInterests((prev) => ({ ...prev, [ideaId]: result }))
    } catch (caught) {
      setInterestsError(caught instanceof ApiError ? caught.message : t('myIdeas.applicantsError'))
    } finally {
      setInterestsLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16">
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('myIdeas.title')}</h1>
          <p className="text-sm text-slate">{t('myIdeas.subtitle')}</p>
        </div>
        <Link
          to={localize(routes.submit)}
          className="rounded-[9px] bg-primary px-5 py-2.5 text-[13.5px] font-bold text-white no-underline"
        >
          {t('myIdeas.submitNew')}
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('myIdeas.loading')}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {ideas.map((idea) => {
            const expanded = expandedId === idea.id
            const applicants = interests[idea.id]
            return (
              <div
                key={idea.id}
                className="rounded-card border border-border bg-surface px-[22px] py-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <h3 className="text-[15.5px] font-bold text-ink">{idea.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${STATUS_BADGE_CLASSES[idea.status]}`}
                      >
                        {t(STATUS_KEYS[idea.status])}
                      </span>
                    </div>
                    <div className="text-[13px] text-slate">
                      {t('myIdeas.submittedMeta', {
                        category: idea.category,
                        stage: t(STAGE_KEYS[idea.stage]),
                        date: formatDate(idea.createdAt),
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      to={localize(routes.edit(idea.id))}
                      className="rounded-[7px] border border-border px-3.5 py-[7px] text-[12.5px] font-bold text-ink no-underline"
                    >
                      {t('myIdeas.edit')}
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === idea.id}
                      onClick={() => handleDelete(idea.id)}
                      className="rounded-[7px] border border-[#FCA5A5] bg-surface px-3.5 py-[7px] text-[12.5px] font-bold text-danger disabled:opacity-60"
                    >
                      {t('myIdeas.delete')}
                    </button>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between">
                  <div className="text-[13px] text-[#3A414D]">
                    {t('myIdeas.interestedCount', { count: idea.interestedCount })}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleApplicants(idea.id)}
                    className="text-[13px] font-bold text-primary"
                  >
                    {expanded ? t('myIdeas.hideApplicants') : t('myIdeas.viewApplicants')}
                  </button>
                </div>

                {expanded && (
                  <div className="mt-3.5 flex flex-col gap-2.5 border-t border-[#F0F1F3] pt-3.5">
                    {interestsLoading && !applicants ? (
                      <div className="py-2 text-center text-[13px] text-slate">
                        {t('myIdeas.applicantsLoading')}
                      </div>
                    ) : interestsError && !applicants ? (
                      <div className="py-2 text-center text-[13px] text-danger">
                        {interestsError}
                      </div>
                    ) : applicants && applicants.length === 0 ? (
                      <div className="py-2 text-center text-[13px] text-slate">
                        {t('myIdeas.noApplicants')}
                      </div>
                    ) : (
                      applicants?.map((applicant) => (
                        <div
                          key={applicant.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-page px-3.5 py-3"
                        >
                          <div>
                            <div className="text-[13.5px] font-bold text-ink">
                              {applicant.interestedUserName}{' '}
                              <span
                                className={`font-semibold ${INTEREST_ROLE_CLASSES[applicant.role]}`}
                              >
                                · {t(INTEREST_ROLE_KEYS[applicant.role])}
                              </span>
                            </div>
                            {applicant.ticketSize && (
                              <div className="mt-0.5 text-[12.5px] text-slate">
                                {t('myIdeas.ticketSizeLabel', { amount: applicant.ticketSize })}
                              </div>
                            )}
                            {applicant.message && (
                              <div className="mt-0.5 text-[12.5px] text-slate">
                                {applicant.message}
                              </div>
                            )}
                            <div className="mt-0.5 text-[11.5px] text-fog">
                              {t('myIdeas.appliedMeta', { date: formatDate(applicant.createdAt) })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {ideas.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
              {t('myIdeas.empty')}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
