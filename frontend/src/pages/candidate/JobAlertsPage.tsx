import { type SubmitEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { TRENDING_SKILLS } from '../../mocks/jobs'
import { LOCATION_SUGGESTIONS } from '../../mocks/locations'
import { SKILL_SUGGESTIONS } from '../../mocks/skills'
import { LoadingState, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { jobAlertsApi, type JobAlertSummary } from '../../lib/jobAlertsApi'
import { posthog } from '../../lib/posthog'
import {
  EXPERIENCE_LEVELS,
  WORK_MODES,
  experienceLevelFromBackend,
  experienceLevelToBackend,
  workModeFromBackend,
  workModeToBackend,
  type ExperienceLevelLabel,
  type WorkModeLabel,
} from '../../lib/jobEnums'
import { SearchTagAutocompleteField } from '../job-search/SearchTagAutocompleteField'

const KEYWORD_SUGGESTIONS = [...new Set([...TRENDING_SKILLS, ...SKILL_SUGGESTIONS])]

type LevelChoice = ExperienceLevelLabel | 'Any'
type ModeChoice = WorkModeLabel | 'Any'

function formatCreatedLabel(t: TFunction<'candidate'>, createdAt: string): string {
  return t('jobAlerts.createdPrefix', { date: new Date(createdAt).toLocaleDateString() })
}

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-neutral-tint px-2.5 py-1 text-[12px] font-semibold text-[#3A414D]">
      {children}
    </span>
  )
}

function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="shrink-0 text-fog"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="shrink-0 text-fog"
    >
      <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export default function JobAlertsPage() {
  const { t } = useTranslation('candidate')
  const [alerts, setAlerts] = useState<JobAlertSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [keywords, setKeywords] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [level, setLevel] = useState<LevelChoice>('Any')
  const [mode, setMode] = useState<ModeChoice>('Any')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    jobAlertsApi
      .mine()
      .then((result) => {
        if (!cancelled) setAlerts(result)
      })
      .catch((caught) => {
        if (!cancelled)
          setError(caught instanceof ApiError ? caught.message : t('jobAlerts.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  async function handleCreate(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const created = await jobAlertsApi.create({
        keywords,
        locations,
        experienceLevel: level === 'Any' ? null : experienceLevelToBackend(level),
        workMode: mode === 'Any' ? null : workModeToBackend(mode),
      })
      setAlerts((prev) => [created, ...prev])
      posthog.capture('job_alert_created', {
        has_keywords: keywords.length > 0,
        has_locations: locations.length > 0,
        experience_level: level,
        work_mode: mode,
      })
      setKeywords([])
      setLocations([])
      setLevel('Any')
      setMode('Any')
    } catch (caught) {
      setCreateError(caught instanceof ApiError ? caught.message : t('jobAlerts.createError'))
    } finally {
      setCreating(false)
    }
  }

  // Optimistic, same as SavedJobsPage's unsave — reverts the list back on failure rather than
  // waiting on the request before updating the UI.
  function handleDelete(id: string) {
    setDeleteError(null)
    const previous = alerts
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
    jobAlertsApi
      .remove(id)
      .then(() => posthog.capture('job_alert_deleted'))
      .catch((caught) => {
        setAlerts(previous)
        setDeleteError(caught instanceof ApiError ? caught.message : t('jobAlerts.deleteError'))
      })
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 pt-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('jobAlerts.title')}</h1>
      <p className="mb-5 text-sm text-slate">{t('jobAlerts.subtitle')}</p>

      <div className="mb-7 rounded-card border border-border bg-surface p-5">
        <h2 className="mb-3.5 text-[15px] font-bold text-ink">{t('jobAlerts.createTitle')}</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <SearchTagAutocompleteField
            values={keywords}
            onChange={setKeywords}
            suggestions={KEYWORD_SUGGESTIONS}
            placeholder={t('jobAlerts.keywordsPlaceholder')}
            removeLabel={(value) => t('jobAlerts.removeKeyword', { value })}
            containerClassName="w-full"
            icon={<SearchIcon />}
          />
          <SearchTagAutocompleteField
            values={locations}
            onChange={setLocations}
            suggestions={LOCATION_SUGGESTIONS}
            placeholder={t('jobAlerts.locationsPlaceholder')}
            removeLabel={(value) => t('jobAlerts.removeLocation', { value })}
            containerClassName="w-full"
            icon={<LocationIcon />}
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value as LevelChoice)}
              className="rounded-lg border border-border px-3 py-2.5 text-[13.5px] text-ink"
            >
              <option value="Any">{t('jobAlerts.anyLevel')}</option>
              {EXPERIENCE_LEVELS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as ModeChoice)}
              className="rounded-lg border border-border px-3 py-2.5 text-[13.5px] text-ink"
            >
              <option value="Any">{t('jobAlerts.anyMode')}</option>
              {WORK_MODES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          {createError && (
            <div className="rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
              {createError}
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13.5px] font-bold text-white disabled:cursor-not-allowed disabled:bg-primary/50"
            >
              {creating && <Spinner className="h-4 w-4" />}
              {creating ? t('jobAlerts.creating') : t('jobAlerts.create')}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}
      {deleteError && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {deleteError}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10">
          <LoadingState message={t('jobAlerts.loading')} />
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('jobAlerts.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((alert) => {
            const hasCriteria =
              alert.keywords.length > 0 ||
              alert.locations.length > 0 ||
              alert.experienceLevel != null ||
              alert.workMode != null
            return (
              <div
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    {hasCriteria ? (
                      <>
                        {alert.keywords.map((keyword) => (
                          <Tag key={keyword}>{keyword}</Tag>
                        ))}
                        {alert.locations.map((location) => (
                          <Tag key={location}>{location}</Tag>
                        ))}
                        {alert.experienceLevel && (
                          <Tag>{experienceLevelFromBackend(alert.experienceLevel)}</Tag>
                        )}
                        {alert.workMode && <Tag>{workModeFromBackend(alert.workMode)}</Tag>}
                      </>
                    ) : (
                      <Tag>{t('jobAlerts.anyJob')}</Tag>
                    )}
                  </div>
                  <div className="mt-1.5 text-[12.5px] text-fog">
                    {formatCreatedLabel(t, alert.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(alert.id)}
                  className="text-[12.5px] font-bold text-danger"
                >
                  {t('jobAlerts.delete')}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
