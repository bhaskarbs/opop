import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { BackButton, LoadingState, Spinner } from '../../components/ui'
import { API_BASE_URL, ApiError } from '../../lib/apiClient'
import { adminApi, type AdminCandidateProfileSummary } from '../../lib/adminApi'
import type { ApplicationStatus, ApplicationSummary } from '../../lib/applicationsApi'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { experienceLevelFromBackend, noticePeriodFromBackend } from '../../lib/jobEnums'
import { ROUTES } from '../../routes/paths'

const EXPERIENCE_LEVEL_KEYS: Record<string, string> = {
  'Entry level': 'public:filters.experienceLevel.entry',
  'Mid level': 'public:filters.experienceLevel.mid',
  Senior: 'public:filters.experienceLevel.senior',
  Leadership: 'public:filters.experienceLevel.leadership',
}

const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  UNDER_REVIEW: 'bg-warning-tint text-warning',
  APPLIED: 'bg-neutral-tint text-slate',
  REJECTED: 'bg-[#FDECEC] text-danger',
  WITHDRAWN: 'bg-neutral-tint text-fog',
}

const STATUS_LABEL_KEYS: Record<ApplicationStatus, string> = {
  UNDER_REVIEW: 'candidateDetail.applications.status.underReview',
  APPLIED: 'candidateDetail.applications.status.applied',
  REJECTED: 'candidateDetail.applications.status.notSelected',
  WITHDRAWN: 'candidateDetail.applications.status.withdrawn',
}

const AVATAR_COLOR_CLASSES = ['bg-primary', 'bg-teal', 'bg-amber']

