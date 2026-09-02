import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input, LoadingState, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { adminApi, type CareerGuideStepSummary } from '../../lib/adminApi'

export default function AdminCareerGuideStepsPage() {
  const { t } = useTranslation('admin')

  const [steps, setSteps] = useState<CareerGuideStepSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const [formDescription, setFormDescription] = useState('')
  const [formVideoUrl, setFormVideoUrl] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Non-null while editing an existing step — the same form doubles as the edit form, switched
  // into edit mode by handleEdit populating it from that step's current values (same pattern as
  // AdminMockInterviewQuestionsPage).
  const [editingId, setEditingId] = useState<string | null>(null)

  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testSuccessEmail, setTestSuccessEmail] = useState<string | null>(null)

  const loadSteps = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    adminApi
      .careerGuideSteps()
      .then(setSteps)
      .catch((caught) => {
        setLoadError(caught instanceof ApiError ? caught.message : t('careerGuideSteps.loadError'))
      })
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    // setTimeout wrapper keeps the setState calls out of the effect body proper (same pattern as
    // AdminMockInterviewQuestionsPage) — calling loadSteps synchronously here would trigger
    // react-hooks/set-state-in-effect.
    const timeoutId = setTimeout(loadSteps, 0)
    return () => clearTimeout(timeoutId)
  }, [loadSteps])

  function resetForm() {
    setFormDescription('')
    setFormVideoUrl('')
    setEditingId(null)
    setFormError(null)
  }

  function handleEdit(step: CareerGuideStepSummary) {
    setFormDescription(step.description)
    setFormVideoUrl(step.videoUrl)
    setFormError(null)
    setEditingId(step.id)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!formDescription.trim() || !formVideoUrl.trim()) return
    setFormError(null)
    setSubmitting(true)
    try {
      const payload = { description: formDescription.trim(), videoUrl: formVideoUrl.trim() }
      if (editingId) {
        const updated = await adminApi.updateCareerGuideStep(editingId, payload)
        setSteps((prev) => prev.map((existing) => (existing.id === editingId ? updated : existing)))
      } else {
        const created = await adminApi.createCareerGuideStep(payload)
        setSteps((prev) => [...prev, created])
      }
      resetForm()
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : t('careerGuideSteps.saveError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('careerGuideSteps.deleteConfirm'))) return
    setActioningId(id)
    try {
      await adminApi.deleteCareerGuideStep(id)
      loadSteps()
      if (editingId === id) resetForm()
    } catch {
      // Best-effort — the step simply stays in the list if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  // Swaps this step's position with its neighbor and sends the whole resulting order to the
  // reorder endpoint, which is the only way step_order changes server-side — there's no
  // single-step "move" endpoint (see AdminCareerGuideStepService#reorder).
  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= steps.length) return
    const reordered = [...steps]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    setActioningId(moved.id)
    try {
      const updated = await adminApi.reorderCareerGuideSteps(reordered.map((step) => step.id))
      setSteps(updated)
    } catch {
      // Best-effort — the list simply keeps its current order if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  async function handleSendTest(event: FormEvent) {
    event.preventDefault()
    if (!testEmail.trim()) return
    setTestError(null)
    setTestSuccessEmail(null)
    setSendingTest(true)
    try {
      await adminApi.sendCareerGuideTestEmail(testEmail.trim())
      setTestSuccessEmail(testEmail.trim())
    } catch (caught) {
      setTestError(
        caught instanceof ApiError ? caught.message : t('careerGuideSteps.sendTest.error'),
      )
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-7 pb-16">
      <div className="mb-5">
        <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('careerGuideSteps.title')}</h1>
        <p className="text-sm text-slate">{t('careerGuideSteps.subtitle')}</p>
      </div>

      <Card className="mb-6 p-[22px]">
        <h2 className="mb-3 text-base font-bold text-ink">
          {t('careerGuideSteps.sendTest.heading')}
        </h2>
        <form onSubmit={handleSendTest} className="flex flex-wrap items-start gap-2.5">
          <Input
            type="email"
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            placeholder={t('careerGuideSteps.sendTest.emailPlaceholder')}
            required
            className="min-w-[220px] flex-1"
          />
          <Button type="submit" loading={sendingTest} disabled={steps.length === 0}>
            {t('careerGuideSteps.sendTest.send')}
          </Button>
        </form>
        {testError && <p className="mt-2 text-[13px] text-danger">{testError}</p>}
        {testSuccessEmail && (
          <p className="mt-2 text-[13px] text-teal">
            {t('careerGuideSteps.sendTest.success', { email: testSuccessEmail })}
          </p>
        )}
        {steps.length === 0 && !loading && (
          <p className="mt-2 text-[12.5px] text-fog">{t('careerGuideSteps.sendTest.needsSteps')}</p>
        )}
      </Card>

      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-card border border-border bg-surface p-5"
      >
        <h2 className="mb-3 text-base font-bold text-ink">
          {editingId ? t('careerGuideSteps.form.editTitle') : t('careerGuideSteps.form.addTitle')}
        </h2>
        {formError && <p className="mb-3 text-[13px] font-semibold text-danger">{formError}</p>}
        <div className="mb-3 flex flex-col">
          <label htmlFor="step-description" className="mb-1.5 text-[13px] font-bold text-ink">
            {t('careerGuideSteps.form.descriptionField')}
          </label>
          <textarea
            id="step-description"
            value={formDescription}
            onChange={(event) => setFormDescription(event.target.value)}
            placeholder={t('careerGuideSteps.form.descriptionPlaceholder')}
            rows={2}
            required
            className="rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none"
          />
        </div>
        <div className="mb-4 flex flex-col">
          <label htmlFor="step-video-url" className="mb-1.5 text-[13px] font-bold text-ink">
            {t('careerGuideSteps.form.videoUrlField')}
          </label>
          <Input
            id="step-video-url"
            type="url"
            value={formVideoUrl}
            onChange={(event) => setFormVideoUrl(event.target.value)}
            placeholder={t('careerGuideSteps.form.videoUrlPlaceholder')}
            required
          />
        </div>
        <div className="flex items-center gap-2.5">
          <Button type="submit" loading={submitting}>
            {editingId ? t('careerGuideSteps.form.saveChanges') : t('careerGuideSteps.form.add')}
          </Button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="rounded-[9px] border border-border px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-60"
            >
              {t('careerGuideSteps.form.cancelEdit')}
            </button>
          )}
        </div>
      </form>

      {loadError && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10">
          <LoadingState message={t('careerGuideSteps.loading')} />
        </div>
      ) : steps.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('careerGuideSteps.none')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <div key={step.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="mb-1.5 inline-block rounded-full bg-ink px-2.5 py-[3px] text-[12px] font-bold text-white">
                    {t('careerGuideSteps.stepLabel', { number: step.stepOrder })}
                  </span>
                  <p className="text-[14px] leading-normal text-ink">{step.description}</p>
                  <a
                    href={step.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-[12.5px] text-primary"
                  >
                    {step.videoUrl}
                  </a>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={actioningId === step.id || index === 0}
                    onClick={() => handleMove(index, -1)}
                    title={t('careerGuideSteps.moveUp')}
                    className="flex items-center justify-center rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] font-bold text-ink disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === step.id || index === steps.length - 1}
                    onClick={() => handleMove(index, 1)}
                    title={t('careerGuideSteps.moveDown')}
                    className="flex items-center justify-center rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] font-bold text-ink disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === step.id}
                    onClick={() => handleEdit(step)}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-bold text-ink disabled:opacity-50"
                  >
                    {t('careerGuideSteps.edit')}
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === step.id}
                    onClick={() => handleDelete(step.id)}
                    className="flex items-center gap-1.5 rounded-md border border-[#FCA5A5] px-2.5 py-1.5 text-[12px] font-bold text-danger disabled:opacity-50"
                  >
                    {actioningId === step.id && <Spinner className="h-3 w-3" />}
                    {t('careerGuideSteps.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
