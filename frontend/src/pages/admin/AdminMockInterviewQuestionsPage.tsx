import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Spinner } from '../../components/ui'
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

const SOURCE_LABEL_KEYS: Record<MockInterviewQuestionSource, string> = {
  AI: 'mockInterviewQuestions.sourceAi',
  ADMIN: 'mockInterviewQuestions.sourceAdmin',
}

const PAGE_SIZE = 10

export default function AdminMockInterviewQuestionsPage() {
  const { t } = useTranslation('admin')

  // *Input tracks every keystroke (controlled input value); the submitted* counterparts only
  // update on Enter and are what actually drive the search request — typing alone doesn't
  // trigger it (same pattern as AdminCompanyApprovalsPage).
  const [skillInput, setSkillInput] = useState('')
  const [industryInput, setIndustryInput] = useState('')
  const [queryInput, setQueryInput] = useState('')
  const [submittedSkill, setSubmittedSkill] = useState('')
  const [submittedIndustry, setSubmittedIndustry] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [filterExperienceLevel, setFilterExperienceLevel] = useState('')

  const [questions, setQuestions] = useState<AdminMockInterviewQuestionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [formText, setFormText] = useState('')
  const [formSkills, setFormSkills] = useState<string[]>([])
  const [formNewSkill, setFormNewSkill] = useState('')
  const [formIndustry, setFormIndustry] = useState('')
  const [formExperienceLevel, setFormExperienceLevel] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    // submittedSkill/submittedIndustry/submittedQuery only change on Enter (see
    // handleFilterKeyDown), so this isn't debouncing keystrokes — the setTimeout wrapper just
    // keeps the setState calls out of the effect body proper, same as the other admin list
    // pages.
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setLoadError(null)
      setPage(1)
      adminApi
        .mockInterviewQuestions({
          skill: submittedSkill.trim() || undefined,
          industry: submittedIndustry.trim() || undefined,
          experienceLevel: (filterExperienceLevel || undefined) as
            BackendExperienceLevel | undefined,
          q: submittedQuery.trim() || undefined,
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
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [submittedSkill, submittedIndustry, filterExperienceLevel, submittedQuery, t])

  function handleFilterKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    setSubmittedSkill(skillInput)
    setSubmittedIndustry(industryInput)
    setSubmittedQuery(queryInput)
  }

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

  const pageCount = Math.max(1, Math.ceil(questions.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleQuestions = questions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          className="flex items-center gap-2 rounded-[9px] bg-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting && <Spinner className="h-4 w-4" />}
          {submitting
            ? t('mockInterviewQuestions.saving')
            : t('mockInterviewQuestions.addQuestion')}
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2.5 rounded-card border border-border bg-surface p-4">
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
          value={skillInput}
          onChange={(event) => setSkillInput(event.target.value)}
          onKeyDown={handleFilterKeyDown}
          placeholder={t('mockInterviewQuestions.filterSkillPlaceholder')}
          className="min-w-[160px] flex-1 rounded-control border border-border px-3 py-2 text-[13.5px] text-ink placeholder:text-fog"
        />
        <input
          value={industryInput}
          onChange={(event) => setIndustryInput(event.target.value)}
          onKeyDown={handleFilterKeyDown}
          placeholder={t('mockInterviewQuestions.filterIndustryPlaceholder')}
          className="min-w-[160px] flex-1 rounded-control border border-border px-3 py-2 text-[13.5px] text-ink placeholder:text-fog"
        />
        <input
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          onKeyDown={handleFilterKeyDown}
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
          {visibleQuestions.map((question) => (
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
                    className={`flex items-center justify-center rounded-md border px-2.5 py-1.5 text-[12px] font-bold disabled:opacity-50 ${
                      question.important
                        ? 'border-amber bg-amber text-white'
                        : 'border-border bg-surface text-ink'
                    }`}
                  >
                    {actioningId === question.id ? <Spinner className="h-3 w-3" /> : '★'}
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === question.id}
                    onClick={() => handleDelete(question.id)}
                    className="flex items-center gap-1.5 rounded-md border border-[#FCA5A5] px-2.5 py-1.5 text-[12px] font-bold text-danger disabled:opacity-50"
                  >
                    {actioningId === question.id && <Spinner className="h-3 w-3" />}
                    {t('mockInterviewQuestions.delete')}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
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
          {pageCount > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('mockInterviewQuestions.previousPage')}
              </button>
              <span className="text-[13px] text-slate">
                {t('mockInterviewQuestions.pageLabel', { page: currentPage, total: pageCount })}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                disabled={currentPage === pageCount}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('mockInterviewQuestions.nextPage')}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
