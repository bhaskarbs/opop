import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ContactRevealControl } from '../../components/company/ContactRevealControl'
import { LoadingState } from '../../components/ui'
import { useContactEligibility } from '../../hooks/useContactEligibility'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ApiError } from '../../lib/apiClient'
import {
  companyApi,
  candidateQueryKeys,
  type CandidateSearchParams,
  type CandidateSearchSummary,
  type CandidateSortOption,
} from '../../lib/companyApi'
import { LOCATION_SUGGESTIONS } from '../../mocks/locations'
import { ROUTES } from '../../routes/paths'
// Same tag-input-with-autocomplete component the /jobs search bar uses for its location filter
// (see JobSearchPage) — reused here rather than re-implemented, so the interaction (multi-city
// tags, arrow-key nav, backspace-to-remove-last) matches exactly.
import { SearchTagAutocompleteField } from '../job-search/SearchTagAutocompleteField'

const SORT_LABEL_KEYS: Record<CandidateSortOption, string> = {
  relevant: 'searchCandidates.sort.relevant',
  newest: 'searchCandidates.sort.newest',
  name: 'searchCandidates.sort.name',
  contacted: 'searchCandidates.sort.contacted',
  recentLogin: 'searchCandidates.sort.recentLogin',
}

const AVATAR_COLOR_CLASSES = ['bg-primary', 'bg-teal', 'bg-amber']

const SUGGESTIONS_LIMIT = 8

// Simple autocomplete: suggests distinct titles/skills drawn from the currently loaded search
// results (no separate endpoint or dataset — just what's already on screen) that contain
// whatever's been typed so far.
function buildSuggestions(candidates: CandidateSearchSummary[], query: string): string[] {
  const trimmedQuery = query.trim().toLowerCase()
  if (!trimmedQuery) return []
  const values = candidates.flatMap((candidate) =>
    [candidate.title, ...candidate.skills].filter((value): value is string => !!value),
  )
  const seen = new Set<string>()
  const suggestions: string[] = []
  for (const value of values) {
    const lower = value.toLowerCase()
    if (lower === trimmedQuery || !lower.includes(trimmedQuery) || seen.has(lower)) continue
    seen.add(lower)
    suggestions.push(value)
    if (suggestions.length === SUGGESTIONS_LIMIT) break
  }
  return suggestions
}

function colorForName(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]
}

