import { type SubmitEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { TRENDING_SKILLS } from '../../mocks/jobs'
import { ApiError } from '../../lib/apiClient'
import { applicationsApi } from '../../lib/applicationsApi'
import { jobsApi } from '../../lib/jobsApi'
import { experienceLevelToBackend, workModeToBackend } from '../../lib/jobEnums'
import { useAuthStore } from '../../stores/authStore'
import { FilterSidebar } from './FilterSidebar'
import { createDefaultFilterState, MIN_SALARY_LAKHS, type FilterState } from './filterState'
import { ResultCard } from './ResultCard'
import { toDisplayJob, type DisplayJob } from './jobDisplay'

const PAGE_SIZE = 10

type SortOption = 'relevant' | 'newest' | 'salary'

const SORT_LABEL_KEYS: Record<SortOption, string> = {
  relevant: 'jobSearch.sort.relevant',
  newest: 'jobSearch.sort.newest',
  salary: 'jobSearch.sort.salary',
}

export default function JobSearchPage() {
  const { t } = useTranslation('public')
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const initialLocation = searchParams.get('loc') ?? ''

  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)

  const [query, setQuery] = useState(initialQuery)
  const [location, setLocation] = useState(initialLocation)
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery || initialLocation))
  const [filters, setFilters] = useState<FilterState>(createDefaultFilterState())
  const [sortBy, setSortBy] = useState<SortOption>('relevant')
  const [jobsShown, setJobsShown] = useState(PAGE_SIZE)

  const [jobs, setJobs] = useState<DisplayJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())

  // Independent of the search effect below — which jobs the candidate has applied to doesn't
  // change with query/filters/sort, so this only needs to re-run when auth state changes (e.g.
  // logging in mid-session). Always resolves through a promise chain — even the "not a
  // candidate" case — so setAppliedJobIds is only ever called from a .then(), not synchronously
  // in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false
    const applied =
      authStatus === 'authenticated' && user?.role === 'CANDIDATE'
        ? applicationsApi.mine()
        : Promise.resolve([])
    applied
      .then((applications) => {
        if (cancelled) return
        setAppliedJobIds(
          new Set(
            applications
              .filter((application) => application.status !== 'WITHDRAWN')
              .map((application) => application.jobId),
          ),
        )
      })
      .catch(() => {
        // Best-effort — the "already applied" highlight just won't show if this fails.
      })
    return () => {
      cancelled = true
    }
  }, [authStatus, user?.role])

  useEffect(() => {
    if (!hasSearched) return
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
      jobsApi
        .search({
          q: query.trim() || undefined,
          location: location.trim() || undefined,
          level: [...filters.levels].map(experienceLevelToBackend),
          mode: [...filters.modes].map(workModeToBackend),
          minSalaryLakhs:
            filters.minSalaryLakhs > MIN_SALARY_LAKHS ? filters.minSalaryLakhs : undefined,
          sort: sortBy,
        })
        .then((results) => {
          setJobs(results.map(toDisplayJob))
          setJobsShown(PAGE_SIZE)
        })
        .catch((caught) => {
          setError(caught instanceof ApiError ? caught.message : t('jobSearch.errorLoading'))
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [hasSearched, query, location, filters, sortBy, t])

  const visibleJobs = jobs.slice(0, jobsShown)

  function runSearch() {
    if (query.trim() || location.trim()) {
      setHasSearched(true)
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    runSearch()
  }

  function searchTrendingSkill(skill: string) {
    setQuery(skill)
    setHasSearched(true)
  }

  return (
    <main>
      <div className="border-b border-border bg-surface">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-[1280px] flex-wrap gap-2.5 px-6 py-5"
        >
          <label className="flex min-w-[220px] flex-[2] items-center gap-2.5 rounded-control border border-border px-3.5 py-2.5">
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
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('landing.search.jobPlaceholder')}
              className="w-full text-[14.5px] text-ink outline-none"
            />
          </label>
          <label className="flex min-w-[160px] flex-1 items-center gap-2.5 rounded-control border border-border px-3.5 py-2.5">
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
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t('landing.search.locationPlaceholder')}
              className="w-full text-[14.5px] text-ink outline-none"
            />
          </label>
          <button
            type="submit"
            className="min-h-[44px] rounded-control bg-primary px-[26px] text-[14.5px] font-bold text-white hover:bg-primary/90"
          >
            {t('landing.search.submit')}
          </button>
        </form>
      </div>

      {!hasSearched ? (
        <div className="mx-auto max-w-[640px] px-6 py-[88px] text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-tint">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2451D6"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </div>
          <h2 className="mb-2 text-[19px] font-extrabold text-ink">
            {t('jobSearch.startYourSearch.title')}
          </h2>
          <p className="mb-6 text-[14.5px] leading-[1.6] text-slate">
            {t('jobSearch.startYourSearch.description')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TRENDING_SKILLS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => searchTrendingSkill(skill)}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-slate"
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="search:grid-cols-[260px_1fr] mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-6 py-7 pb-16">
          <aside className="search:block hidden">
            <FilterSidebar filters={filters} onChange={setFilters} />
          </aside>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
              <div className="text-[15px] text-slate">
                {loading
                  ? t('jobSearch.searching')
                  : t('jobSearch.showingCount', { count: jobs.length })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] text-fog">{t('jobSearch.sortBy')}</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="rounded-lg border border-border px-2.5 py-2 text-[13.5px] text-ink"
                >
                  {(Object.keys(SORT_LABEL_KEYS) as SortOption[]).map((option) => (
                    <option key={option} value={option}>
                      {t(SORT_LABEL_KEYS[option])}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? (
              <div className="rounded-card border border-danger/30 bg-[#FDECEC] p-10 text-center text-sm text-danger">
                {error}
              </div>
            ) : !loading && jobs.length === 0 ? (
              <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
                {t('jobSearch.noResults')}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {visibleJobs.map((job) => (
                  <ResultCard key={job.id} job={job} applied={appliedJobIds.has(job.id)} />
                ))}
              </div>
            )}

            {jobsShown < jobs.length && (
              <div className="mt-7 flex justify-center">
                <button
                  type="button"
                  onClick={() => setJobsShown((prev) => prev + PAGE_SIZE)}
                  className="rounded-lg border border-border bg-surface px-5 py-2.5 text-[13.5px] font-bold text-ink"
                >
                  {t('jobSearch.showMore')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
