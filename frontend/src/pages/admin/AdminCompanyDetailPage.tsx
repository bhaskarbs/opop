import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ApiError } from '../../lib/apiClient'
import { adminApi, type AdminCompanyProfileSummary } from '../../lib/adminApi'
import { ROUTES } from '../../routes/paths'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function statusBadgeClass(status: AdminCompanyProfileSummary['verificationStatus']): string {
  if (status === 'VERIFIED') return 'bg-teal-tint text-teal'
  if (status === 'REJECTED') return 'bg-danger/10 text-danger'
  return 'bg-amber-tint text-amber'
}

const STATUS_LABEL_KEYS: Record<AdminCompanyProfileSummary['verificationStatus'], string> = {
  VERIFIED: 'dashboard.companyStatus.verified',
  PENDING: 'dashboard.companyStatus.pendingReview',
  REJECTED: 'dashboard.companyStatus.rejected',
}

export default function AdminCompanyDetailPage() {
  const { t } = useTranslation('admin')
  const localize = useLocalizedPath()
  const { id } = useParams()

  const [company, setCompany] = useState<AdminCompanyProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null)
  const [certificateError, setCertificateError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    adminApi
      .getCompanyDetail(id)
      .then((result) => {
        if (!cancelled) setCompany(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : t('companyDetail.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, t])

  async function handleDownloadCertificate(certificateId: string, fileName: string) {
    if (!company) return
    setCertificateError(null)
    setDownloadingCertificateId(certificateId)
    try {
      const blob = await adminApi.downloadCompanyCertificate(company.userId, certificateId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
    } catch (caught) {
      setCertificateError(
        caught instanceof ApiError ? caught.message : t('companyApprovals.certificateError'),
      )
    } finally {
      setDownloadingCertificateId(null)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-7 pb-16 text-center text-sm text-slate">
        {t('companyDetail.loading')}
      </main>
    )
  }

  if (error || !company) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-7 pb-16 text-center text-sm text-danger">
        {error ?? t('companyDetail.loadError')}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[760px] px-6 py-7 pb-16">
      <Link
        to={`${localize(ROUTES.adminUsers)}?tab=companies`}
        className="mb-5 inline-block text-[13px] font-bold text-primary no-underline"
      >
        {t('companyDetail.backToUsers')}
      </Link>

      <div className="rounded-card border border-border bg-surface p-[22px]">
        <div className="mb-4 flex flex-wrap justify-between gap-4">
          <div className="flex gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary text-base font-bold text-white">
              {company.companyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-[15.5px] font-bold text-ink">{company.companyName}</div>
              <div className="mt-0.5 text-[13px] text-slate">
                {[company.industry, company.entityType].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <span
            className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusBadgeClass(company.verificationStatus)}`}
          >
            {t(STATUS_LABEL_KEYS[company.verificationStatus])}
          </span>
        </div>

        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 rounded-[10px] bg-page p-4">
          <div>
            <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('companyApprovals.fields.entityType')}
            </div>
            <div className="text-[13px] font-semibold text-ink">
              {company.entityType ?? t('candidateDetail.notProvided')}
            </div>
          </div>
          {company.aadhaarNumber ? (
            <div>
              <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                {t('companyApprovals.fields.aadhaarNumber')}
              </div>
              <div className="font-mono text-[13px] font-semibold text-ink">
                {company.aadhaarNumber}
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                  {t('companyApprovals.fields.cin')}
                </div>
                <div className="font-mono text-[13px] font-semibold text-ink">
                  {company.cin ?? t('candidateDetail.notProvided')}
                </div>
              </div>
              <div>
                <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                  {t('companyApprovals.fields.gstin')}
                </div>
                <div className="font-mono text-[13px] font-semibold text-ink">
                  {company.gstin ?? t('candidateDetail.notProvided')}
                </div>
              </div>
            </>
          )}
          <div>
            <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('companyApprovals.fields.pan')}
            </div>
            <div className="font-mono text-[13px] font-semibold text-ink">
              {company.pan ?? t('candidateDetail.notProvided')}
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('companyApprovals.fields.authorizedSignatory')}
            </div>
            <div className="text-[13px] font-semibold text-ink">
              {company.signatoryName ?? t('candidateDetail.notProvided')}
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('companyApprovals.fields.email')}
            </div>
            <div className="text-[13px] font-semibold text-ink">{company.email}</div>
          </div>
          <div>
            <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('companyApprovals.fields.contactNumber')}
            </div>
            <div className="text-[13px] font-semibold text-ink">
              {company.contactNumber ?? t('candidateDetail.notProvided')}
            </div>
          </div>
          <div className="col-span-full">
            <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('companyApprovals.fields.address')}
            </div>
            <div className="text-[13px] font-semibold text-ink">
              {company.address ?? t('candidateDetail.notProvided')}
            </div>
          </div>
        </div>

        {certificateError && <p className="mb-3 text-[13px] text-danger">{certificateError}</p>}

        <div>
          <div className="mb-1.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
            {t('companyApprovals.fields.documents')}
          </div>
          {company.certificates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {company.certificates.map((certificate) => (
                <button
                  key={certificate.id}
                  type="button"
                  onClick={() => handleDownloadCertificate(certificate.id, certificate.fileName)}
                  disabled={downloadingCertificateId === certificate.id}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                >
                  {downloadingCertificateId === certificate.id ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  )}
                  {downloadingCertificateId === certificate.id
                    ? t('companyApprovals.downloadingCertificate')
                    : `${certificate.fileName} (${formatFileSize(certificate.sizeBytes)})`}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-fog">{t('companyApprovals.noDocuments')}</p>
          )}
        </div>
      </div>
    </main>
  )
}
