import { useEffect, useState } from 'react'
import { ApiError } from '../../lib/apiClient'
import { adminApi, type AdminCompanyProfileSummary } from '../../lib/adminApi'

function formatSubmittedLabel(submittedAt: string): string {
  const days = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function AdminCompanyApprovalsPage() {
  const [companies, setCompanies] = useState<AdminCompanyProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi
      .pendingCompanies()
      .then((result) => {
        if (!cancelled) setCompanies(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof ApiError ? caught.message : 'Could not load pending companies.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">Company approvals</h1>
          <p className="text-sm text-slate">
            Verify company registrations before they can post jobs or partnerships.
          </p>
        </div>
        <div className="rounded-full bg-amber-tint px-3.5 py-1.5 text-[13.5px] font-bold text-amber">
          {companies.length} pending review
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          Loading pending companies…
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          No companies are waiting for review.
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {companies.map((company) => (
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
                      {company.industry} · {company.entityType} · Submitted{' '}
                      {formatSubmittedLabel(company.submittedAt)}
                    </div>
                  </div>
                </div>
                <span className="h-fit rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-amber">
                  Pending review
                </span>
              </div>

              <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 rounded-[10px] bg-page p-4">
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    CIN
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-ink">{company.cin}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    GSTIN
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-ink">
                    {company.gstin}
                  </div>
                </div>
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    PAN
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-ink">{company.pan}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    Authorized signatory
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{company.signatoryName}</div>
                </div>
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
                  Verify &amp; approve
                </button>
                <button
                  type="button"
                  disabled={actioningId === company.userId}
                  onClick={() => handleReject(company.userId)}
                  className="rounded-lg border border-[#FCA5A5] bg-surface px-5 py-2.5 text-[13.5px] font-bold text-danger disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