function CandidateCard({
  candidate,
  revealing,
  revealError,
  canContact,
  contactHint,
  onRevealContact,
}: {
  candidate: CandidateSearchSummary
  revealing: boolean
  revealError: string | null
  canContact: boolean
  contactHint: string | null
  onRevealContact: () => void
}) {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const meta = [candidate.title, candidate.location].filter(Boolean).join(' · ')
  return (
    <div className="flex flex-wrap justify-between gap-4 rounded-card border border-border bg-surface px-5 py-[18px]">
      <div className="flex gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white ${colorForName(candidate.fullName)}`}
        >
          {candidate.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-ink">{candidate.fullName}</span>
            {candidate.isFeatured && (
              <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-primary">
                {t('searchCandidates.featuredBadge')}
              </span>
            )}
            {candidate.isPlus && (
              <span className="rounded-full bg-amber-tint px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-amber">
                {t('searchCandidates.plusBadge')}
              </span>
            )}
          </div>
          {meta && <div className="mt-0.5 text-[13px] text-slate">{meta}</div>}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
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
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          {canContact ? (
            <Link
              to={localize(ROUTES.companyCandidateProfile(candidate.userId))}
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
            contactNumber={candidate.contactNumber}
            revealing={revealing}
            canContact={canContact}
            hint={contactHint}
            onReveal={onRevealContact}
          />
        </div>
        {revealError && (
          <p className="max-w-[220px] text-right text-[11.5px] text-danger">{revealError}</p>
        )}
      </div>
    </div>
  )
}

const PAGE_SIZE = 10

export default function SearchCandidatesPage() {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const [query, setQuery] = useState('')
  // What's actually sent to the backend — only updated on Enter/submit/picking a suggestion, so
  // typing alone never fires a search (see the effect below, which depends on this rather than
  // on `query`).
  const [submittedQuery, setSubmittedQuery] = useState('')
  // A set of tags rather than free text — same pattern as JobSearchPage's `locations` state
  // (see SearchTagAutocompleteField), so typing a city doesn't reach this state at all until
  // it's actually added as a tag, and the search effect below only ever fires on a committed
  // change, never on a keystroke.
  const [locations, setLocations] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<CandidateSortOption>('relevant')
  const [page, setPage] = useState(1)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)

  const queryClient = useQueryClient()
  // Search itself has no eligibility gate — only "View contact"/"View profile" do (complete +
  // verified company profile, paid plan, contact-reveal quota remaining this billing period —
  // see CandidateSearchService.requireEligibleToContactCandidates, which enforces the same
  // combination server-side).
  const { canContact, hint: contactHint, reason: contactReason, quota } = useContactEligibility()

  // Per-candidate reveal-in-flight/error state — keyed by userId, separate from `candidates`
  // itself since a reveal failure shouldn't touch the already-loaded card data.
  const [revealingIds, setRevealingIds] = useState<Set<string>>(new Set())
  const [revealErrors, setRevealErrors] = useState<Record<string, string>>({})

  // Fills the box and (immediately) runs the search with that exact term — used whether the
  // suggestion was picked with the mouse or confirmed via the keyboard (see the input's
  // onKeyDown below).
  function submitSearch(nextQuery: string = query) {
    setQuery(nextQuery)
    setSubmittedQuery(nextQuery)
    setSuggestionsOpen(false)
    setActiveSuggestionIndex(-1)
  }

  // Debounced separately from the query itself — same reasoning as JobSearchPage — so the query
  // key only changes once every 300ms of typing/filter changes settle.
  const [searchQueryParams, setSearchQueryParams] = useState<CandidateSearchParams>({})

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQueryParams({
        q: submittedQuery.trim() || undefined,
        location: locations.length > 0 ? locations : undefined,
        sort: sortBy,
      })
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [submittedQuery, locations, sortBy])

  // Resets pagination whenever a new search actually runs — including when served instantly
  // from the query cache. Adjusted during render (see JobSearchPage for the same pattern)
  // rather than in an effect, to avoid an extra render from a synchronous effect setState.
  const [prevSearchQueryParams, setPrevSearchQueryParams] = useState(searchQueryParams)
  if (searchQueryParams !== prevSearchQueryParams) {
    setPrevSearchQueryParams(searchQueryParams)
    setPage(1)
  }

  const searchQuery = useQuery({
    queryKey: candidateQueryKeys.search(searchQueryParams),
    queryFn: () => companyApi.searchCandidates(searchQueryParams),
  })

  const candidates = searchQuery.data ?? []
  const loading = searchQuery.isFetching
  const error = searchQuery.isError
    ? searchQuery.error instanceof ApiError
      ? searchQuery.error.message
      : t('searchCandidates.loadError')
    : null

  function handleRevealContact(userId: string) {
    setRevealingIds((prev) => new Set(prev).add(userId))
    setRevealErrors((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
    companyApi
      .revealCandidateContact(userId)
      .then((response) => {
        queryClient.setQueryData(
          candidateQueryKeys.search(searchQueryParams),
          (prev: CandidateSearchSummary[] | undefined) =>
            prev?.map((candidate) =>
              candidate.userId === userId
                ? { ...candidate, contactNumber: response.contactNumber }
                : candidate,
            ),
        )
      })
      .catch((caught) => {
        setRevealErrors((prev) => ({
          ...prev,
          [userId]: caught instanceof ApiError ? caught.message : t('searchCandidates.revealError'),
        }))
      })
      .finally(() => {
        setRevealingIds((prev) => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      })
  }

  const pageCount = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleCandidates = candidates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const suggestions = buildSuggestions(candidates, query)

  return (
    <main>
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1280px] flex-wrap gap-2.5 px-6 py-5">
          <div
            className="relative min-w-[220px] flex-1"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setSuggestionsOpen(false)
                setActiveSuggestionIndex(-1)
              }
            }}
          >
            <label className="flex items-center gap-2.5 rounded-control border border-border px-3.5 py-2.5">
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
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSuggestionsOpen(true)
                  setActiveSuggestionIndex(-1)
                }}
                onFocus={() => setSuggestionsOpen(true)}
                onKeyDown={(event) => {
                  if (!suggestionsOpen || suggestions.length === 0) {
                    if (event.key === 'Enter') submitSearch()
                    return
                  }
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length)
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    setActiveSuggestionIndex((prev) =>
                      prev <= 0 ? suggestions.length - 1 : prev - 1,
                    )
                  } else if (event.key === 'Enter') {
                    event.preventDefault()
                    submitSearch(
                      activeSuggestionIndex >= 0 ? suggestions[activeSuggestionIndex] : query,
                    )
                  } else if (event.key === 'Escape') {
                    setSuggestionsOpen(false)
                    setActiveSuggestionIndex(-1)
                  }
                }}
                placeholder={t('searchCandidates.searchPlaceholder')}
                className="w-full text-[14.5px] text-ink outline-none"
              />
            </label>
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="absolute top-full right-0 left-0 z-10 mt-1.5 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                {suggestions.map((value, index) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => submitSearch(value)}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    className={`block w-full truncate px-3.5 py-2 text-left text-[13.5px] text-ink ${
                      index === activeSuggestionIndex ? 'bg-neutral-tint' : 'hover:bg-neutral-tint'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => submitSearch()}
            className="min-h-[44px] rounded-control bg-ink px-[26px] text-[14.5px] font-bold text-white"
          >
            {t('landing.search.submit', { ns: 'public' })}
          </button>
        </div>
      </div>

      <div className="search:grid-cols-[260px_1fr] mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-6 py-7 pb-16">
        <aside className="search:block hidden">
          <div className="sticky top-[88px] rounded-card border border-border bg-surface p-5">
            <div className="mb-4 text-[15px] font-bold text-ink">{t('public:filters.heading')}</div>
            <div>
              <div className="mb-2.5 text-[13px] font-bold text-ink">
                {t('searchCandidates.location')}
              </div>
              <SearchTagAutocompleteField
                values={locations}
                onChange={setLocations}
                suggestions={LOCATION_SUGGESTIONS}
                placeholder={t('searchCandidates.locationsPlaceholder')}
                removeLabel={(value) => t('searchCandidates.removeLocation', { value })}
                containerClassName="w-full"
                icon={
                  <svg
                    width="15"
                    height="15"
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
            </div>
          </div>
        </aside>

        <div>
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
            <div className="rounded-card border border-border bg-surface p-10">
              <LoadingState message={t('searchCandidates.loading')} />
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
                <div className="text-[15px] text-slate">
                  {t('searchCandidates.showingCount', { count: candidates.length })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] text-fog">{t('searchCandidates.sortBy')}</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as CandidateSortOption)}
                    className="rounded-lg border border-border px-2.5 py-2 text-[13.5px] text-ink"
                  >
                    {(Object.keys(SORT_LABEL_KEYS) as CandidateSortOption[]).map((option) => (
                      <option key={option} value={option}>
                        {t(SORT_LABEL_KEYS[option])}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {visibleCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.userId}
                    candidate={candidate}
                    revealing={revealingIds.has(candidate.userId)}
                    revealError={revealErrors[candidate.userId] ?? null}
                    canContact={canContact}
                    contactHint={contactHint}
                    onRevealContact={() => handleRevealContact(candidate.userId)}
                  />
                ))}
                {candidates.length === 0 && (
                  <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
                    {t('searchCandidates.noResults')}
                  </div>
                )}
                {pageCount > 1 && (
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t('searchCandidates.previousPage')}
                    </button>
                    <span className="text-[13px] text-slate">
                      {t('searchCandidates.pageLabel', { page: currentPage, total: pageCount })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                      disabled={currentPage === pageCount}
                      className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t('searchCandidates.nextPage')}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
