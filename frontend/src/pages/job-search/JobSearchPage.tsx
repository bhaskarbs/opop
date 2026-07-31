import { type SubmitEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Spinner } from '../../components/ui'
import { TRENDING_SKILLS } from '../../mocks/jobs'
import { LOCATION_SUGGESTIONS } from '../../mocks/locations'
import { SKILL_SUGGESTIONS } from '../../mocks/skills'
import { ApiError } from '../../lib/apiClient'
import { applicationsApi } from '../../lib/applicationsApi'
import { jobsApi, jobQueryKeys, type JobSearchParams } from '../../lib/jobsApi'
import { experienceLevelToBackend, workModeToBackend } from '../../lib/jobEnums'
import { savedJobsApi } from '../../lib/savedJobsApi'
import { useAuthStore } from '../../stores/authStore'
import { FilterSidebar } from './FilterSidebar'
import { createDefaultFilterState, MIN_SALARY_LAKHS, type FilterState } from './filterState'
import { ResultCard } from './ResultCard'
import { SearchTagAutocompleteField } from './SearchTagAutocompleteField'
import { toDisplayJob } from './jobDisplay'

const PAGE_SIZE = 10

// Keyword suggestions combine job roles (TRENDING_SKILLS, despite the name) with individual
// technical/soft skills, since candidates search by either — deduplicated in case of overlap.
const KEYWORD_SUGGESTIONS = [...new Set([...TRENDING_SKILLS, ...SKILL_SUGGESTIONS])]

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

  // Each is a set of tags rather than free text — typing a candidate skill/keyword doesn't
  // reach this state at all (it lives inside SearchTagAutocompleteField's own draft state)
  // until it's actually added as a tag, so the search effect below never fires on a keystroke.
  const [skills, setSkills] = useState<string[]>(initialQuery ? [initialQuery] : [])
  const [locations, setLocations] = useState<string[]>(initialLocation ? [initialLocation] : [])
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery || initialLocation))
  const [filters, setFilters] = useState<FilterState>(createDefaultFilterState())
  const [sortBy, setSortBy] = useState<SortOption>('relevant')
  const [jobsShown, setJobsShown] = useState(PAGE_SIZE)

  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())

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

  // Same independence-from-search reasoning as the applied-jobs effect above.
  useEffect(() => {
    let cancelled = false
    const saved =
      authStatus === 'authenticated' && user?.role === 'CANDIDATE'
        ? savedJobsApi.mine()
        : Promise.resolve([])
    saved
      .then((savedJobs) => {
        if (cancelled) return
        setSavedJobIds(new Set(savedJobs.map((job) => job.id)))
      })
      .catch(() => {
        // Best-effort — the bookmark toggle just won't show as filled if this fails.
      })
    return () => {
      cancelled = true
    }
  }, [authStatus, user?.role])

  function toggleSaved(jobId: string) {
    const isSaved = savedJobIds.has(jobId)
    setSavedJobIds((prev) => {
      const next = new Set(prev)
      if (isSaved) next.delete(jobId)
      else next.add(jobId)
      return next
    })
    const request = isSaved ? savedJobsApi.unsave(jobId) : savedJobsApi.save(jobId)
    request.catch(() => {
      // Revert on failure — the toggle above was optimistic.
      setSavedJobIds((prev) => {
        const next = new Set(prev)
        if (isSaved) next.add(jobId)
        else next.delete(jobId)
        return next
      })
    })
  }

  // Debounced separately from the query itself — the query key only changes once every 300ms
  // of typing settles, so TanStack Query never even considers firing a request per keystroke.
  const [searchQueryParams, setSearchQueryParams] = useState<JobSearchParams | null>(null)

  useEffect(() => {
    if (!hasSearched) return
    const timeoutId = setTimeout(() => {
      setSearchQueryParams({
        q: skills.length > 0 ? skills : undefined,
        location: locations.length > 0 ? locations : undefined,
        level: [...filters.levels].map(experienceLevelToBackend),
        mode: [...filters.modes].map(workModeToBackend),
        minSalaryLakhs:
          filters.minSalaryLakhs > MIN_SALARY_LAKHS ? filters.minSalaryLakhs : undefined,
        sort: sortBy,
      })
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [hasSearched, skills, locations, filters, sortBy])

  // Resets the "show more" pagination whenever a new search actually runs — including when it's
  // served instantly from the query cache (see lib/queryClient.ts), so re-running a search you
  // already made still lands back on page 1 of its (cached) results. Adjusted during render
  // (React's documented pattern for "reset state when a value changes") rather than in an
  // effect, since setting state synchronously inside an effect body causes an extra render.
  const [prevSearchQueryParams, setPrevSearchQueryParams] = useState(searchQueryParams)
  if (searchQueryParams !== prevSearchQueryParams) {
    setPrevSearchQueryParams(searchQueryParams)
    setJobsShown(PAGE_SIZE)
  }

  const searchQuery = useQuery({
    queryKey: jobQueryKeys.search(searchQueryParams ?? {}),
    queryFn: () => jobsApi.search(searchQueryParams ?? {}),
    enabled: searchQueryParams !== null,
  })

  const jobs = (searchQuery.data ?? []).map(toDisplayJob)
  const loading = searchQuery.isFetching
  const error = searchQuery.isError
    ? searchQuery.error instanceof ApiError
      ? searchQuery.error.message
      : t('jobSearch.errorLoading')
    : null

  const visibleJobs = jobs.slice(0, jobsShown)

  function handleSkillsChange(next: string[]) {
    setSkills(next)
    if (next.length > 0 || locations.length > 0) setHasSearched(true)
  }

  function handleLocationsChange(next: string[]) {
    setLocations(next)
    if (skills.length > 0 || next.length > 0) setHasSearched(true)
  }

  function runSearch() {
    if (skills.length > 0 || locations.length > 0) {
      setHasSearched(true)
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    runSearch()
  }

  function searchTrendingSkill(skill: string) {
    setSkills((prev) => (prev.includes(skill) ? prev : [...prev, skill]))
    setHasSearched(true)
  }

  return (
    <main>
      <div className="border-b border-border bg-surface">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-[1280px] flex-wrap gap-2.5 px-6 py-5"
        >
          <SearchTagAutocompleteField
            values={skills}
            onChange={handleSkillsChange}
            suggestions={KEYWORD_SUGGESTIONS}
            placeholder={t('jobSearch.skillsPlaceholder')}
            removeLabel={(value) => t('jobSearch.removeSkill', { value })}
            containerClassName="min-w-[220px] flex-[2]"
            icon={
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
            }
          />
          <SearchTagAutocompleteField
            values={locations}
            onChange={handleLocationsChange}
            suggestions={LOCATION_SUGGESTIONS}
            placeholder={t('jobSearch.locationsPlaceholder')}
            removeLabel={(value) => t('jobSearch.removeLocation', { value })}
            containerClassName="min-w-[160px] flex-1"
            icon={
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
            }
          />
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
              <div className="flex items-center justify-center gap-2 text-[15px] text-slate">
                {loading ? (
                  <>
                    <Spinner className="h-5 w-5 text-primary" />
                    <span className="text-lg font-medium">{t('jobSearch.searching')}</span>
                  </>
                ) : (
                  t('jobSearch.showingCount', { count: jobs.length })
                )}
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
                  <ResultCard
                    key={job.id}
                    job={job}
                    applied={appliedJobIds.has(job.id)}
                    saved={savedJobIds.has(job.id)}
                    onToggleSave={
                      authStatus === 'authenticated' && user?.role === 'CANDIDATE'
                        ? () => toggleSaved(job.id)
                        : undefined
                    }
                  />
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
