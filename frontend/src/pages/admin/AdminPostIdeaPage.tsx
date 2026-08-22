import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { LoadingState, Spinner } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { apiErrorMessage } from '../../lib/apiClient'
import { adminApi, type AdminUserSummary } from '../../lib/adminApi'
import { ideasApi, type BackendIdeaStage, type IdeaRequestPayload } from '../../lib/ideasApi'
import { IDEA_CATEGORIES } from '../../mocks/ideas'
import { ROUTES } from '../../routes/paths'

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

const postIdeaSchema = z.object({
  title: z.string().min(2, 'Enter an idea title'),
  category: z.string().min(1, 'Choose a category'),
  stage: z.enum(STAGES),
  problem: z.string().min(10, 'Describe the problem this idea solves'),
  solution: z.string().min(10, 'Describe the idea or solution'),
  targetMarket: z.string().min(2, 'Describe the target market'),
  funding: z.string().optional(),
  equity: z.string().optional(),
  teamSize: z.string().optional(),
  timeline: z.string().optional(),
  videoLink: z.string().optional(),
  contactEmail: z.string().min(1, 'Enter a contact email').email('Enter a valid email'),
})

type PostIdeaFormValues = z.infer<typeof postIdeaSchema>

const EMPTY_VALUES: PostIdeaFormValues = {
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

function toIdeaRequest(values: PostIdeaFormValues): IdeaRequestPayload {
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

export default function AdminPostIdeaPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const { ideaId } = useParams()
  const editing = !!ideaId

  const [formError, setFormError] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(editing)

  // Only meaningful when creating — adminUpdate never reassigns an idea's submitter (see
  // IdeaService#adminUpdate), so the edit form has no submitter picker at all.
  const [submitterQuery, setSubmitterQuery] = useState('')
  const [submitterResults, setSubmitterResults] = useState<AdminUserSummary[]>([])
  const [searchingSubmitters, setSearchingSubmitters] = useState(false)
  const [selectedSubmitter, setSelectedSubmitter] = useState<AdminUserSummary | null>(null)
  const [existingSubmitterName, setExistingSubmitterName] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PostIdeaFormValues>({
    resolver: zodResolver(postIdeaSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!ideaId) return
    let cancelled = false
    ideasApi
      .adminDetail(ideaId)
      .then((detail) => {
        if (cancelled) return
        setExistingSubmitterName(detail.submitterName)
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
        if (!cancelled) {
          setFormError(apiErrorMessage(error, t('ideas.postForm.errorGeneric')))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [ideaId, reset, t])

  useEffect(() => {
    if (editing) return
    const trimmed = submitterQuery.trim()
    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!trimmed) {
        setSubmitterResults([])
        return
      }
      setSearchingSubmitters(true)
      adminApi
        .users({ q: trimmed })
        .then((results) => {
          if (!cancelled) setSubmitterResults(results)
        })
        .catch(() => {
          if (!cancelled) setSubmitterResults([])
        })
        .finally(() => {
          if (!cancelled) setSearchingSubmitters(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [submitterQuery, editing])

  function goToAdminIdeas() {
    navigate(localize(ROUTES.adminIdeas))
  }

  async function onSubmit(values: PostIdeaFormValues) {
    setFormError(null)
    if (!editing && !selectedSubmitter) {
      setFormError(t('ideas.postForm.errorSubmitterRequired'))
      return
    }
    try {
      const payload = toIdeaRequest(values)
      if (editing && ideaId) {
        await ideasApi.adminUpdate(ideaId, payload)
      } else if (selectedSubmitter) {
        await ideasApi.adminCreate(selectedSubmitter.id, payload)
      }
      goToAdminIdeas()
    } catch (error) {
      setFormError(apiErrorMessage(error, t('ideas.postForm.errorGeneric')))
    }
  }

  if (loadingExisting) {
    return (
      <main className="mx-auto max-w-[840px] px-6 py-7 pb-16">
        <LoadingState message={t('ideas.postForm.loadingExisting')} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[840px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">
        {editing ? t('ideas.postForm.titleEdit') : t('ideas.postForm.title')}
      </h1>
      <p className="mb-6 text-sm text-slate">{t('ideas.postForm.subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">
            {t('ideas.postForm.submitter')}
          </h2>
          {editing ? (
            <p className="text-sm text-ink">{existingSubmitterName}</p>
          ) : selectedSubmitter ? (
            <div className="flex items-center justify-between rounded-control border border-border px-3.5 py-2.5">
              <div>
                <p className="text-sm font-bold text-ink">{selectedSubmitter.fullName}</p>
                <p className="text-[12.5px] text-slate">
                  {selectedSubmitter.email} · {selectedSubmitter.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmitter(null)}
                className="text-[12.5px] font-bold text-primary"
              >
                {t('ideas.postForm.changeSubmitter')}
              </button>
            </div>
          ) : (
            <div>
              <input
                value={submitterQuery}
                onChange={(event) => setSubmitterQuery(event.target.value)}
                placeholder={t('ideas.postForm.submitterSearchPlaceholder')}
                className="w-full rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none"
              />
              {searchingSubmitters && (
                <div className="mt-2 flex items-center gap-2 text-[12.5px] text-slate">
                  <Spinner className="h-3.5 w-3.5" />
                  {t('ideas.postForm.searchingSubmitters')}
                </div>
              )}
              {!searchingSubmitters && submitterResults.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {submitterResults.map((submitter) => (
                    <li key={submitter.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubmitter(submitter)
                          setSubmitterQuery('')
                          setSubmitterResults([])
                        }}
                        className="w-full rounded-control border border-border px-3.5 py-2.5 text-left hover:bg-neutral-tint"
                      >
                        <p className="text-sm font-bold text-ink">{submitter.fullName}</p>
                        <p className="text-[12.5px] text-slate">
                          {submitter.email} · {submitter.role}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[18px] rounded-card border border-border bg-surface p-8">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('ideas:submit.fields.ideaTitle')}
            </label>
            <input
              placeholder={t('ideas:submit.fields.ideaTitlePlaceholder')}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
              {...register('title')}
            />
            {errors.title && (
              <p className="mt-1 text-[12.5px] text-danger">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
                {t('ideas:submit.fields.category')}
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
                {t('ideas:submit.fields.stage')}
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
              {t('ideas:submit.fields.problem')}
            </label>
            <textarea
              rows={3}
              placeholder={t('ideas:submit.fields.problemPlaceholder')}
              className="w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-sm"
              {...register('problem')}
            />
            {errors.problem && (
              <p className="mt-1 text-[12.5px] text-danger">{errors.problem.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('ideas:submit.fields.solution')}
            </label>
            <textarea
              rows={4}
              placeholder={t('ideas:submit.fields.solutionPlaceholder')}
              className="w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-sm"
              {...register('solution')}
            />
            {errors.solution && (
              <p className="mt-1 text-[12.5px] text-danger">{errors.solution.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('ideas:submit.fields.targetMarket')}
            </label>
            <input
              placeholder={t('ideas:submit.fields.targetMarketPlaceholder')}
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
                {t('ideas:submit.fields.funding')}
              </label>
              <input
                placeholder={t('ideas:submit.fields.fundingPlaceholder')}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
                {...register('funding')}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
                {t('ideas:submit.fields.equity')}
              </label>
              <input
                placeholder={t('ideas:submit.fields.equityPlaceholder')}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
                {...register('equity')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
                {t('ideas:submit.fields.teamSize')}
              </label>
              <input
                type="number"
                placeholder={t('ideas:submit.fields.teamSizePlaceholder')}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
                {...register('teamSize')}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
                {t('ideas:submit.fields.timeline')}
              </label>
              <input
                placeholder={t('ideas:submit.fields.timelinePlaceholder')}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
                {...register('timeline')}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('ideas:submit.fields.videoLink')}
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
              {t('ideas:submit.fields.contactEmail')}
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

          {formError && <p className="text-right text-[13px] text-danger">{formError}</p>}

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={goToAdminIdeas}
              className="rounded-[9px] border border-border px-[22px] py-2.5 text-[13.5px] font-bold text-ink"
            >
              {t('ideas.postForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-[9px] bg-primary px-[22px] py-2.5 text-[13.5px] font-bold text-white disabled:opacity-60"
            >
              {isSubmitting && <Spinner className="h-4 w-4" />}
              {editing ? t('ideas.postForm.saveChanges') : t('ideas.postForm.postIdea')}
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
