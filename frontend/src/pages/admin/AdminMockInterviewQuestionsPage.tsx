import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/apiClient'
import {
  adminApi,
  type AdminMockInterviewQuestionSummary,
  type MockInterviewQuestionSource,
} from '../../lib/adminApi'
import {
  EXPERIENCE_LEVELS,
  experienceLevelFromBackend,
  experienceLevelToBackend,
} from '../../lib/jobEnums'
import type { BackendExperienceLevel } from '../../lib/jobsApi'

// Mirrors MockInterviewPage.tsx's CATEGORIES — candidate-facing question matching only works if
// admin-added/tagged questions use the exact same category strings candidates pick from, so keep
// this list in sync with that one (same duplication tradeoff as QUESTION_BANK there).
const CATEGORIES = [
  'Frontend Developer — behavioral',
  'Frontend Developer — technical',
  'General soft skills',
]

const SOURCE_LABEL_KEYS: Record<MockInterviewQuestionSource, string> = {
  AI: 'mockInterviewQuestions.sourceAi',
  ADMIN: 'mockInterviewQuestions.sourceAdmin',
}

export default function AdminMockInterviewQuestionsPage() {
  const { t } = useTranslation('admin')

  const [filterCategory, setFilterCategory] = useState('')
  const [filterSkill, setFilterSkill] = useState('')
  const [filterIndustry, setFilterIndustry] = useState('')
  const [filterExperienceLevel, setFilterExperienceLevel] = useState('')
  const [filterQuery, setFilterQuery] = useState('')

  const [questions, setQuestions] = useState<AdminMockInterviewQuestionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const [formText, setFormText] = useState('')
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]!)
  const [formSkills, setFormSkills] = useState<string[]>([])
  const [formNewSkill, setFormNewSkill] = useState('')
  const [formIndustry, setFormIndustry] = useState('')
  const [formExperienceLevel, setFormExperienceLevel] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setLoadError(null)
      adminApi
        .mockInterviewQuestions({
          category: filterCategory || undefined,
          skill: filterSkill.trim() || undefined,
          industry: filterIndustry.trim() || undefined,
          experienceLevel: (filterExperienceLevel || undefined) as
            BackendExperienceLevel | undefined,
          q: filterQuery.trim() || undefined,
        })
        .then((result) => {
          if (!cancelled) setQuestions(result)
        })
        .catch((caught) => {
          if (!cancelled) {
            setLoadError(
              caught instanceof ApiError ? caught.message : t('mockInterviewQuestions.loadError'),
            )
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
  }, [filterCategory, filterSkill, filterIndustry, filterExperienceLevel, filterQuery, t])

  function addFormSkill(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const trimmed = formNewSkill.trim()
    if (trimmed && !formSkills.includes(trimmed)) {
      setFormSkills((prev) => [...prev, trimmed])
    }
    setFormNewSkill('')
  }

  function removeFormSkill(skill: string) {
    setFormSkills((prev) => prev.filter((s) => s !== skill))
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!formText.trim()) return
    setFormError(null)
    setSubmitting(true)
    try {
      const created = await adminApi.createMockInterviewQuestion({
        text: formText.trim(),
        category: formCategory,
        skills: formSkills,
        industry: formIndustry.trim() || null,
        experienceLevel: (formExperienceLevel || null) as BackendExperienceLevel | null,
      })
      setQuestions((prev) => [created, ...prev])
      setFormText('')
      setFormSkills([])
      setFormNewSkill('')
      setFormIndustry('')
      setFormExperienceLevel('')
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.message : t('mockInterviewQuestions.saveError'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('mockInterviewQuestions.deleteConfirm'))) return
    setActioningId(id)
    try {
      await adminApi.deleteMockInterviewQuestion(id)
      setQuestions((prev) => prev.filter((question) => question.id !== id))
    } catch {
      // Best-effort — the question simply stays in the list if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  async function handleToggleImportant(question: AdminMockInterviewQuestionSummary) {
    setActioningId(question.id)
    try {
      const updated = question.important
        ? await adminApi.unhighlightMockInterviewQuestion(question.id)
        : await adminApi.highlightMockInterviewQuestion(question.id)
      setQuestions((prev) =>
        prev.map((existing) => (existing.id === question.id ? updated : existing)),
      )
    } catch {
      // Best-effort — the question keeps its current highlight state if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <div className="mb-5">
        <h1 className="mb-1 text-[22px] font-extrabold text-ink">
          {t('mockInterviewQuestions.title')}
        </h1>
        <p className="text-sm text-slate">{t('mockInterviewQuestions.subtitle')}</p>
      </div>

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-card border border-border bg-surface p-5"
      >
        <h2 className="mb-3 text-base font-bold text-ink">
          {t('mockInterviewQuestions.addTitle')}
        </h2>
        {formError && <p className="mb-3 text-[13px] font-semibold text-danger">{formError}</p>}
        <textarea
          value={formText}
          onChange={(event) => setFormText(event.target.value)}
          placeholder={t('mockInterviewQuestions.textPlaceholder')}
          rows={2}
          required
          className="mb-3 w-full rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none"
        />
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={formCategory}
            onChange={(event) => setFormCategory(event.target.value)}
            className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
          >
            {CATEGORIES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select
            value={formExperienceLevel}
            onChange={(event) => setFormExperienceLevel(event.target.value)}
            className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
          >
            <option value="">{t('mockInterviewQuestions.anyExperienceLevel')}</option>
            {EXPERIENCE_LEVELS.map((label) => (
              <option key={label} value={experienceLevelToBackend(label)}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={formIndustry}
            onChange={(event) => setFormIndustry(event.target.value)}
            placeholder={t('mockInterviewQuestions.industryPlaceholder')}
            className="rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog"
          />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {formSkills.map((skill) => (
            <span
              key={skill}
              className="flex items-center gap-1.5 rounded-full bg-neutral-tint px-3.5 py-1.5 text-sm font-semibold text-[#3A414D]"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeFormSkill(skill)}
                aria-label={t('mockInterviewQuestions.removeSkill', { skill })}
                className="cursor-pointer text-fog"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          value={formNewSkill}
          onChange={(event) => setFormNewSkill(event.target.value)}
          onKeyDown={addFormSkill}
          placeholder={t('mockInterviewQuestions.addSkillPlaceholder')}
          className="mb-3 w-full rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[9px] bg-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting
            ? t('mockInterviewQuestions.saving')
            : t('mockInterviewQuestions.addQuestion')}
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2.5 rounded-card border border-border bg-surface p-4">
        <select
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
          className="rounded-control border border-border bg-surface px-3 py-2 text-[13.5px] text-ink"
        >
          <option value="">{t('mockInterviewQuestions.allCategories')}</option>
          {CATEGORIES.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select
          value={filterExperienceLevel}
          onChange={(event) => setFilterExperienceLevel(event.target.value)}
          className="rounded-control border border-border bg-surface px-3 py-2 text-[13.5px] text-ink"
        >
          <option value="">{t('mockInterviewQuestions.anyExperienceLevel')}</option>
          {EXPERIENCE_LEVELS.map((label) => (
            <option key={label} value={experienceLevelToBackend(label)}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={filterSkill}
          onChange={(event) => setFilterSkill(event.target.value)}
          placeholder={t('mockInterviewQuestions.filterSkillPlaceholder')}
          className="min-w-[160px] flex-1 rounded-control border border-border px-3 py-2 text-[13.5px] text-ink placeholder:text-fog"
        />
        <input
          value={filterIndustry}
          onChange={(event) => setFilterIndustry(event.target.value)}
          placeholder={t('mockInterviewQuestions.filterIndustryPlaceholder')}
          className="min-w-[160px] flex-1 rounded-control border border-border px-3 py-2 text-[13.5px] text-ink placeholder:text-fog"
        />
        <input
          value={filterQuery}
          onChange={(event) => setFilterQuery(event.target.value)}
          placeholder={t('mockInterviewQuestions.searchPlaceholder')}
          className="min-w-[200px] flex-[2] rounded-control border border-border px-3 py-2 text-[13.5px] text-ink placeholder:text-fog"
        />
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('mockInterviewQuestions.loading')}
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('mockInterviewQuestions.none')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((question) => (
            <div
              key={question.id}
              className={`rounded-card border p-4 ${
                question.important ? 'border-amber bg-amber-tint/30' : 'border-border bg-surface'
              }`}
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-[14px] leading-normal font-semibold text-ink">
                  {question.text}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={actioningId === question.id}
                    onClick={() => handleToggleImportant(question)}
                    aria-pressed={question.important}
                    title={
                      question.important
                        ? t('mockInterviewQuestions.unhighlight')
                        : t('mockInterviewQuestions.highlight')
                    }
                    className={`rounded-md border px-2.5 py-1.5 text-[12px] font-bold disabled:opacity-50 ${
                      question.important
                        ? 'border-amber bg-amber text-white'
                        : 'border-border bg-surface text-ink'
                    }`}
                  >
                    ★
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === question.id}
                    onClick={() => handleDelete(question.id)}
                    className="rounded-md border border-[#FCA5A5] px-2.5 py-1.5 text-[12px] font-bold text-danger disabled:opacity-50"
                  >
                    {t('mockInterviewQuestions.delete')}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                <span className="rounded-full bg-teal-tint px-2.5 py-[3px] font-bold text-teal">
                  {question.category}
                </span>
                {question.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-neutral-tint px-2.5 py-[3px] font-semibold text-[#3A414D]"
                  >
                    {skill}
                  </span>
                ))}
                {question.industry && (
                  <span className="rounded-full bg-neutral-tint px-2.5 py-[3px] font-semibold text-[#3A414D]">
                    {question.industry}
                  </span>
                )}
                {question.experienceLevel && (
                  <span className="rounded-full bg-neutral-tint px-2.5 py-[3px] font-semibold text-[#3A414D]">
                    {experienceLevelFromBackend(question.experienceLevel)}
                  </span>
                )}
                <span className="rounded-full bg-primary-tint px-2.5 py-[3px] font-bold text-primary">
                  {t(SOURCE_LABEL_KEYS[question.source])}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