function colorForName(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function AdminCandidateDetailPage() {
  const { t } = useTranslation('admin')
  const localize = useLocalizedPath()
  const { id } = useParams()

  const [candidate, setCandidate] = useState<AdminCandidateProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resumeDownloading, setResumeDownloading] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)

  // Loaded separately from the profile above (own loading/error state) so a hiccup fetching
  // applications never blocks the rest of the page from rendering.
  const [applications, setApplications] = useState<ApplicationSummary[] | null>(null)
  const [applicationsError, setApplicationsError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    adminApi
      .getCandidateDetail(id)
      .then((result) => {
        if (!cancelled) setCandidate(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : t('candidateDetail.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, t])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    adminApi
      .getCandidateApplications(id)
      .then((result) => {
        if (!cancelled) setApplications(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setApplicationsError(
            caught instanceof ApiError ? caught.message : t('candidateDetail.applications.loadError')
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, t])

  async function handleDownloadResume() {
    if (!id || !candidate?.resumeFileName) return
    setResumeError(null)
    setResumeDownloading(true)
    try {
      const blob = await adminApi.getCandidateResume(id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = candidate.resumeFileName
      link.click()
      URL.revokeObjectURL(url)
    } catch (caught) {
      setResumeError(caught instanceof ApiError ? caught.message : t('candidateDetail.resumeError'))
    } finally {
      setResumeDownloading(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-7 pb-16">
        <LoadingState message={t('candidateDetail.loading')} />
      </main>
    )
  }

  if (error || !candidate) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-7 pb-16 text-center text-sm text-danger">
        {error ?? t('candidateDetail.loadError')}
      </main>
    )
  }

  const meta = [candidate.title, candidate.location].filter(Boolean).join(' · ')
  const contactMeta = [candidate.email, candidate.mobile].filter(Boolean).join(' · ')

  return (
    <main className="mx-auto max-w-[760px] px-6 py-7 pb-16">
      <BackButton className="mb-5 inline-block text-[13px] font-bold text-primary no-underline" />

      <div className="rounded-card border border-border bg-surface p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {candidate.photoUrl ? (
              <img
                src={`${API_BASE_URL}${candidate.photoUrl}`}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${colorForName(candidate.fullName)}`}
              >
                {candidate.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-lg font-bold text-ink">{candidate.fullName}</div>
              {meta && <div className="mt-0.5 text-sm text-slate">{meta}</div>}
              <div className="mt-0.5 text-[12px] text-fog">{contactMeta}</div>
              <div className="mt-0.5 text-[12px] text-fog">
                {t('candidateDetail.memberSince', { date: formatDate(candidate.createdAt) })}
              </div>
            </div>
          </div>
          <span
            className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
              candidate.accountStatus === 'SUSPENDED'
                ? 'bg-danger/10 text-danger'
                : 'bg-teal-tint text-teal'
            }`}
          >
            {candidate.accountStatus === 'SUSPENDED'
              ? t('users.status.suspended')
              : t('users.status.active')}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3.5 border-t border-[#F0F1F3] pt-4 sm:grid-cols-2">
          <div>
            <div className="text-[12px] font-bold text-fog uppercase">
              {t('candidateDetail.mobile')}
            </div>
            <div className="mt-0.5 text-[13.5px] text-ink">
              {candidate.mobile ?? t('candidateDetail.notProvided')}
              {candidate.mobile && (
                <span className="ml-1.5 text-[12px] text-fog">
                  {candidate.mobileVerified
                    ? t('candidateDetail.mobileVerified')
                    : t('candidateDetail.mobileNotVerified')}
                </span>
              )}
            </div>
          </div>
          {candidate.experienceLevel && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('public:filters.experienceLevel.heading')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">
                {t(EXPERIENCE_LEVEL_KEYS[experienceLevelFromBackend(candidate.experienceLevel)])}
              </div>
            </div>
          )}
          {candidate.industry && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('candidateDetail.industry')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">{candidate.industry}</div>
            </div>
          )}
          {(candidate.workModePreference || candidate.openToPreference) && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('candidateDetail.preferences')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">
                {[candidate.workModePreference, candidate.openToPreference]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          )}
          {candidate.yearsOfExperience != null && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('candidateDetail.yearsOfExperience')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">{candidate.yearsOfExperience}</div>
            </div>
          )}
          {candidate.currentSalaryLakhs != null && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('candidateDetail.currentSalary')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">
                {t('candidateDetail.lakhsPerYear', { amount: candidate.currentSalaryLakhs })}
              </div>
            </div>
          )}
          {candidate.noticePeriod && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('candidateDetail.noticePeriod')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">
                {noticePeriodFromBackend(candidate.noticePeriod)}
              </div>
            </div>
          )}
          {(candidate.educationDegree || candidate.educationInstitution) && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('candidateDetail.education')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">
                {[candidate.educationDegree, candidate.educationInstitution]
                  .filter(Boolean)
                  .join(', ')}
                {candidate.educationGraduationYear ? ` (${candidate.educationGraduationYear})` : ''}
              </div>
            </div>
          )}
        </div>

        {candidate.skills.length > 0 && (
          <div className="mt-3.5 border-t border-[#F0F1F3] pt-4">
            <div className="mb-1.5 text-[12px] font-bold text-fog uppercase">
              {t('candidateDetail.skills')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-neutral-tint px-2.5 py-1 text-xs font-semibold text-[#3A414D]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {(candidate.lifeGoals || candidate.workCulture) && (
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 border-t border-[#F0F1F3] pt-4 sm:grid-cols-2">
            {candidate.lifeGoals && (
              <div>
                <div className="text-[12px] font-bold text-fog uppercase">
                  {t('candidateDetail.lifeGoals')}
                </div>
                <div className="mt-0.5 text-[13.5px] text-ink">{candidate.lifeGoals}</div>
              </div>
            )}
            {candidate.workCulture && (
              <div>
                <div className="text-[12px] font-bold text-fog uppercase">
                  {t('candidateDetail.workCulture')}
                </div>
                <div className="mt-0.5 text-[13.5px] text-ink">{candidate.workCulture}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-card border border-border bg-surface p-7">
        <h2 className="mb-3 text-base font-bold text-ink">{t('candidateDetail.resume')}</h2>
        {!candidate.resumeFileName ? (
          <p className="text-[13px] text-slate">{t('candidateDetail.noResume')}</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[13.5px] font-bold text-ink">{candidate.resumeFileName}</div>
              {candidate.resumeUploadedAt && candidate.resumeSizeBytes != null && (
                <div className="mt-0.5 text-[12px] text-fog">
                  {t('candidateDetail.resumeMeta', {
                    date: formatDate(candidate.resumeUploadedAt),
                    size: formatFileSize(candidate.resumeSizeBytes),
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={resumeDownloading}
              onClick={handleDownloadResume}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resumeDownloading && <Spinner className="h-3.5 w-3.5" />}
              {resumeDownloading
                ? t('candidateDetail.resumeLoading')
                : t('candidateDetail.downloadResume')}
            </button>
          </div>
        )}
        {resumeError && <p className="mt-3 text-[13px] text-danger">{resumeError}</p>}
      </div>

      <div className="mt-4 rounded-card border border-border bg-surface p-7">
        <h2 className="mb-3 text-base font-bold text-ink">{t('candidateDetail.applications.title')}</h2>
        {applicationsError && <p className="text-[13px] text-danger">{applicationsError}</p>}
        {!applicationsError && applications === null && (
          <p className="text-[13px] text-slate">{t('candidateDetail.loading')}</p>
        )}
        {applications !== null &&
          (applications.length === 0 ? (
            <p className="text-[13px] text-slate">{t('candidateDetail.applications.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {applications.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F1F3] pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <Link
                      to={localize(ROUTES.jobDetail(application.jobId))}
                      className="text-[13.5px] font-bold text-ink no-underline hover:text-primary"
                    >
                      {application.jobTitle}
                    </Link>
                    <div className="mt-0.5 text-[12px] text-fog">
                      {application.companyName} ·{' '}
                      {t('candidateDetail.applications.appliedOn', {
                        date: formatDate(application.appliedAt),
                      })}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS_CLASSES[application.status]}`}
                  >
                    {t(STATUS_LABEL_KEYS[application.status])}
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </main>
  )
}
