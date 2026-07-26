import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ContactRevealControl } from '../../components/company/ContactRevealControl'
import { useContactEligibility } from '../../hooks/useContactEligibility'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import {
  applicationsApi,
  type ApplicationStatus,
  type JobApplicantSummary,
} from '../../lib/applicationsApi'
import { ApiError } from '../../lib/apiClient'
import { companyApi } from '../../lib/companyApi'
import { jobsApi } from '../../lib/jobsApi'
import { ROUTES } from '../../routes/paths'

const AVATAR_COLOR_CLASSES = ['bg-primary', 'bg-teal', 'bg-amber']

function colorForName(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]
}

const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  UNDER_REVIEW: 'bg-warning-tint text-warning',
  APPLIED: 'bg-neutral-tint text-slate',
  REJECTED: 'bg-[#FDECEC] text-danger',
  WITHDRAWN: 'bg-neutral-tint text-fog',
}

const STATUS_LABEL_KEYS: Record<ApplicationStatus, string> = {
  UNDER_REVIEW: 'jobApplicants.status.underReview',
  APPLIED: 'jobApplicants.status.applied',
  REJECTED: 'jobApplicants.status.notSelected',
  WITHDRAWN: 'jobApplicants.status.withdrawn',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function JobApplicantsPage() {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const { jobId } = useParams()

  const [jobTitle, setJobTitle] = useState<string | null>(null)
  const [applicants, setApplicants] = useState<JobApplicantSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Same eligibility gate as SearchCandidatesPage — applying to a job doesn't waive it.
  const { canContact, hint: contactHint, reason: contactReason, quota } = useContactEligibility()

  const [revealingIds, setRevealingIds] = useState<Set<string>>(new Set())
  const [revealErrors, setRevealErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    Promise.all([jobsApi.detail(jobId), applicationsApi.forJob(jobId)])
      .then(([job, applicantsResult]) => {
        if (cancelled) return
        setJobTitle(job.title)
        setApplicants(applicantsResult)
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : t('jobApplicants.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [jobId, t])

  function handleRevealContact(candidateUserId: string) {
    setRevealingIds((prev) => new Set(prev).add(candidateUserId))
    setRevealErrors((prev) => {
      const next = { ...prev }
      delete next[candidateUserId]
      return next
    })
    companyApi
      .revealCandidateContact(candidateUserId)
      .then((response) => {
        setApplicants((prev) =>
          prev.map((applicant) =>
            applicant.candidateUserId === candidateUserId
              ? { ...applicant, contactNumber: response.contactNumber }
              : applicant,
          ),
        )
      })
      .catch((caught) => {
        setRevealErrors((prev) => ({
          ...prev,
          [candidateUserId]:
            caught instanceof ApiError ? caught.message : t('searchCandidates.revealError'),
        }))
      })
      .finally(() => {
        setRevealingIds((prev) => {
          const next = new Set(prev)
          next.delete(candidateUserId)
          return next
        })
      })
  }

  return (
    <main className="mx-auto max-w-[900px] px-6 py-7 pb-16">
      <Link
        to={localize(ROUTES.companyJobPostings)}
        className="mb-5 inline-block text-[13px] font-bold text-primary no-underline"
      >
        {t('jobApplicants.backToJobPostings')}
      </Link>

      <h1 className="mb-1 text-xl font-extrabold text-ink">
        {jobTitle ? t('jobApplicants.titleForJob', { job: jobTitle }) : t('jobApplicants.title')}
      </h1>
      <p className="mb-5 text-sm text-slate">{t('jobApplicants.subtitle')}</p>

      {!canContact && contactHint && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#FCE3B8] bg-amber-tint px-4 py-3.5 text-[13px] text-[#8A5A0F]">
          <span>{contactHint}</span>
          <Link
            to={localize(
              contactReason === 'incomplete-profile'
                ? ROUTES.companyProfile
                : ROUTES.companyBilling,
            )}
            className="font-bold whitespace-nowrap text-primary no-underline"
          >
            {contactReason === 'incomplete-profile'
              ? t('dashboard.completeProfileCta')
              : t('searchCandidates.upgradePlanCta')}
          </Link>
        </div>
      )}
      {canContact && quota && quota.plan !== 'FREE' && (
        <div className="mb-4 text-[12.5px] text-fog">
          {t('searchCandidates.contactsRemaining', {
            remaining: quota.remaining,
            limit: quota.limit,
          })}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('jobApplicants.loading')}
        </div>
      ) : applicants.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('jobApplicants.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {applicants.map((applicant) => {
            const meta = [applicant.title, applicant.location].filter(Boolean).join(' · ')
            return (
              <div
                key={applicant.applicationId}
                className="flex flex-wrap justify-between gap-4 rounded-card border border-border bg-surface px-5 py-[18px]"
              >
                <div className="flex gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white ${colorForName(applicant.fullName)}`}
                  >
                    {applicant.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-ink">{applicant.fullName}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[applicant.status]}`}
                      >
                        {t(STATUS_LABEL_KEYS[applicant.status])}
                      </span>
                    </div>
                    {meta && <div className="mt-0.5 text-[13px] text-slate">{meta}</div>}
                    <div className="mt-0.5 text-[12px] text-fog">
                      {t('jobApplicants.appliedOn', { date: formatDate(applicant.appliedAt) })}
                    </div>
                    {applicant.skills.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {applicant.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-neutral-tint px-2.5 py-1 text-xs font-semibold text-[#3A414D]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    {canContact ? (
                      <Link
                        to={localize(ROUTES.companyCandidateProfile(applicant.candidateUserId))}
                        className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink no-underline"
                      >
                        {t('dashboard.viewProfile')}
                      </Link>
                    ) : (
                      <span
                        title={contactHint ?? undefined}
                        className="cursor-not-allowed rounded-lg border border-border bg-neutral-tint px-3.5 py-2 text-[12.5px] font-bold text-fog"
                      >
                        {t('dashboard.viewProfile')}
                      </span>
                    )}
                    <ContactRevealControl
                      contactNumber={applicant.contactNumber}
                      revealing={revealingIds.has(applicant.candidateUserId)}
                      canContact={canContact}
                      hint={contactHint}
                      onReveal={() => handleRevealContact(applicant.candidateUserId)}
                    />
                  </div>
                  {revealErrors[applicant.candidateUserId] && (
                    <p className="max-w-[220px] text-right text-[11.5px] text-danger">
                      {revealErrors[applicant.candidateUserId]}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
