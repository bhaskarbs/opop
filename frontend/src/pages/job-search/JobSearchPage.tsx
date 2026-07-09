import { type SubmitEvent, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { opportunities, TRENDING_SKILLS, type Opportunity } from '../../mocks/jobs'
import { FilterSidebar } from './FilterSidebar'
import { createDefaultFilterState, type FilterState } from './filterState'
import { ResultCard } from './ResultCard'

const PAGE_SIZE = 6

type SortOption = 'relevant' | 'newest' | 'salary' | 'rating'

const SORT_LABELS: Record<SortOption, string> = {
  relevant: 'Most relevant',
  newest: 'Newest first',
  salary: 'Salary: high to low',
  rating: 'Company rating',
}

function matchesQuery(item: Opportunity, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (item.type === 'job') {
    return (
      item.title.toLowerCase().includes(q) ||
      item.company.toLowerCase().includes(q) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  }
  if (item.type === 'partnership') {
    return item.title.toLowerCase().includes(q) || item.company.toLowerCase().includes(q)
  }
  return item.title.toLowerCase().includes(q) || item.org.toLowerCase().includes(q)
}

function matchesLocation(item: Opportunity, location: string) {
  const loc = location.trim().toLowerCase()
  if (!loc) return true
  if (item.type === 'job' || item.type === 'partnership') {
    return item.location.toLowerCase().includes(loc) || item.mode.toLowerCase().includes(loc)
  }
  return true
}

function matchesFilters(item: Opportunity, filters: FilterState) {
  if (filters.types.size > 0 && !filters.types.has(item.type)) return false
  if (filters.levels.size > 0 && item.type === 'job' && !filters.levels.has(item.level))
    return false
  if (
    filters.modes.size > 0 &&
    (item.type === 'job' || item.type === 'partnership') &&
    !filters.modes.has(item.mode)
  ) {
    return false
  }
  if (
    filters.minSalaryLakhs > 3 &&
    item.type === 'job' &&
    item.salaryMaxLakhs < filters.minSalaryLakhs
  ) {
    return false
  }
  return true
}

function sortOpportunities(items: Opportunity[], sortBy: SortOption): Opportunity[] {
  if (sortBy === 'relevant') return items
  const sorted = [...items]
  if (sortBy === 'newest') sorted.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo)
  if (sortBy === 'salary') {
    sorted.sort((a, b) => {
      const aSalary = a.type === 'job' ? a.salaryMaxLakhs : -1
      const bSalary = b.type === 'job' ? b.salaryMaxLakhs : -1
      return bSalary - aSalary
    })
  }
  if (sortBy === 'rating') sorted.sort((a, b) => b.rating - a.rating)
  return sorted
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

  const filteredResults = useMemo(() => {
    const filtered = opportunities.filter(
      (item) =>
        matchesQuery(item, query) &&
        matchesLocation(item, location) &&
        matchesFilters(item, filters),
    )
    return sortOpportunities(filtered, sortBy)
  }, [query, location, filters, sortBy])

  const typeCounts = useMemo(() => {
    return opportunities.reduce(
      (counts, item) => {
        counts[item.type] += 1
        return counts
      },
      { job: 0, partnership: 0, community: 0 } as Record<Opportunity['type'], number>,
    )
  }, [])

  const pageCount = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageResults = filteredResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function runSearch() {
    if (query.trim() || location.trim()) {
      setHasSearched(true)
      setPage(1)
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    runSearch()
  }

  function searchTrendingSkill(skill: string) {
    setQuery(skill)
    setHasSearched(true)
    setPage(1)
  }

  function handleFilterChange(next: FilterState) {
    setFilters(next)
    setPage(1)
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
            Enter a job title, skill, or keyword above — we'll surface matching jobs, startup
            partnerships, and community roles together.
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
            <FilterSidebar
              filters={filters}
              onChange={handleFilterChange}
              typeCounts={typeCounts}
            />
          </aside>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
              <div className="text-[15px] text-slate">
                Showing <strong className="text-ink">{filteredResults.length}</strong> jobs,
                partnerships & community roles for you
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

            {filteredResults.length === 0 ? (
              <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
                No results match your filters. Try clearing some filters or searching a different
                keyword.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {pageResults.map((item) => (
                  <ResultCard key={item.id} opportunity={item} />
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
