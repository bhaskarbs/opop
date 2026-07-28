import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ApiError } from '../../lib/apiClient'
import { adminApi, type AdminCompanyProfileSummary } from '../../lib/adminApi'

function formatSubmittedLabel(t: TFunction<'admin'>, submittedAt: string): string {
  const days = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000)
  if (days <= 0) return t('companyApprovals.today')
  if (days === 1) return t('companyApprovals.oneDayAgo')
  return t('companyApprovals.daysAgo', { days })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function AdminCompanyApprovalsPage() {
  const { t } = useTranslation('admin')
  const [query, setQuery] = useState('')
  const [companies, setCompanies] = useState<AdminCompanyProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null)
  const [certificateError, setCertificateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
      adminApi
        .pendingCompanies(query.trim() || undefined)
        .then((result) => {
          if (!cancelled) setCompanies(result)
        })
        .catch((caught) => {
          if (!cancelled) {
            setError(caught instanceof ApiError ? caught.message : t('companyApprovals.loadError'))
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
  }, [query, t])

  async function handleVerify(userId: string) {
    setActioningId(userId)
    try {
      await adminApi.verifyCompany(userId)
      setCompanies((prev) => prev.filter((company) => company.userId !== userId))
    } catch {
      // Best-effort — the company simply stays in the pending list if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  async function handleReject(userId: string) {
    setActioningId(userId)
    try {
      await adminApi.rejectCompany(userId)
      setCompanies((prev) => prev.filter((company) => company.userId !== userId))
    } catch {
      // Best-effort — the company simply stays in the pending list if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  async function handleDownloadCertificate(
    userId: string,
    certificateId: string,
    fileName: string,
  ) {
    setCertificateError(null)
    setDownloadingCertificateId(certificateId)
    try {
      const blob = await adminApi.downloadCompanyCertificate(userId, certificateId)
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

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">
            {t('companyApprovals.title')}
          </h1>
          <p className="text-sm text-slate">{t('companyApprovals.subtitle')}</p>
        </div>
        <div className="rounded-full bg-amber-tint px-3.5 py-1.5 text-[13.5px] font-bold text-amber">
          {t('companyApprovals.pendingCount', { count: companies.length })}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5 rounded-card border border-border bg-surface p-4">
        <div className="flex min-w-[220px] flex-[2] items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="shrink-0 text-fog"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('companyApprovals.searchPlaceholder')}
            className="w-full text-[13.5px] text-ink outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}
      {certificateError && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {certificateError}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('companyApprovals.loading')}
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {query.trim() ? t('companyApprovals.noMatches') : t('companyApprovals.noneWaiting')}
        </div>
      ) : (
        (() => {
          const company = companies[0]
          return (
            <div
              key={company.userId}
              className="rounded-card border border-border bg-surface p-[22px]"
            >
              <div className="mb-4 flex flex-wrap justify-between gap-4">
                <div className="flex gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary text-base font-bold text-white">
                    {company.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[15.5px] font-bold text-ink">{company.companyName}</div>
                    <div className="mt-0.5 text-[13px] text-slate">
                      {t('companyApprovals.companyMeta', {
                        industry: company.industry,
                        entityType: company.entityType,
                        submitted: formatSubmittedLabel(t, company.submittedAt),
                      })}
                    </div>
                  </div>
                </div>
                <span className="h-fit rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-amber">
                  {t('dashboard.companyStatus.pendingReview')}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 rounded-[10px] bg-page p-4">
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    {t('companyApprovals.fields.entityType')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{company.entityType}</div>
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
                        {company.cin}
                      </div>
                    </div>
                    <div>
                      <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                        {t('companyApprovals.fields.gstin')}
                      </div>
                      <div className="font-mono text-[13px] font-semibold text-ink">
                        {company.gstin}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    {t('companyApprovals.fields.pan')}
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-ink">{company.pan}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    {t('companyApprovals.fields.authorizedSignatory')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{company.signatoryName}</div>
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
                  <div className="text-[13px] font-semibold text-ink">{company.contactNumber}</div>
                </div>
                <div className="col-span-full">
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    {t('companyApprovals.fields.address')}
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{company.address}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-1.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                  {t('companyApprovals.fields.documents')}
                </div>
                {company.certificates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {company.certificates.map((certificate) => (
                      <button
                        key={certificate.id}
                        type="button"
                        onClick={() =>
                          handleDownloadCertificate(
                            company.userId,
                            certificate.id,
                            certificate.fileName,
                          )
                        }
                        disabled={downloadingCertificateId === certificate.id}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                      >
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

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={actioningId === company.userId}
                  onClick={() => handleVerify(company.userId)}
                  className="flex items-center gap-1.5 rounded-lg bg-teal px-5 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-60"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {t('companyApprovals.verifyAndApprove')}
                </button>
                <button
                  type="button"
                  disabled={actioningId === company.userId}
                  onClick={() => handleReject(company.userId)}
                  className="rounded-lg border border-[#FCA5A5] bg-surface px-5 py-2.5 text-[13.5px] font-bold text-danger disabled:opacity-60"
                >
                  {t('jobApprovals.reject')}
                </button>
              </div>
            </div>
          )
        })()
      )}
    </main>
  )
}
