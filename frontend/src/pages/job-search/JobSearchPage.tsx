import { type SubmitEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Spinner } from '../../components/ui'
import { TRENDING_SKILLS } from '../../mocks/jobs'
import { LOCATION_SUGGESTIONS } from '../../mocks/locations'
import { SKILL_SUGGESTIONS } from '../../mocks/skills'
import { ApiError } from '../../lib/apiClient'
import { candidateApi } from '../../lib/candidateApi'
import { jobsApi, jobQueryKeys, type JobSearchParams } from '../../lib/jobsApi'
import {
  experienceLevelFromBackend,
  experienceLevelToBackend,
  workModeToBackend,
} from '../../lib/jobEnums'
import { savedJobsApi } from '../../lib/savedJobsApi'
import { useAuthStore } from '../../stores/authStore'
import { useApplicationsStore } from '../../stores/applicationsStore'
import { useSavedJobsStore } from '../../stores/savedJobsStore'
import { FilterSidebar } from './FilterSidebar'
import { createDefaultFilterState, MIN_SALARY_LAKHS, type FilterState } from './filterState'
import { ResultCard } from './ResultCard'
import { SearchTagAutocompleteField } from './SearchTagAutocompleteField'
import { toDisplayJob } from './jobDisplay'

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
  const [page, setPage] = useState(1)

  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())

  // Independent of the search effect below — which jobs the candidate has applied to doesn't
  // change with query/filters/sort, so this only needs to re-run when auth state changes (e.g.
  // logging in mid-session). Goes through applicationsStore's cache-first fetch rather than
  // calling applicationsApi.mine() directly, so this doesn't trigger a network request if
  // another candidate page already loaded the list this session (see applicationsStore.ts).
  // Always resolves through a promise chain — even the "not a candidate" case — so
  // setAppliedJobIds is only ever called from a .then(), not synchronously in the effect body
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false
    const applied =
      authStatus === 'authenticated' && user?.role === 'CANDIDATE'
        ? useApplicationsStore.getState().fetchApplications()
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

  // Same independence-from-search reasoning as the applied-jobs effect above, and same
  // cache-first store (see savedJobsStore.ts) in place of a direct savedJobsApi.mine() call.
  useEffect(() => {
    let cancelled = false
    const saved =
      authStatus === 'authenticated' && user?.role === 'CANDIDATE'
        ? useSavedJobsStore.getState().fetchSavedJobs()
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

  // Gives a logged-in candidate a personalized default view instead of the generic "start your
  // search" prompt: try their profile skills + experience level first, fall back to skills
  // alone if that's too narrow, and fall back to today's plain empty state (no auto-search) if
  // even that finds nothing — so a sparse or unusual profile never dead-ends into a "no results"
  // screen. Runs once per visit (personalizationAttempted) and bails immediately if the
  // candidate starts their own search first (hasSearched), so it never clobbers a real search.
  const [personalizationAttempted, setPersonalizationAttempted] = useState(false)

  useEffect(() => {
    if (hasSearched || personalizationAttempted) return
    if (!(authStatus === 'authenticated' && user?.role === 'CANDIDATE')) return
    let cancelled = false
    candidateApi
      .getProfile()
      .then(async (profile) => {
        if (cancelled || profile.skills.length === 0) return
        const candidateSkills = profile.skills
        const level = profile.experienceLevel
        if (level) {
          const withLevel = await jobsApi.search({ q: candidateSkills, level: [level] })
          if (cancelled) return
          if (withLevel.jobs.length > 0) {
            setSkills(candidateSkills)
            setFilters({
              ...createDefaultFilterState(),
              levels: new Set([experienceLevelFromBackend(level)]),
            })
            setHasSearched(true)
            return
          }
        }
        const skillsOnly = await jobsApi.search({ q: candidateSkills })
        if (cancelled) return
        if (skillsOnly.jobs.length > 0) {
          setSkills(candidateSkills)
          setHasSearched(true)
        }
      })
      .catch(() => {
        // Best-effort — falls through to the plain empty state if the profile/search calls fail.
      })
      .finally(() => {
        if (!cancelled) setPersonalizationAttempted(true)
      })
    return () => {
      cancelled = true
    }
  }, [authStatus, user?.role, hasSearched, personalizationAttempted])

  function toggleSaved(jobId: string) {
    const isSaved = savedJobIds.has(jobId)
    setSavedJobIds((prev) => {
      const next = new Set(prev)
      if (isSaved) next.delete(jobId)
      else next.add(jobId)
      return next
    })
    const request = isSaved ? savedJobsApi.unsave(jobId) : savedJobsApi.save(jobId)
    request
      .then(() => {
        // Refreshes the shared cache in the background so SavedJobsPage (or coming back to
        // this page later) sees the change without needing its own extra round trip — see
        // savedJobsStore's comment on why this force-refetches rather than patching in place.
        useSavedJobsStore.getState().fetchSavedJobs(true)
      })
      .catch(() => {
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

  // Resets to page 1 whenever a new search actually runs — including when it's served instantly
  // from the query cache (see lib/queryClient.ts), so re-running a search you already made still
  // lands back on its first page. Adjusted during render (React's documented pattern for "reset
  // state when a value changes") rather than in an effect, since setting state synchronously
  // inside an effect body causes an extra render.
  const [prevSearchQueryParams, setPrevSearchQueryParams] = useState(searchQueryParams)
  if (searchQueryParams !== prevSearchQueryParams) {
    setPrevSearchQueryParams(searchQueryParams)
    setPage(1)
  }

  // page only ever added to the request once it's past the first one (0-indexed on the
  // backend) — same minimal-params convention as the debounced fields above, so a first-page
  // search still shares a query-cache entry with e.g. JobDetailPage's identically-shaped
  // "similar jobs" fetch instead of missing it over an inconsequential {page: 0}.
  const effectiveSearchParams: JobSearchParams | null = searchQueryParams && {
    ...searchQueryParams,
    page: page > 1 ? page - 1 : undefined,
  }

  const searchQuery = useQuery({
    queryKey: jobQueryKeys.search(effectiveSearchParams ?? {}),
    queryFn: () => jobsApi.search(effectiveSearchParams ?? {}),
    enabled: effectiveSearchParams !== null,
  })

  const jobs = (searchQuery.data?.jobs ?? []).map(toDisplayJob)
  const totalCount = searchQuery.data?.totalCount ?? 0
  const totalPages = searchQuery.data?.totalPages ?? 0
  const loading = searchQuery.isFetching
  const error = searchQuery.isError
    ? searchQuery.error instanceof ApiError
      ? searchQuery.error.message
      : t('jobSearch.errorLoading')
    : null

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
                  t('jobSearch.showingCount', { count: totalCount })
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
                {jobs.map((job) => (
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

            {totalPages > 1 && (
              <div className="mt-7 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('jobSearch.previousPage')}
                </button>
                <span className="text-[13px] text-slate">
                  {t('jobSearch.pageLabel', { page, total: totalPages })}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('jobSearch.nextPage')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
