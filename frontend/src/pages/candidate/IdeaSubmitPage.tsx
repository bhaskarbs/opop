import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { IDEA_CATEGORIES } from '../../mocks/ideas'
import { MY_IDEAS } from '../../mocks/myIdeas'
import { ideaRoutesFor } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'

const STAGES = ['Concept', 'Prototype', 'Live'] as const

/** Mounted under both /candidate/ideas/submit and /company/ideas/submit (companies can submit
 * ideas too — see IdeasBrowsePage's "Submit your idea" CTA); it lives under pages/candidate/
 * only because that's where it was first built. No backend for this feature yet (see
 * mocks/myIdeas.ts) — submitting doesn't persist anything beyond this session, matching the
 * source mockup's own behavior (its "Submit for review" button was just a link back to My
 * Ideas, with no real data binding either). */
export default function IdeaSubmitPage() {
  const { t } = useTranslation('ideas')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const { ideaId } = useParams()
  const role = useAuthStore((state) => state.user?.role)
  const routes = ideaRoutesFor(role === 'COMPANY' ? 'COMPANY' : 'CANDIDATE')
  const existing = ideaId ? MY_IDEAS.find((idea) => idea.id === ideaId) : undefined
  const editing = !!existing

  const [title, setTitle] = useState(existing?.title ?? '')
  const [category, setCategory] = useState(existing?.category ?? IDEA_CATEGORIES[0])
  const [stage, setStage] = useState<(typeof STAGES)[number]>(existing?.stage ?? STAGES[0])

  function goToMyIdeas() {
    navigate(localize(routes.list))
  }

  return (
    <main className="mx-auto max-w-[760px] px-6 py-8 pb-16">
      <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">
        {editing ? t('submit.titleEdit') : t('submit.titleNew')}
      </h1>
      <p className="mb-6 text-sm text-slate">{t('submit.subtitle')}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          goToMyIdeas()
        }}
        className="flex flex-col gap-[18px] rounded-2xl border border-border bg-surface p-7"
      >
        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
            {t('submit.fields.ideaTitle')}
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('submit.fields.ideaTitlePlaceholder')}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.category')}
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-ink"
            >
              {IDEA_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.stage')}
            </label>
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value as (typeof STAGES)[number])}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-ink"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
            {t('submit.fields.problem')}
          </label>
          <textarea
            rows={3}
            placeholder={t('submit.fields.problemPlaceholder')}
            className="w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
            {t('submit.fields.solution')}
          </label>
          <textarea
            rows={4}
            placeholder={t('submit.fields.solutionPlaceholder')}
            className="w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
            {t('submit.fields.targetMarket')}
          </label>
          <input
            placeholder={t('submit.fields.targetMarketPlaceholder')}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.funding')}
            </label>
            <input
              placeholder={t('submit.fields.fundingPlaceholder')}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.equity')}
            </label>
            <input
              placeholder={t('submit.fields.equityPlaceholder')}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.teamSize')}
            </label>
            <input
              type="number"
              placeholder={t('submit.fields.teamSizePlaceholder')}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.timeline')}
            </label>
            <input
              placeholder={t('submit.fields.timelinePlaceholder')}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
            {t('submit.fields.videoLink')}
          </label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
            {t('submit.fields.contactEmail')}
          </label>
          <input
            type="email"
            placeholder="you@email.com"
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="rounded-[10px] border border-[#FCE3B8] bg-[#FFF6E9] px-3.5 py-3 text-[12.5px] text-[#8A5A0F]">
          {t('submit.pendingNotice')}
        </div>

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={goToMyIdeas}
            className="rounded-[9px] border border-border px-[22px] py-2.5 text-[13.5px] font-bold text-ink"
          >
            {t('submit.cancel')}
          </button>
          <button
            type="submit"
            className="rounded-[9px] bg-primary px-[22px] py-2.5 text-[13.5px] font-bold text-white"
          >
            {editing ? t('submit.saveChanges') : t('submit.submitForReview')}
          </button>
        </div>
      </form>
    </main>
  )
}
