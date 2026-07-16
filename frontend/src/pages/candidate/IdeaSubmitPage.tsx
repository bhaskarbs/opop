import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ApiError } from '../../lib/apiClient'
import { ideasApi, type BackendIdeaStage, type IdeaRequestPayload } from '../../lib/ideasApi'
import { IDEA_CATEGORIES } from '../../mocks/ideas'
import { ideaRoutesFor } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'

const STAGES = ['Concept', 'Prototype', 'Live'] as const
type StageLabel = (typeof STAGES)[number]

const STAGE_TO_BACKEND: Record<StageLabel, BackendIdeaStage> = {
  Concept: 'CONCEPT',
  Prototype: 'PROTOTYPE',
  Live: 'LIVE',
}
const BACKEND_TO_STAGE: Record<BackendIdeaStage, StageLabel> = {
  CONCEPT: 'Concept',
  PROTOTYPE: 'Prototype',
  LIVE: 'Live',
}

const ideaSchema = z.object({
  title: z.string().min(2, 'Enter an idea title'),
  category: z.string().min(1, 'Choose a category'),
  stage: z.enum(STAGES),
  problem: z.string().min(10, 'Describe the problem this idea solves'),
  solution: z.string().min(10, 'Describe your idea or solution'),
  targetMarket: z.string().min(2, 'Describe your target market'),
  funding: z.string().optional(),
  equity: z.string().optional(),
  teamSize: z.string().optional(),
  timeline: z.string().optional(),
  videoLink: z.string().optional(),
  contactEmail: z.string().min(1, 'Enter a contact email').email('Enter a valid email'),
})

type IdeaFormValues = z.infer<typeof ideaSchema>

const EMPTY_VALUES: IdeaFormValues = {
  title: '',
  category: IDEA_CATEGORIES[0],
  stage: STAGES[0],
  problem: '',
  solution: '',
  targetMarket: '',
  funding: '',
  equity: '',
  teamSize: '',
  timeline: '',
  videoLink: '',
  contactEmail: '',
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseTeamSize(value: string | undefined): number | null {
  if (!value?.trim()) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function toIdeaRequest(values: IdeaFormValues): IdeaRequestPayload {
  return {
    title: values.title,
    category: values.category,
    stage: STAGE_TO_BACKEND[values.stage],
    problem: values.problem,
    solution: values.solution,
    targetMarket: values.targetMarket,
    funding: blankToNull(values.funding),
    equity: blankToNull(values.equity),
    teamSize: parseTeamSize(values.teamSize),
    timeline: blankToNull(values.timeline),
    videoLink: blankToNull(values.videoLink),
    contactEmail: values.contactEmail,
  }
}

export default function IdeaSubmitPage() {
  const { t } = useTranslation('ideas')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const { ideaId } = useParams()
  const role = useAuthStore((state) => state.user?.role)
  const routes = ideaRoutesFor(role === 'COMPANY' ? 'COMPANY' : 'CANDIDATE')
  const editing = !!ideaId

  const [formError, setFormError] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(editing)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!ideaId) return
    let cancelled = false
    ideasApi
      .get(ideaId)
      .then((detail) => {
        if (cancelled) return
        reset({
          title: detail.title,
          category: detail.category,
          stage: BACKEND_TO_STAGE[detail.stage],
          problem: detail.problem,
          solution: detail.solution,
          targetMarket: detail.targetMarket,
          funding: detail.funding ?? '',
          equity: detail.equity ?? '',
          teamSize: detail.teamSize != null ? String(detail.teamSize) : '',
          timeline: detail.timeline ?? '',
          videoLink: detail.videoLink ?? '',
          contactEmail: detail.contactEmail,
        })
      })
      .catch((error) => {
        if (cancelled) return
        setFormError(error instanceof ApiError ? error.message : t('submit.errorGeneric'))
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [ideaId, reset, t])

  function goToMyIdeas() {
    navigate(localize(routes.list))
  }

  async function onSubmit(values: IdeaFormValues) {
    setFormError(null)
    try {
      const payload = toIdeaRequest(values)
      if (editing && ideaId) {
        await ideasApi.update(ideaId, payload)
      } else {
        await ideasApi.create(payload)
      }
      goToMyIdeas()
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('submit.errorGeneric'))
    }
  }

  if (loadingExisting) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-8 pb-16 text-center text-sm text-slate">
        {t('submit.loadingExisting')}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[760px] px-6 py-8 pb-16">
      <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">
        {editing ? t('submit.titleEdit') : t('submit.titleNew')}
      </h1>
      <p className="mb-6 text-sm text-slate">{t('submit.subtitle')}</p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-[18px] rounded-2xl border border-border bg-surface p-7"
      >
        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
            {t('submit.fields.ideaTitle')}
          </label>
          <input
            placeholder={t('submit.fields.ideaTitlePlaceholder')}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
            {...register('title')}
          />
          {errors.title && <p className="mt-1 text-[12.5px] text-danger">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.category')}
            </label>
            <select
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-ink"
              {...register('category')}
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
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-ink"
              {...register('stage')}
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
            {...register('problem')}
          />
          {errors.problem && <p className="mt-1 text-[12.5px] text-danger">{errors.problem.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
            {t('submit.fields.solution')}
          </label>
          <textarea
            rows={4}
            placeholder={t('submit.fields.solutionPlaceholder')}
            className="w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-sm"
            {...register('solution')}
          />
          {errors.solution && <p className="mt-1 text-[12.5px] text-danger">{errors.solution.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
            {t('submit.fields.targetMarket')}
          </label>
          <input
            placeholder={t('submit.fields.targetMarketPlaceholder')}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
            {...register('targetMarket')}
          />
          {errors.targetMarket && (
            <p className="mt-1 text-[12.5px] text-danger">{errors.targetMarket.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.funding')}
            </label>
            <input
              placeholder={t('submit.fields.fundingPlaceholder')}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
              {...register('funding')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.equity')}
            </label>
            <input
              placeholder={t('submit.fields.equityPlaceholder')}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
              {...register('equity')}
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
              {...register('teamSize')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('submit.fields.timeline')}
            </label>
            <input
              placeholder={t('submit.fields.timelinePlaceholder')}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
              {...register('timeline')}
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
            {...register('videoLink')}
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
            {...register('contactEmail')}
          />
          {errors.contactEmail && (
            <p className="mt-1 text-[12.5px] text-danger">{errors.contactEmail.message}</p>
          )}
        </div>

        <div className="rounded-[10px] border border-[#FCE3B8] bg-[#FFF6E9] px-3.5 py-3 text-[12.5px] text-[#8A5A0F]">
          {t('submit.pendingNotice')}
        </div>

        {formError && <p className="text-right text-[13px] text-danger">{formError}</p>}

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
            disabled={isSubmitting}
            className="rounded-[9px] bg-primary px-[22px] py-2.5 text-[13.5px] font-bold text-white disabled:opacity-60"
          >
            {editing ? t('submit.saveChanges') : t('submit.submitForReview')}
          </button>
        </div>
      </form>
    </main>
  )
}
