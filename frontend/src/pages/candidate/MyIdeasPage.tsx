import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { MY_IDEAS, type MyIdeaStatus } from '../../mocks/myIdeas'
import { ideaRoutesFor } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'

const STATUS_KEYS: Record<MyIdeaStatus, string> = {
  Approved: 'myIdeas.statuses.approved',
  'Pending review': 'myIdeas.statuses.pendingReview',
  Rejected: 'myIdeas.statuses.rejected',
}

const STATUS_BADGE_CLASSES: Record<MyIdeaStatus, string> = {
  Approved: 'bg-teal-tint text-teal',
  'Pending review': 'bg-amber-tint text-amber',
  Rejected: 'bg-danger/10 text-danger',
}

const ROLE_COLOR_CLASSES = {
  Investor: 'text-primary',
  Participant: 'text-teal',
}

/** Mounted under both /candidate/ideas and /company/ideas (companies can submit ideas too —
 * see IdeasBrowsePage's "Submit your idea" CTA) — it lives under pages/candidate/ only because
 * that's where it was first built; ideaRoutesFor() picks the right link targets for whichever
 * role is actually signed in. No backend for this feature yet — expand/delete are local
 * session state only, matching the mockup's own behavior (nothing here survives a reload). */
export default function MyIdeasPage() {
  const { t } = useTranslation('ideas')
  const localize = useLocalizedPath()
  const role = useAuthStore((state) => state.user?.role)
  const routes = ideaRoutesFor(role === 'COMPANY' ? 'COMPANY' : 'CANDIDATE')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const ideas = MY_IDEAS.filter((idea) => !deletedIds.has(idea.id))

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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

      <div className="flex flex-col gap-3.5">
        {ideas.map((idea) => {
          const expanded = expandedIds.has(idea.id)
          const investorCount = idea.applicants.filter((a) => a.role === 'Investor').length
          const participantCount = idea.applicants.filter((a) => a.role === 'Participant').length
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
                      stage: idea.stage,
                      date: idea.submitted,
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
                    onClick={() => setDeletedIds((prev) => new Set(prev).add(idea.id))}
                    className="rounded-[7px] border border-[#FCA5A5] bg-surface px-3.5 py-[7px] text-[12.5px] font-bold text-danger"
                  >
                    {t('myIdeas.delete')}
                  </button>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between">
                <div className="text-[13px] text-[#3A414D]">
                  {t('myIdeas.interestedCount', {
                    count: idea.applicants.length,
                    investors: investorCount,
                    participants: participantCount,
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => toggleExpand(idea.id)}
                  className="text-[13px] font-bold text-primary"
                >
                  {expanded ? t('myIdeas.hideApplicants') : t('myIdeas.viewApplicants')}
                </button>
              </div>

              {expanded && (
                <div className="mt-3.5 flex flex-col gap-2.5 border-t border-[#F0F1F3] pt-3.5">
                  {idea.applicants.map((applicant) => (
                    <div
                      key={`${applicant.name}-${applicant.date}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-page px-3.5 py-3"
                    >
                      <div>
                        <div className="text-[13.5px] font-bold text-ink">
                          {applicant.name}{' '}
                          <span className={`font-semibold ${ROLE_COLOR_CLASSES[applicant.role]}`}>
                            · {applicant.role}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-slate">{applicant.note}</div>
                        <div className="mt-0.5 text-[11.5px] text-fog">
                          {t('myIdeas.appliedMeta', { date: applicant.date })}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-[7px] border border-border bg-surface px-3 py-1.5 text-xs font-bold whitespace-nowrap text-ink"
                      >
                        {t('myIdeas.viewProfile')}
                      </button>
                    </div>
                  ))}
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
    </main>
  )
}
