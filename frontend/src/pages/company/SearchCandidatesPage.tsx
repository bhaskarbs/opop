import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ApiError } from '../../lib/apiClient'
import { companyApi, type CandidateSearchSummary } from '../../lib/companyApi'
import { ROUTES } from '../../routes/paths'

const AVATAR_COLOR_CLASSES = ['bg-primary', 'bg-teal', 'bg-amber']

function colorForName(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]
}

function CandidateCard({
  candidate,
  contacted,
  canContact,
  onContact,
}: {
  candidate: CandidateSearchSummary
  contacted: boolean
  canContact: boolean
  onContact: () => void
}) {
  const { t } = useTranslation('company')
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
          <div className="text-[15px] font-bold text-ink">{candidate.fullName}</div>
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
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink"
          >
            {t('dashboard.viewProfile')}
          </button>
          <button
            type="button"
            disabled={contacted || !canContact}
            onClick={onContact}
            title={canContact ? undefined : t('searchCandidates.contactDisabledHint')}
            className="rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/50"
          >
            {contacted ? t('searchCandidates.contacted') : t('searchCandidates.contact')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SearchCandidatesPage() {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set())

  const [candidates, setCandidates] = useState<CandidateSearchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Search itself has no eligibility gate — only contacting a candidate does (see
  // JobService.requireEligibleToPostJobs for the equivalent job-posting gate on the backend;
  // contacting a candidate has no backend action to gate yet, so this is enforced client-side).
  const [canContact, setCanContact] = useState(false)

  useEffect(() => {
    companyApi
      .getProfile()
      .then((profile) =>
        setCanContact(profile.profileComplete && profile.verificationStatus === 'VERIFIED'),
      )
      .catch(() => setCanContact(false))
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
      companyApi
        .searchCandidates({ q: query.trim() || undefined, location: location.trim() || undefined })
        .then(setCandidates)
        .catch((caught) => {
          setError(caught instanceof ApiError ? caught.message : t('searchCandidates.loadError'))
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [query, location, t])

  return (
    <main>
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1280px] flex-wrap gap-2.5 px-6 py-5">
          <label className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-control border border-border px-3.5 py-2.5">
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchCandidates.searchPlaceholder')}
              className="w-full text-[14.5px] text-ink outline-none"
            />
          </label>
          <button
            type="button"
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
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t('landing.search.locationPlaceholder', { ns: 'public' })}
                className="w-full rounded-lg border border-border px-2.5 py-2 text-[13.5px] text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
            </div>
          </div>
        </aside>

        <div>
          {!canContact && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#FCE3B8] bg-amber-tint px-4 py-3.5 text-[13px] text-[#8A5A0F]">
              <span>{t('searchCandidates.contactDisabledHint')}</span>
              <Link
                to={localize(ROUTES.companyProfile)}
                className="font-bold whitespace-nowrap text-primary no-underline"
              >
                {t('dashboard.completeProfileCta')}
              </Link>
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
              {error}
            </div>
          )}
          {loading ? (
            <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
              {t('searchCandidates.loading')}
            </div>
          ) : (
            <>
              <div className="mb-4 text-[15px] text-slate">
                {t('searchCandidates.showingCount', { count: candidates.length })}
              </div>
              <div className="flex flex-col gap-3">
                {candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.userId}
                    candidate={candidate}
                    contacted={contactedIds.has(candidate.userId)}
                    canContact={canContact}
                    onContact={() => setContactedIds((prev) => new Set(prev).add(candidate.userId))}
                  />
                ))}
                {candidates.length === 0 && (
                  <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
                    {t('searchCandidates.noResults')}
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
