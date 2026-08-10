import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import {
  candidateApi,
  type CandidateResearchPaperSummary,
  RESEARCH_PAPER_LIMIT,
} from '../../lib/candidateApi'

// Same shape as WorkSamplesSection (title/url/description), kept as its own component rather
// than a parameterized shared one — matches how the backend keeps candidate_work_samples and
// candidate_research_papers as separate tables instead of one type-discriminated table.
export function ResearchPapersSection() {
  const { t } = useTranslation('candidate')

  const [papers, setPapers] = useState<CandidateResearchPaperSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    candidateApi
      .listResearchPapers()
      .then((result) => {
        if (!cancelled) setPapers(result)
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : t('profile.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  function openModal() {
    setTitle('')
    setUrl('')
    setDescription('')
    setSaveError(null)
    setModalOpen(true)
  }

  async function handleAdd() {
    setSaveError(null)
    setSaving(true)
    try {
      const created = await candidateApi.addResearchPaper({ title, url, description })
      setPapers((previous) => [created, ...previous])
      setModalOpen(false)
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await candidateApi.deleteResearchPaper(id)
      setPapers((previous) => previous.filter((paper) => paper.id !== id))
    } catch {
      // Best-effort — the row just stays put if the delete failed, and the button re-enables.
    } finally {
      setDeletingId(null)
    }
  }

  const atLimit = papers.length >= RESEARCH_PAPER_LIMIT

  if (loading) {
    return <Spinner className="h-4 w-4" />
  }

  return (
    <div>
      {loadError && <p className="mb-3 text-[13px] text-danger">{loadError}</p>}
      {papers.length === 0 ? (
        <p className="mb-3.5 text-[13px] text-fog">{t('accomplishments.researchPapers.empty')}</p>
      ) : (
        <ul className="mb-3.5 flex flex-col gap-2.5">
          {papers.map((paper) => (
            <li
              key={paper.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border p-3.5"
            >
              <div className="min-w-0">
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13.5px] font-bold text-primary"
                >
                  {paper.title}
                </a>
                {paper.description && (
                  <p className="mt-0.5 text-[12.5px] text-slate">{paper.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(paper.id)}
                disabled={deletingId === paper.id}
                aria-label={t('accomplishments.remove', { title: paper.title })}
                className="shrink-0 text-[12.5px] font-bold text-danger disabled:opacity-50"
              >
                {deletingId === paper.id ? <Spinner className="h-3.5 w-3.5" /> : '×'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="secondary" onClick={openModal} disabled={atLimit}>
        {t('accomplishments.researchPapers.add')}
      </Button>
      {atLimit && (
        <p className="mt-2 text-[12px] text-fog">
          {t('accomplishments.limitReached', { limit: RESEARCH_PAPER_LIMIT })}
        </p>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        closeLabel={t('accomplishments.close')}
        title={t('accomplishments.researchPapers.add')}
      >
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col">
            <label htmlFor="research-paper-title" className="mb-1.5 text-[13px] font-bold text-ink">
              {t('accomplishments.researchPapers.titleField')}
            </label>
            <input
              id="research-paper-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="research-paper-url" className="mb-1.5 text-[13px] font-bold text-ink">
              {t('accomplishments.urlField')}
            </label>
            <input
              id="research-paper-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="research-paper-description"
              className="mb-1.5 text-[13px] font-bold text-ink"
            >
              {t('accomplishments.descriptionField')}
            </label>
            <textarea
              id="research-paper-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
          </div>
          {saveError && <p className="text-[13px] text-danger">{saveError}</p>}
          <Button
            type="button"
            onClick={handleAdd}
            loading={saving}
            disabled={!title.trim() || !url.trim()}
          >
            {t('accomplishments.save')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
