import { type SubmitEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
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
import { createDefaultFilterState, type FilterState } from './filterState'
import { ResultCard } from './ResultCard'
import { SearchField } from './SearchField'
import { toDisplayJob } from './jobDisplay'

// Keyword suggestions combine job roles (TRENDING_SKILLS, despite the name) with individual
// technical/soft skills, since candidates search by either — deduplicated in case of overlap.
const KEYWORD_SUGGESTIONS = [...new Set([...TRENDING_SKILLS, ...SKILL_SUGGESTIONS])]

// The empty state's starter chips — a small curated set (the mockup showed 5), not the full
// suggestion list, so first-time visitors see a gentle prompt instead of a wall of tags.
const POPULAR_SEARCHES = [
  'Frontend Developer',
  'Data Analyst',
  'Customer Support',
  'Sales',
  'Content Writing',
]

type SortOption = 'relevant' | 'newest' | 'salary'

const SORT_LABEL_KEYS: Record<SortOption, string> = {
  relevant: 'jobSearch.sort.relevant',
  newest: 'jobSearch.sort.newest',
  salary: 'jobSearch.sort.salary',
}

export default function JobSearchPage() {
  const { t } = useTranslation('public')
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const initialLocation = searchParams.get('loc') ?? ''
  // Set by LandingPage's search form when submitted with both fields blank — router state
  // rather than a query param, so it doesn't linger if this page is later reloaded/shared.
  const routerLocation = useLocation()
  const triggeredEmptySearch = Boolean(
    (routerLocation.state as { triggeredSearch?: boolean } | null)?.triggeredSearch,
  )

  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)

  // Keyword and location are plain strings — what the user sees in the labeled search fields
  // is exactly what gets searched when they press Search. (The backend still receives arrays:
  // keyword is comma-split on submit, so "react, node" stays a multi-keyword search without
  // the tag-input ceremony.)
  const [keyword, setKeyword] = useState(initialQuery)
  const [location, setLocation] = useState(initialLocation)
  const [hasSearched, setHasSearched] = useState(
    Boolean(initialQuery || initialLocation || triggeredEmptySearch),
  )
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
            setKeyword(candidateSkills.join(', '))
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
          setKeyword(candidateSkills.join(', '))
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
        q: keyword
          ? keyword
              .split(',')
              .map((part) => part.trim())
              .filter(Boolean)
          : undefined,
        location: location.trim() ? [location.trim()] : undefined,
        level: [...filters.levels].map(experienceLevelToBackend),
        mode: [...filters.modes].map(workModeToBackend),
        sort: sortBy,
      })
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [hasSearched, keyword, location, filters, sortBy])

  // Keeps the URL's ?q=/&loc= in sync with the current search (mirrors what's read into
  // initialQuery/initialLocation above) — otherwise the browser history entry a candidate
  // lands back on via BackButton's navigate(-1) from a job detail page still has whatever
  // (or no) query string they originally arrived on, silently dropping the search they'd
  // actually run since. replace: true so typing doesn't spam new history entries of its own —
  // only the single entry for this page visit is kept up to date.
  useEffect(() => {
    if (!hasSearched) return
    const next = new URLSearchParams()
    if (keyword.trim()) next.set('q', keyword.trim())
    if (location.trim()) next.set('loc', location.trim())
    setSearchParams(next, { replace: true })
    // setSearchParams is stable per react-router-dom's contract — omitted so this doesn't
    // over-trigger; including it would just add a no-op dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSearched, keyword, location])

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

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    // Search is search: clicking the button always runs one, even with both fields blank
    // (which lists every job, same as LandingPage's empty-submit behavior). Predictable beats
    // conditional here — the old tag version only searched when at least one tag existed,
    // which is exactly the kind of silent no-op that confuses people.
    setHasSearched(true)
  }

  function searchPopularTerm(term: string) {
    setKeyword(term)
    setHasSearched(true)
  }

  return (
    <main>
      {/* Search hero — the fields and button are the centered, unmissable focus of the page.
          Full hero (title + subtitle + popular searches) before the first search; once results
          exist it compacts to just the centered search panel so results get the room. */}
      <section
        className={`border-b border-border bg-gradient-to-b from-primary-tint to-page px-6 ${
          hasSearched ? 'py-6' : 'pt-14 pb-12'
        }`}
      >
        <div className="mx-auto max-w-[880px]">
          {!hasSearched && (
            <div className="mb-8 text-center">
              <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-0.02em] text-ink">
                {t('jobSearch.heroTitle')}
              </h1>
              <p className="mx-auto mt-3 max-w-[560px] text-base leading-[1.6] text-slate">
                {t('jobSearch.heroSubtitle')}
              </p>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="rounded-card border border-border bg-surface p-3 shadow-[0_8px_24px_rgba(20,24,31,0.08)]"
          >
            <div className="flex flex-col gap-3 search:flex-row search:items-end">
              <SearchField
                inputId="job-search-keyword"
                label={t('jobSearch.whatLabel')}
                value={keyword}
                onChange={setKeyword}
                suggestions={KEYWORD_SUGGESTIONS}
                placeholder={t('jobSearch.skillsPlaceholder')}
                containerClassName="search:flex-[2]"
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
              <SearchField
                inputId="job-search-location"
                label={t('jobSearch.whereLabel')}
                value={location}
                onChange={setLocation}
                suggestions={LOCATION_SUGGESTIONS}
                placeholder={t('jobSearch.locationsPlaceholder')}
                containerClassName="search:flex-1"
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
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-control bg-primary px-7 text-[15px] font-bold text-white hover:bg-primary/90 search:w-auto"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                {t('landing.search.submit')}
              </button>
            </div>
          </form>
          {!hasSearched && (
            <div className="mt-6 text-center">
              <div className="mb-2.5 text-[12px] font-bold tracking-[0.06em] text-fog uppercase">
                {t('jobSearch.popularSearches')}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => searchPopularTerm(term)}
                    className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-slate hover:border-primary/40 hover:text-primary"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {hasSearched && (
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
