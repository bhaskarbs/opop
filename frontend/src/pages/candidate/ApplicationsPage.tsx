import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ApiError } from '../../lib/apiClient'
import {
  applicationsApi,
  type ApplicationStatus as BackendApplicationStatus,
} from '../../lib/applicationsApi'
import { ideasApi, type BackendIdeaInterestRole } from '../../lib/ideasApi'

type ApplicationType = 'Job' | 'Partnership'

type ApplicationStatus = 'Under review' | 'Applied' | 'Not selected' | 'Withdrawn'

interface Application {
  id: string
  title: string
  org: string
  applied: string
  type: ApplicationType
  status: ApplicationStatus
  // Only set for Partnership rows (investor/participant on an idea) — idea interests have no
  // review workflow of their own (see IdeaService.submitInterest), so status is always a fixed
  // 'Applied'; this is what actually distinguishes one row from another.
  roleLabel?: BackendIdeaInterestRole
}

const TYPE_STYLES: Record<
  ApplicationType,
  { icon: string; strokeColor: string; iconBgClass: string; tagClass: string }
> = {
  Job: {
    icon: 'M3 7h18v13H3zM3 7l9-4 9 4',
    strokeColor: '#2451D6',
    iconBgClass: 'bg-primary-tint',
    tagClass: 'bg-primary-tint text-primary',
  },
  Partnership: {
    icon: 'M12 2l3 6 6 1-4.5 4.5L17.5 20 12 17l-5.5 3 1-6.5L3 9l6-1z',
    strokeColor: '#C2760C',
    iconBgClass: 'bg-warning-tint',
    tagClass: 'bg-amber-tint text-amber',
  },
}

const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  'Under review': 'bg-warning-tint text-warning',
  Applied: 'bg-neutral-tint text-slate',
  'Not selected': 'bg-[#FDECEC] text-danger',
  Withdrawn: 'bg-neutral-tint text-fog',
}

// Rendered text only — the literal type/status/tab values stay as the underlying data (Record
// keys, backend mapping, comparisons), same pattern as FilterSidebar's EXPERIENCE_LEVEL_KEYS.
const TYPE_LABEL_KEYS: Record<ApplicationType, string> = {
  Job: 'applications.type.job',
  Partnership: 'applications.type.partnership',
}

const STATUS_LABEL_KEYS: Record<ApplicationStatus, string> = {
  'Under review': 'applications.status.underReview',
  Applied: 'applications.status.applied',
  'Not selected': 'applications.status.notSelected',
  Withdrawn: 'applications.status.withdrawn',
}

const BACKEND_STATUS_LABELS: Record<BackendApplicationStatus, ApplicationStatus> = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under review',
  REJECTED: 'Not selected',
  WITHDRAWN: 'Withdrawn',
}

const ROLE_LABEL_KEYS: Record<BackendIdeaInterestRole, string> = {
  INVESTOR: 'applications.role.investor',
  PARTICIPANT: 'applications.role.participant',
}

const ROLE_BADGE_CLASSES: Record<BackendIdeaInterestRole, string> = {
  INVESTOR: 'bg-primary-tint text-primary',
  PARTICIPANT: 'bg-teal-tint text-teal',
}

function formatAppliedLabel(t: TFunction<'candidate'>, appliedAt: string): string {
  const days = Math.floor((Date.now() - new Date(appliedAt).getTime()) / 86_400_000)
  if (days <= 0) return t('applications.appliedToday')
  if (days === 1) return t('applications.appliedOneDayAgo')
  if (days < 7) return t('applications.appliedDaysAgo', { days })
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1
      ? t('applications.appliedOneWeekAgo')
      : t('applications.appliedWeeksAgo', { weeks })
  }
  const months = Math.floor(days / 30)
  return months === 1
    ? t('applications.appliedOneMonthAgo')
    : t('applications.appliedMonthsAgo', { months })
}

const TAB_FILTERS = ['All', 'Jobs', 'Partnerships'] as const
type TabFilter = (typeof TAB_FILTERS)[number]

const TAB_TO_TYPE: Record<Exclude<TabFilter, 'All'>, ApplicationType> = {
  Jobs: 'Job',
  Partnerships: 'Partnership',
}

const TAB_LABEL_KEYS: Record<TabFilter, string> = {
  All: 'applications.tabs.all',
  Jobs: 'applications.tabs.jobs',
  Partnerships: 'applications.tabs.partnerships',
}

