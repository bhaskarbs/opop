import { useEffect, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, LoadingState, Modal, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import {
  adminApi,
  type AdminBillingStats,
  type AdminCandidateSubscriptionSummary,
  type AdminCompanySubscriptionSummary,
  type AdminInvoiceSummary,
} from '../../lib/adminApi'

const MIN_GRANT_MONTHS = 1
const MAX_GRANT_MONTHS = 24
const DEFAULT_GRANT_MONTHS = 1

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

function formatAdminDate(locale: string, validUntil: string | null): string | null {
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
      <div className="text-[13px] text-fog">{formatAdminDate(locale, invoice.createdAt)}</div>
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

  // Plus grants need the admin to choose a period and whether to generate an invoice (see
  // CandidateBillingService.adminSetPlan) — unlike every other row action here, that can't
  // happen from a single button click, so it opens this modal instead.
  const [grantModalCandidate, setGrantModalCandidate] =
    useState<AdminCandidateSubscriptionSummary | null>(null)
  const [grantMonths, setGrantMonths] = useState(DEFAULT_GRANT_MONTHS)
  const [grantInvoice, setGrantInvoice] = useState(true)
  const [granting, setGranting] = useState(false)
  const [grantError, setGrantError] = useState<string | null>(null)

  // Company counterpart of the candidate grant-modal state above — mirrors it exactly for the
  // Growth plan.
  const [grantModalCompany, setGrantModalCompany] =
    useState<AdminCompanySubscriptionSummary | null>(null)
  const [companyGrantMonths, setCompanyGrantMonths] = useState(DEFAULT_GRANT_MONTHS)
  const [companyGrantInvoice, setCompanyGrantInvoice] = useState(true)
  // Which plan button was clicked (both Growth/Enterprise share the same months/invoice
  // fields, so only the clicked button's own spinner should show, not both).
  const [companyGrantingPlan, setCompanyGrantingPlan] = useState<'GROWTH' | 'ENTERPRISE' | null>(
    null,
  )
  const [companyGrantError, setCompanyGrantError] = useState<string | null>(null)

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

  async function handleDowngradeCandidateToFree(candidateId: string) {
    if (!window.confirm(t('billing.candidatePlans.confirmDowngrade'))) return
    setActioningCandidateId(candidateId)
    try {
      const updated = await adminApi.setCandidatePlan(candidateId, { plan: 'FREE' })
      setCandidates((prev) =>
        prev.map((existing) => (existing.candidateId === candidateId ? updated : existing)),
      )
    } catch {
      // Best-effort — the row simply keeps its current plan if the call fails.
    } finally {
      setActioningCandidateId(null)
    }
  }

  function openGrantPlusModal(candidate: AdminCandidateSubscriptionSummary) {
    setGrantModalCandidate(candidate)
    setGrantMonths(DEFAULT_GRANT_MONTHS)
    setGrantInvoice(true)
    setGrantError(null)
  }

  async function handleGrantPlus() {
    if (!grantModalCandidate) return
    setGranting(true)
    setGrantError(null)
    try {
      const updated = await adminApi.setCandidatePlan(grantModalCandidate.candidateId, {
        plan: 'PLUS',
        months: grantMonths,
        generateInvoice: grantInvoice,
      })
      setCandidates((prev) =>
        prev.map((existing) =>
          existing.candidateId === grantModalCandidate.candidateId ? updated : existing,
        ),
      )
      setGrantModalCandidate(null)
    } catch (caught) {
      setGrantError(
        caught instanceof ApiError ? caught.message : t('billing.candidatePlans.grantModal.error'),
      )
    } finally {
      setGranting(false)
    }
  }

  async function handleDowngradeCompanyToFree(companyId: string) {
    if (!window.confirm(t('billing.companyPlans.confirmDowngrade'))) return
    setActioningCompanyId(companyId)
    try {
      const updated = await adminApi.setCompanyPlan(companyId, { plan: 'FREE' })
      setCompanies((prev) =>
        prev.map((existing) => (existing.companyId === companyId ? updated : existing)),
      )
    } catch {
      // Best-effort — the row simply keeps its current plan if the call fails.
    } finally {
      setActioningCompanyId(null)
    }
  }

  function openGrantCompanyModal(company: AdminCompanySubscriptionSummary) {
    setGrantModalCompany(company)
    setCompanyGrantMonths(DEFAULT_GRANT_MONTHS)
    setCompanyGrantInvoice(true)
    setCompanyGrantError(null)
  }

  async function handleGrantCompanyPlan(plan: 'GROWTH' | 'ENTERPRISE') {
    if (!grantModalCompany) return
    setCompanyGrantingPlan(plan)
    setCompanyGrantError(null)
    try {
      const updated = await adminApi.setCompanyPlan(grantModalCompany.companyId, {
        plan,
        months: companyGrantMonths,
        generateInvoice: companyGrantInvoice,
      })
      setCompanies((prev) =>
        prev.map((existing) =>
          existing.companyId === grantModalCompany.companyId ? updated : existing,
        ),
      )
      setGrantModalCompany(null)
    } catch (caught) {
      setCompanyGrantError(
        caught instanceof ApiError ? caught.message : t('billing.companyPlans.grantModal.error'),
      )
    } finally {
      setCompanyGrantingPlan(null)
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
          <div className="rounded-card border border-border bg-surface p-8">
            <LoadingState message={t('billing.companyPlans.loading')} />
          </div>
        )}

        {tab === 'companies' &&
          !companiesLoading &&
          !companiesError &&
          visibleCompanies.map((company) => {
            const planLabel = COMPANY_PLAN_LABELS[company.plan]
            const upgradedAt = formatAdminDate(i18n.language, company.upgradedAt)
            const validUntil = formatAdminDate(i18n.language, company.validUntil)
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
                <div className="text-right text-[13px] text-fog">
                  {upgradedAt && <div>{t('billing.upgradedOn', { date: upgradedAt })}</div>}
                  {validUntil && <div>{t('billing.validUntilShort', { date: validUntil })}</div>}
                </div>
                <div className="flex gap-2">
                  {company.plan !== 'FREE' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleDowngradeCompanyToFree(company.companyId)}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                    >
                      {isActioning && <Spinner className="h-3.5 w-3.5" />}
                      {t('billing.companyPlans.downgradeToFree')}
                    </button>
                  )}
                  {company.plan !== 'ENTERPRISE' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => openGrantCompanyModal(company)}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-primary-tint px-3.5 py-1.5 text-[12.5px] font-bold text-primary disabled:opacity-60"
                    >
                      {t('billing.companyPlans.changePlan')}
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
          <div className="rounded-card border border-border bg-surface p-8">
            <LoadingState message={t('billing.candidatePlans.loading')} />
          </div>
        )}

        {tab === 'candidates' &&
          !candidatesLoading &&
          !candidatesError &&
          visibleCandidates.map((candidate) => {
            const planLabel = PLAN_LABELS[candidate.plan]
            const upgradedAt = formatAdminDate(i18n.language, candidate.upgradedAt)
            const validUntil = formatAdminDate(i18n.language, candidate.validUntil)
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
                <div className="text-right text-[13px] text-fog">
                  {upgradedAt && <div>{t('billing.upgradedOn', { date: upgradedAt })}</div>}
                  {validUntil && <div>{t('billing.validUntilShort', { date: validUntil })}</div>}
                </div>
                <div className="flex gap-2">
                  {candidate.plan !== 'FREE' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleDowngradeCandidateToFree(candidate.candidateId)}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                    >
                      {isActioning && <Spinner className="h-3.5 w-3.5" />}
                      {t('billing.candidatePlans.downgradeToFree')}
                    </button>
                  )}
                  {candidate.plan !== 'PLUS' && (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => openGrantPlusModal(candidate)}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-primary-tint px-3.5 py-1.5 text-[12.5px] font-bold text-primary disabled:opacity-60"
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

      <Modal
        open={grantModalCandidate !== null}
        onClose={() => setGrantModalCandidate(null)}
        closeLabel={t('billing.candidatePlans.grantModal.close')}
        title={t('billing.candidatePlans.grantModal.title')}
      >
        {grantModalCandidate && (
          <div className="flex flex-col gap-4">
            <p className="text-[13.5px] text-slate">
              {t('billing.candidatePlans.grantModal.subtitle', {
                name: grantModalCandidate.fullName,
              })}
            </p>

            <Input
              type="number"
              label={t('billing.candidatePlans.grantModal.monthsLabel')}
              min={MIN_GRANT_MONTHS}
              max={MAX_GRANT_MONTHS}
              value={grantMonths}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                setGrantMonths(Number.isFinite(parsed) ? parsed : DEFAULT_GRANT_MONTHS)
              }}
            />

            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-ink">
                {t('billing.candidatePlans.grantModal.invoiceLabel')}
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-[13.5px] text-ink">
                  <input
                    type="radio"
                    name="grantInvoice"
                    checked={grantInvoice}
                    onChange={() => setGrantInvoice(true)}
                  />
                  {t('billing.candidatePlans.grantModal.invoiceYes')}
                </label>
                <label className="flex items-center gap-1.5 text-[13.5px] text-ink">
                  <input
                    type="radio"
                    name="grantInvoice"
                    checked={!grantInvoice}
                    onChange={() => setGrantInvoice(false)}
                  />
                  {t('billing.candidatePlans.grantModal.invoiceNo')}
                </label>
              </div>
            </div>

            {grantError && (
              <div className="rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
                {grantError}
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGrantModalCandidate(null)}
                disabled={granting}
              >
                {t('billing.candidatePlans.grantModal.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleGrantPlus}
                loading={granting}
                disabled={grantMonths < MIN_GRANT_MONTHS || grantMonths > MAX_GRANT_MONTHS}
              >
                {t('billing.candidatePlans.grantModal.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={grantModalCompany !== null}
        onClose={() => setGrantModalCompany(null)}
        closeLabel={t('billing.companyPlans.grantModal.close')}
        title={t('billing.companyPlans.grantModal.title')}
      >
        {grantModalCompany && (
          <div className="flex flex-col gap-4">
            <p className="text-[13.5px] text-slate">
              {t('billing.companyPlans.grantModal.subtitle', {
                name: grantModalCompany.companyName,
              })}
            </p>

            <Input
              type="number"
              label={t('billing.companyPlans.grantModal.monthsLabel')}
              min={MIN_GRANT_MONTHS}
              max={MAX_GRANT_MONTHS}
              value={companyGrantMonths}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                setCompanyGrantMonths(Number.isFinite(parsed) ? parsed : DEFAULT_GRANT_MONTHS)
              }}
            />

            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-ink">
                {t('billing.companyPlans.grantModal.invoiceLabel')}
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-[13.5px] text-ink">
                  <input
                    type="radio"
                    name="companyGrantInvoice"
                    checked={companyGrantInvoice}
                    onChange={() => setCompanyGrantInvoice(true)}
                  />
                  {t('billing.companyPlans.grantModal.invoiceYes')}
                </label>
                <label className="flex items-center gap-1.5 text-[13.5px] text-ink">
                  <input
                    type="radio"
                    name="companyGrantInvoice"
                    checked={!companyGrantInvoice}
                    onChange={() => setCompanyGrantInvoice(false)}
                  />
                  {t('billing.companyPlans.grantModal.invoiceNo')}
                </label>
              </div>
            </div>

            {companyGrantError && (
              <div className="rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
                {companyGrantError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGrantModalCompany(null)}
                disabled={companyGrantingPlan !== null}
              >
                {t('billing.companyPlans.grantModal.cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => handleGrantCompanyPlan('GROWTH')}
                loading={companyGrantingPlan === 'GROWTH'}
                disabled={
                  (companyGrantingPlan !== null && companyGrantingPlan !== 'GROWTH') ||
                  companyGrantMonths < MIN_GRANT_MONTHS ||
                  companyGrantMonths > MAX_GRANT_MONTHS
                }
              >
                {t('billing.companyPlans.grantModal.confirmGrowth')}
              </Button>
              <Button
                type="button"
                onClick={() => handleGrantCompanyPlan('ENTERPRISE')}
                loading={companyGrantingPlan === 'ENTERPRISE'}
                disabled={
                  (companyGrantingPlan !== null && companyGrantingPlan !== 'ENTERPRISE') ||
                  companyGrantMonths < MIN_GRANT_MONTHS ||
                  companyGrantMonths > MAX_GRANT_MONTHS
                }
              >
                {t('billing.companyPlans.grantModal.confirmEnterprise')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}
