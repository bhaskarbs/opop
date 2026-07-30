import { useEffect, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/apiClient'
import {
  adminApi,
  type AdminBillingStats,
  type AdminCandidateSubscriptionSummary,
  type AdminCompanySubscriptionSummary,
  type AdminInvoiceSummary,
} from '../../lib/adminApi'

type SubTab = 'candidates' | 'companies' | 'candidateInvoices' | 'companyInvoices'

const PAGE_SIZE = 10

const PLAN_BADGE_CLASSES: Record<string, string> = {
  Free: 'bg-neutral-tint text-slate',
  Plus: 'bg-primary-tint text-primary',
  Pro: 'bg-[#FFF6E9] text-[#8A5A0F]',
  Growth: 'bg-primary-tint text-primary',
  Enterprise: 'bg-[#FFF6E9] text-[#8A5A0F]',
}

const PLAN_LABELS: Record<AdminCandidateSubscriptionSummary['plan'], string> = {
  FREE: 'Free',
  PLUS: 'Plus',
  PRO: 'Pro',
}

const COMPANY_PLAN_LABELS: Record<AdminCompanySubscriptionSummary['plan'], string> = {
  FREE: 'Free',
  GROWTH: 'Growth',
  ENTERPRISE: 'Enterprise',
}

const INVOICE_STATUS_CLASSES: Record<AdminInvoiceSummary['status'], string> = {
  PAID: 'bg-teal-tint text-teal',
  FAILED: 'bg-danger/10 text-danger',
  PENDING: 'bg-amber-tint text-amber',
}

const INVOICE_STATUS_LABEL_KEYS: Record<AdminInvoiceSummary['status'], string> = {
  PAID: 'billing.statusPaid',
  FAILED: 'billing.statusFailed',
  PENDING: 'billing.statusPending',
}

function formatValidUntil(locale: string, validUntil: string | null): string | null {
  if (!validUntil) return null
  return new Date(validUntil).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function InvoiceRow({
  invoice,
  locale,
  t,
}: {
  invoice: AdminInvoiceSummary
  locale: string
  t: (key: string) => string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-[18px] py-3.5">
      <div className="text-[13.5px] font-semibold text-ink">
        {invoice.name ?? t('billing.unknownUser')}
      </div>
      <div className="text-[13px] text-fog">{invoice.plan}</div>
      <div className="text-[13px] text-fog">{formatValidUntil(locale, invoice.createdAt)}</div>
      <div className="text-[13.5px] font-bold text-ink">
        ₹{invoice.amountRupees.toLocaleString()}
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${INVOICE_STATUS_CLASSES[invoice.status]}`}
      >
        {t(INVOICE_STATUS_LABEL_KEYS[invoice.status])}
      </span>
    </div>
  )
}

export default function AdminBillingPage() {
  const { t, i18n } = useTranslation('admin')
  const [tab, setTab] = useState<SubTab>('candidates')
  const [page, setPage] = useState(1)
  // queryInput tracks every keystroke (controlled input value); submittedQuery only updates on
  // Enter and is what actually filters the list — typing alone doesn't trigger it (same
  // pattern as AdminCompanyApprovalsPage).
  const [queryInput, setQueryInput] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const [stats, setStats] = useState<AdminBillingStats | null>(null)

  const [candidates, setCandidates] = useState<AdminCandidateSubscriptionSummary[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)
  const [candidatesError, setCandidatesError] = useState<string | null>(null)
  const [actioningCandidateId, setActioningCandidateId] = useState<string | null>(null)

  const [companies, setCompanies] = useState<AdminCompanySubscriptionSummary[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [companiesError, setCompaniesError] = useState<string | null>(null)
  const [actioningCompanyId, setActioningCompanyId] = useState<string | null>(null)

  const [invoices, setInvoices] = useState<AdminInvoiceSummary[] | null>(null)

  useEffect(() => {
    adminApi
      .billingStats()
      .then(setStats)
      .catch(() => {
        // Best-effort — the stat cards just stay blank if this fails.
      })
  }, [])

  useEffect(() => {
    adminApi
      .invoiceHistory()
      .then(setInvoices)
      .catch(() => {
        // Best-effort — the list just stays blank if this fails.
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    adminApi
      .candidateSubscriptions()
      .then((result) => {
        if (!cancelled) setCandidates(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setCandidatesError(
            caught instanceof ApiError ? caught.message : t('billing.candidatePlans.loadError'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCandidatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    let cancelled = false
    adminApi
      .companySubscriptions()
      .then((result) => {
        if (!cancelled) setCompanies(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setCompaniesError(
            caught instanceof ApiError ? caught.message : t('billing.companyPlans.loadError'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCompaniesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  function switchTab(next: SubTab) {
    setTab(next)
    setPage(1)
    setQueryInput('')
    setSubmittedQuery('')
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    setSubmittedQuery(queryInput)
    setPage(1)
  }

  async function handleSetCandidatePlan(candidateId: string, plan: 'FREE' | 'PLUS') {
    if (plan === 'FREE' && !window.confirm(t('billing.candidatePlans.confirmDowngrade'))) return
    setActioningCandidateId(candidateId)
    try {
      const updated = await adminApi.setCandidatePlan(candidateId, plan)
      setCandidates((prev) =>
        prev.map((existing) => (existing.candidateId === candidateId ? updated : existing)),
      )
    } catch {
      // Best-effort — the row simply keeps its current plan if the call fails.
    } finally {
      setActioningCandidateId(null)
    }
  }

  async function handleSetCompanyPlan(companyId: string, plan: 'FREE' | 'GROWTH') {
    if (plan === 'FREE' && !window.confirm(t('billing.companyPlans.confirmDowngrade'))) return
    setActioningCompanyId(companyId)
    try {
      const updated = await adminApi.setCompanyPlan(companyId, plan)
      setCompanies((prev) =>
        prev.map((existing) => (existing.companyId === companyId ? updated : existing)),
      )
    } catch {
      // Best-effort — the row simply keeps its current plan if the call fails.
    } finally {
      setActioningCompanyId(null)
    }
  }

  const normalizedQuery = submittedQuery.trim().toLowerCase()

  const filteredCandidates = candidates.filter(
    (candidate) =>
      !normalizedQuery ||
      candidate.fullName.toLowerCase().includes(normalizedQuery) ||
      candidate.email.toLowerCase().includes(normalizedQuery),
  )
  const filteredCompanies = companies.filter(
    (company) =>
      !normalizedQuery ||
      company.companyName.toLowerCase().includes(normalizedQuery) ||
      company.email.toLowerCase().includes(normalizedQuery),
  )
  const candidateInvoiceList = (invoices ?? []).filter(
    (invoice) =>
      invoice.userType === 'CANDIDATE' &&
      (!normalizedQuery || (invoice.name ?? '').toLowerCase().includes(normalizedQuery)),
  )
  const companyInvoiceList = (invoices ?? []).filter(
    (invoice) =>
      invoice.userType === 'COMPANY' &&
      (!normalizedQuery || (invoice.name ?? '').toLowerCase().includes(normalizedQuery)),
  )

  const activeListLength =
    tab === 'candidates'
      ? filteredCandidates.length
      : tab === 'companies'
        ? filteredCompanies.length
        : tab === 'candidateInvoices'
          ? candidateInvoiceList.length
          : companyInvoiceList.length

  const pageCount = Math.max(1, Math.ceil(activeListLength / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageEnd = currentPage * PAGE_SIZE

  const visibleCandidates = filteredCandidates.slice(pageStart, pageEnd)
  const visibleCompanies = filteredCompanies.slice(pageStart, pageEnd)
  const visibleCandidateInvoices = candidateInvoiceList.slice(pageStart, pageEnd)
  const visibleCompanyInvoices = companyInvoiceList.slice(pageStart, pageEnd)

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('billing.title')}</h1>
      <p className="mb-[22px] text-sm text-slate">{t('billing.subtitle')}</p>

      <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <div className="rounded-card border border-border bg-surface px-5 py-[18px]">
          <div className="mb-1.5 text-xs tracking-[0.03em] text-fog uppercase">
            {t('billing.stats.mrr')}
          </div>
          <div className="text-[22px] font-extrabold text-ink">
            {stats ? `₹${stats.monthlyRecurringRevenueRupees.toLocaleString()}` : '…'}
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface px-5 py-[18px]">
          <div className="mb-1.5 text-xs tracking-[0.03em] text-fog uppercase">
            {t('billing.stats.activeSubscriptions')}
          </div>
          <div className="text-[22px] font-extrabold text-ink">
            {stats ? stats.activeSubscriptions.toLocaleString() : '…'}
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface px-5 py-[18px]">
          <div className="mb-1.5 text-xs tracking-[0.03em] text-fog uppercase">
            {t('billing.stats.churned')}
          </div>
          <div className="text-[22px] font-extrabold text-ink">
            {stats ? stats.churnedThisMonth.toLocaleString() : '…'}
          </div>
        </div>
      </div>

      <div className="mb-[18px] flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchTab('candidates')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'candidates'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          {t('users.tabs.candidates')}
        </button>
        <button
          type="button"
          onClick={() => switchTab('companies')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'companies'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          {t('users.tabs.companies')}
        </button>
        <button
          type="button"
          onClick={() => switchTab('candidateInvoices')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'candidateInvoices'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          {t('billing.tabs.candidateInvoices')}
        </button>
        <button
          type="button"
          onClick={() => switchTab('companyInvoices')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'companyInvoices'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          {t('billing.tabs.companyInvoices')}
        </button>
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
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('billing.searchPlaceholder')}
            className="w-full text-[13.5px] text-ink outline-none"
          />
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-2.5">
        {tab === 'companies' && companiesError && (
          <div className="rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
            {companiesError}
          </div>
        )}

        {tab === 'companies' && companiesLoading && (
          <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
            {t('billing.companyPlans.loading')}
          </div>
        )}

        {tab === 'companies' &&
          !companiesLoading &&
          !companiesError &&
          visibleCompanies.map((company) => {
            const planLabel = COMPANY_PLAN_LABELS[company.plan]
            const validUntil = formatValidUntil(i18n.language, company.validUntil)
            const isActioning = actioningCompanyId === company.companyId
            return (
              <div
                key={company.companyId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-[18px] py-3.5"
              >
                <div>
                  <div className="text-[13.5px] font-bold text-ink">{company.companyName}</div>
                  <div className="text-[12.5px] text-fog">{company.email}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${PLAN_BADGE_CLASSES[planLabel]}`}
                >
                  {planLabel}
                </span>
                <div className="text-[13px] text-fog">
                  {validUntil ? t('billing.since', { date: validUntil }) : ''}
                </div>
                <div className="flex gap-2">
                  {company.plan !== 'FREE' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleSetCompanyPlan(company.companyId, 'FREE')}
                      className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                    >
                      {t('billing.companyPlans.downgradeToFree')}
                    </button>
                  )}
                  {company.plan !== 'GROWTH' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleSetCompanyPlan(company.companyId, 'GROWTH')}
                      className="rounded-md border border-border bg-primary-tint px-3.5 py-1.5 text-[12.5px] font-bold text-primary disabled:opacity-60"
                    >
                      {t('billing.companyPlans.upgradeToGrowth')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

        {tab === 'companies' &&
          !companiesLoading &&
          !companiesError &&
          filteredCompanies.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
              {t('billing.companyPlans.none')}
            </div>
          )}

        {tab === 'candidates' && candidatesError && (
          <div className="rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
            {candidatesError}
          </div>
        )}

        {tab === 'candidates' && candidatesLoading && (
          <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
            {t('billing.candidatePlans.loading')}
          </div>
        )}

        {tab === 'candidates' &&
          !candidatesLoading &&
          !candidatesError &&
          visibleCandidates.map((candidate) => {
            const planLabel = PLAN_LABELS[candidate.plan]
            const validUntil = formatValidUntil(i18n.language, candidate.validUntil)
            const isActioning = actioningCandidateId === candidate.candidateId
            return (
              <div
                key={candidate.candidateId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-[18px] py-3.5"
              >
                <div>
                  <div className="text-[13.5px] font-bold text-ink">{candidate.fullName}</div>
                  <div className="text-[12.5px] text-fog">{candidate.email}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${PLAN_BADGE_CLASSES[planLabel]}`}
                >
                  {planLabel}
                </span>
                <div className="text-[13px] text-fog">
                  {validUntil ? t('billing.since', { date: validUntil }) : ''}
                </div>
                <div className="flex gap-2">
                  {candidate.plan !== 'FREE' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleSetCandidatePlan(candidate.candidateId, 'FREE')}
                      className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                    >
                      {t('billing.candidatePlans.downgradeToFree')}
                    </button>
                  )}
                  {candidate.plan !== 'PLUS' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleSetCandidatePlan(candidate.candidateId, 'PLUS')}
                      className="rounded-md border border-border bg-primary-tint px-3.5 py-1.5 text-[12.5px] font-bold text-primary disabled:opacity-60"
                    >
                      {t('billing.candidatePlans.upgradeToPlus')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

        {tab === 'candidates' &&
          !candidatesLoading &&
          !candidatesError &&
          filteredCandidates.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
              {t('billing.candidatePlans.none')}
            </div>
          )}

        {tab === 'candidateInvoices' && invoices && (
          <>
            {candidateInvoiceList.length === 0 && (
              <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
                {t('billing.noInvoices')}
              </div>
            )}
            {visibleCandidateInvoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} locale={i18n.language} t={t} />
            ))}
          </>
        )}

        {tab === 'companyInvoices' && invoices && (
          <>
            {companyInvoiceList.length === 0 && (
              <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
                {t('billing.noInvoices')}
              </div>
            )}
            {visibleCompanyInvoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} locale={i18n.language} t={t} />
            ))}
          </>
        )}

        {pageCount > 1 && (
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('billing.previousPage')}
            </button>
            <span className="text-[13px] text-slate">
              {t('billing.pageLabel', { page: currentPage, total: pageCount })}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
              disabled={currentPage === pageCount}
              className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('billing.nextPage')}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
