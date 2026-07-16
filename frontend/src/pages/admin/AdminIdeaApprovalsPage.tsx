import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ADMIN_PENDING_IDEAS } from '../../mocks/adminIdeas'

type Decision = 'approved' | 'rejected'

/** No backend for this feature yet (see mocks/adminIdeas.ts) — approve/reject decisions are
 * local session state only, same treatment as AdminCompanyApprovalsPage/AdminJobApprovalsPage
 * before their real endpoints existed. */
export default function AdminIdeaApprovalsPage() {
  const { t } = useTranslation('ideas')
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})

  const ideas = ADMIN_PENDING_IDEAS.map((idea) => ({ ...idea, decision: decisions[idea.id] }))
  const pendingCount = ideas.filter((idea) => !idea.decision).length

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('adminApprovals.title')}</h1>
          <p className="text-sm text-slate">{t('adminApprovals.subtitle')}</p>
        </div>
        <div className="rounded-full bg-amber-tint px-3.5 py-1.5 text-[13.5px] font-bold text-amber">
          {t('adminApprovals.pendingCount', { count: pendingCount })}
        </div>
      </div>

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
                    submitter: idea.submitter,
                    type: t(`browse.submitterTypes.${idea.submitterType.toLowerCase()}`, {
                      ns: 'ideas',
                    }),
                    date: idea.submitted,
                  })}
                </div>
              </div>
              <span
                className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                  idea.decision === 'approved'
                    ? 'bg-teal-tint text-teal'
                    : idea.decision === 'rejected'
                      ? 'bg-danger/10 text-danger'
                      : 'bg-amber-tint text-amber'
                }`}
              >
                {idea.decision === 'approved'
                  ? t('myIdeas.statuses.approved')
                  : idea.decision === 'rejected'
                    ? t('myIdeas.statuses.rejected')
                    : t('myIdeas.statuses.pendingReview')}
              </span>
            </div>

            <p className="mb-3.5 text-[13.5px] leading-[1.6] text-[#3A414D]">{idea.problem}</p>

            <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 rounded-[10px] bg-page p-3.5">
              <div>
                <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                  {t('adminApprovals.stage')}
                </div>
                <div className="text-[13px] font-semibold text-ink">{idea.stage}</div>
              </div>
              <div>
                <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                  {t('adminApprovals.fundingSought')}
                </div>
                <div className="text-[13px] font-semibold text-ink">{idea.funding}</div>
              </div>
              <div>
                <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                  {t('adminApprovals.teamNeeded')}
                </div>
                <div className="text-[13px] font-semibold text-ink">{idea.team}</div>
              </div>
              <div>
                <div className="mb-[3px] text-[11px] tracking-[0.03em] text-fog uppercase">
                  {t('adminApprovals.timeline')}
                </div>
                <div className="text-[13px] font-semibold text-ink">{idea.timeline}</div>
              </div>
            </div>

            {!idea.decision && (
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setDecisions((prev) => ({ ...prev, [idea.id]: 'approved' }))}
                  className="rounded-lg bg-teal px-5 py-2.5 text-[13.5px] font-bold text-white"
                >
                  {t('adminApprovals.approveAndPublish')}
                </button>
                <button
                  type="button"
                  onClick={() => setDecisions((prev) => ({ ...prev, [idea.id]: 'rejected' }))}
                  className="rounded-lg border border-[#FCA5A5] bg-surface px-5 py-2.5 text-[13.5px] font-bold text-danger"
                >
                  {t('adminApprovals.reject')}
                </button>
              </div>
            )}
            {idea.decision === 'approved' && (
              <div className="text-[13px] font-semibold text-teal">
                {t('adminApprovals.publishedNotice')}
              </div>
            )}
            {idea.decision === 'rejected' && (
              <div className="text-[13px] font-semibold text-danger">
                {t('adminApprovals.rejectedNotice')}
              </div>
            )}
          </div>
        ))}
        {ideas.length === 0 && (
          <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
            {t('adminApprovals.noneWaiting')}
          </div>
        )}
      </div>
    </main>
  )
}