export default function ApplicationsPage() {
  const { t } = useTranslation('candidate')
  const [activeTab, setActiveTab] = useState<TabFilter>('All')
  const [jobApplications, setJobApplications] = useState<Application[]>([])
  const [partnershipApplications, setPartnershipApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      const [jobsResult, partnershipsResult] = await Promise.allSettled([
        applicationsApi.mine(),
        ideasApi.myInterests(),
      ])
      if (cancelled) return

      if (jobsResult.status === 'fulfilled') {
        setJobApplications(
          jobsResult.value.map((application) => ({
            id: application.id,
            title: application.jobTitle,
            org: application.companyName,
            applied: formatAppliedLabel(t, application.appliedAt),
            type: 'Job',
            status: BACKEND_STATUS_LABELS[application.status],
          })),
        )
      }
      if (partnershipsResult.status === 'fulfilled') {
        setPartnershipApplications(
          partnershipsResult.value.map((interest) => ({
            id: interest.id,
            title: interest.ideaTitle,
            org: interest.ideaSubmitterName,
            applied: formatAppliedLabel(t, interest.createdAt),
            type: 'Partnership',
            status: 'Applied',
            roleLabel: interest.role,
          })),
        )
      }
      const failure =
        jobsResult.status === 'rejected'
          ? jobsResult.reason
          : partnershipsResult.status === 'rejected'
            ? partnershipsResult.reason
            : null
      if (failure) {
        setError(failure instanceof ApiError ? failure.message : t('applications.loadError'))
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [t])

  async function handleWithdraw(applicationId: string) {
    try {
      await applicationsApi.withdraw(applicationId)
      setJobApplications((prev) =>
        prev.map((application) =>
          application.id === applicationId ? { ...application, status: 'Withdrawn' } : application,
        ),
      )
    } catch {
      // Best-effort — the row simply keeps its current status if the withdraw call fails.
    }
  }

  const allApplications = [...jobApplications, ...partnershipApplications]

  function tabCount(tab: TabFilter): number {
    if (tab === 'All') return allApplications.length
    return allApplications.filter((application) => application.type === TAB_TO_TYPE[tab]).length
  }

  const visible =
    activeTab === 'All'
      ? allApplications
      : allApplications.filter((application) => application.type === TAB_TO_TYPE[activeTab])

  return (
    <main className="mx-auto max-w-[1000px] px-6 pt-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('applications.title')}</h1>
      <p className="mb-5 text-sm text-slate">{t('applications.subtitle')}</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {TAB_FILTERS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
              tab === activeTab
                ? 'border-ink bg-ink text-white'
                : 'border-border bg-surface text-[#3A414D]'
            }`}
          >
            {t(TAB_LABEL_KEYS[tab])} ({tabCount(tab)})
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('applications.loading')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((application) => {
            const typeStyle = TYPE_STYLES[application.type]
            return (
              <div
                key={application.id}
                className="flex flex-wrap items-center justify-between gap-3.5 rounded-card border border-border bg-surface px-5 py-[18px]"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div
                    className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[10px] ${typeStyle.iconBgClass}`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={typeStyle.strokeColor}
                      strokeWidth="2"
                    >
                      <path d={typeStyle.icon} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14.5px] font-bold text-ink">{application.title}</span>
                      <span
                        className={`rounded-full px-[9px] py-0.5 text-[11px] font-bold ${typeStyle.tagClass}`}
                      >
                        {t(TYPE_LABEL_KEYS[application.type])}
                      </span>
                      {application.roleLabel && (
                        <span
                          className={`rounded-full px-[9px] py-0.5 text-[11px] font-bold ${ROLE_BADGE_CLASSES[application.roleLabel]}`}
                        >
                          {t(ROLE_LABEL_KEYS[application.roleLabel])}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[13px] text-slate">
                      {t('applications.appliedPrefix', {
                        org: application.org,
                        applied: application.applied,
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {application.type === 'Job' && application.status !== 'Withdrawn' && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(application.id)}
                      className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink"
                    >
                      {t('applications.withdraw')}
                    </button>
                  )}
                  <span
                    className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold whitespace-nowrap ${STATUS_CLASSES[application.status]}`}
                  >
                    {t(STATUS_LABEL_KEYS[application.status])}
                  </span>
                </div>
              </div>
            )
          })}
          {visible.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
              {t('applications.empty')}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
