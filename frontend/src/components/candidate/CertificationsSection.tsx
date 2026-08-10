import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal, Spinner } from '../../components/ui'
import { API_BASE_URL, ApiError } from '../../lib/apiClient'
import {
  candidateApi,
  type CandidateCertificationSummary,
  CERTIFICATION_LIMIT,
} from '../../lib/candidateApi'

export function CertificationsSection() {
  const { t } = useTranslation('candidate')

  const [certifications, setCertifications] = useState<CandidateCertificationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [certificationId, setCertificationId] = useState('')
  const [certificationUrl, setCertificationUrl] = useState('')
  const [logo, setLogo] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    candidateApi
      .listCertifications()
      .then((result) => {
        if (!cancelled) setCertifications(result)
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
    setName('')
    setCertificationId('')
    setCertificationUrl('')
    setLogo(null)
    setSaveError(null)
    setModalOpen(true)
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    setLogo(event.target.files?.[0] ?? null)
  }

  async function handleAdd() {
    setSaveError(null)
    setSaving(true)
    try {
      const created = await candidateApi.addCertification({
        name,
        certificationId,
        certificationUrl,
        logo,
      })
      setCertifications((previous) => [created, ...previous])
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
      await candidateApi.deleteCertification(id)
      setCertifications((previous) => previous.filter((certification) => certification.id !== id))
    } catch {
      // Best-effort — the row just stays put if the delete failed, and the button re-enables.
    } finally {
      setDeletingId(null)
    }
  }

  const atLimit = certifications.length >= CERTIFICATION_LIMIT

  if (loading) {
    return <Spinner className="h-4 w-4" />
  }

  return (
    <div>
      {loadError && <p className="mb-3 text-[13px] text-danger">{loadError}</p>}
      {certifications.length === 0 ? (
        <p className="mb-3.5 text-[13px] text-fog">{t('accomplishments.certifications.empty')}</p>
      ) : (
        <ul className="mb-3.5 flex flex-col gap-2.5">
          {certifications.map((certification) => (
            <li
              key={certification.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border p-3.5"
            >
              <div className="flex min-w-0 items-start gap-3">
                {certification.logoUrl && (
                  <img
                    src={`${API_BASE_URL}${certification.logoUrl}`}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  {certification.certificationUrl ? (
                    <a
                      href={certification.certificationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13.5px] font-bold text-primary"
                    >
                      {certification.name}
                    </a>
                  ) : (
                    <span className="text-[13.5px] font-bold text-ink">{certification.name}</span>
                  )}
                  {certification.certificationId && (
                    <p className="mt-0.5 text-[12.5px] text-slate">
                      {t('accomplishments.certifications.idPrefix', {
                        id: certification.certificationId,
                      })}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(certification.id)}
                disabled={deletingId === certification.id}
                aria-label={t('accomplishments.remove', { title: certification.name })}
                className="shrink-0 text-[12.5px] font-bold text-danger disabled:opacity-50"
              >
                {deletingId === certification.id ? <Spinner className="h-3.5 w-3.5" /> : '×'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="secondary" onClick={openModal} disabled={atLimit}>
        {t('accomplishments.certifications.add')}
      </Button>
      {atLimit && (
        <p className="mt-2 text-[12px] text-fog">
          {t('accomplishments.limitReached', { limit: CERTIFICATION_LIMIT })}
        </p>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        closeLabel={t('accomplishments.close')}
        title={t('accomplishments.certifications.add')}
      >
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col">
            <label htmlFor="certification-name" className="mb-1.5 text-[13px] font-bold text-ink">
              {t('accomplishments.certifications.nameField')}
            </label>
            <input
              id="certification-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="certification-id" className="mb-1.5 text-[13px] font-bold text-ink">
              {t('accomplishments.certifications.idField')}
            </label>
            <input
              id="certification-id"
              value={certificationId}
              onChange={(event) => setCertificationId(event.target.value)}
              className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="certification-url" className="mb-1.5 text-[13px] font-bold text-ink">
              {t('accomplishments.urlField')}
            </label>
            <input
              id="certification-url"
              type="url"
              value={certificationUrl}
              onChange={(event) => setCertificationUrl(event.target.value)}
              placeholder="https://"
              className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
          </div>
          <div className="flex flex-col">
            <span className="mb-1.5 text-[13px] font-bold text-ink">
              {t('accomplishments.certifications.logoField')}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-bold text-ink"
              >
                {t('accomplishments.certifications.chooseLogo')}
              </button>
              {logo && <span className="text-[12.5px] text-slate">{logo.name}</span>}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
          {saveError && <p className="text-[13px] text-danger">{saveError}</p>}
          <Button type="button" onClick={handleAdd} loading={saving} disabled={!name.trim()}>
            {t('accomplishments.save')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
