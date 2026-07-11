import { type SubmitEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TRENDING_SKILLS } from '../../mocks/jobs'
import { ApiError } from '../../lib/apiClient'
import { jobsApi } from '../../lib/jobsApi'
import { experienceLevelToBackend, workModeToBackend } from '../../lib/jobEnums'
import { FilterSidebar } from './FilterSidebar'
import { createDefaultFilterState, MIN_SALARY_LAKHS, type FilterState } from './filterState'
import { ResultCard } from './ResultCard'
import { toDisplayJob, type DisplayJob } from './jobDisplay'

const PAGE_SIZE = 6

type SortOption = 'relevant' | 'newest' | 'salary'

const SORT_LABELS: Record<SortOption, string> = {
  relevant: 'Most relevant',
  newest: 'Newest first',
  salary: 'Salary: high to low',
}

export default function JobSearchPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const initialLocation = searchParams.get('loc') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [location, setLocation] = useState(initialLocation)
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery || initialLocation))
  const [filters, setFilters] = useState<FilterState>(createDefaultFilterState())
  const [sortBy, setSortBy] = useState<SortOption>('relevant')
  const [page, setPage] = useState(1)

  const [jobs, setJobs] = useState<DisplayJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          setPage(1)
        })
        .catch((caught) => {
          setError(
            caught instanceof ApiError ? caught.message : 'Something went wrong loading jobs.',
          )
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [hasSearched, query, location, filters, sortBy])

  const pageCount = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageResults = jobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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
              placeholder="Job title, skill, or keyword"
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
              placeholder="City or remote"
              className="w-full text-[14.5px] text-ink outline-none"
            />
          </label>
          <button
            type="submit"
            className="min-h-[44px] rounded-control bg-primary px-[26px] text-[14.5px] font-bold text-white hover:bg-primary/90"
          >
            Search
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
          <h2 className="mb-2 text-[19px] font-extrabold text-ink">Start your search</h2>
          <p className="mb-6 text-[14.5px] leading-[1.6] text-slate">
            Enter a job title, skill, or keyword above — we&rsquo;ll surface matching jobs.
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
                {loading ? (
                  'Searching…'
                ) : (
                  <>
                    Showing <strong className="text-ink">{jobs.length}</strong> jobs for you
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] text-fog">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="rounded-lg border border-border px-2.5 py-2 text-[13.5px] text-ink"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                    <option key={option} value={option}>
                      {SORT_LABELS[option]}
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
                No jobs match your filters. Try clearing some filters or searching a different
                keyword.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {pageResults.map((job) => (
                  <ResultCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {pageCount > 1 && (
              <div className="mt-7 flex justify-center gap-2">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={
                      pageNumber === currentPage
                        ? 'h-9 w-9 rounded-lg border border-border bg-primary text-sm font-semibold text-white'
                        : 'h-9 w-9 rounded-lg border border-border bg-surface text-sm font-semibold text-ink'
                    }
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
