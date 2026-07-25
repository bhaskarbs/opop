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

// Stored mobile numbers are always a bare 10-digit number with no country code (see
// RegisterPage's `^\d{10}$` validation and PhoneInput's fixed "+91" prefix) — wa.me needs the
// country code inlined with no "+", spaces, or punctuation.
function whatsAppLink(contactNumber: string): string {
  return `https://wa.me/91${contactNumber.replace(/\D/g, '')}`
}

// tel: is fine with a leading "+" (unlike wa.me) — dials correctly regardless of the device's
// own locale/dialing convention.
function callLink(contactNumber: string): string {
  return `tel:+91${contactNumber.replace(/\D/g, '')}`
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.44.79 3.06 1.2 4.72 1.2h.01c5.46 0 9.9-4.45 9.9-9.91.01-2.65-1.02-5.14-2.9-7.01A9.87 9.87 0 0 0 12.04 2zm0 18.14h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.26-8.24a8.2 8.2 0 0 1 5.83 2.42 8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.7 8.22-8.25 8.22zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.76-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.25 3.74.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z" />
    </svg>
  )
}

function CallIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CandidateCard({
  candidate,
  revealing,
  revealError,
  canContact,
  onRevealContact,
}: {
  candidate: CandidateSearchSummary
  revealing: boolean
  revealError: string | null
  canContact: boolean
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
          <Link
            to={localize(ROUTES.companyCandidateProfile(candidate.userId))}
            className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink no-underline"
          >
            {t('dashboard.viewProfile')}
          </Link>
          {candidate.contactNumber ? (
            // Replaces the button entirely, same spot — the number itself is the "already
            // revealed" state, kept that way by the backend across visits (see
            // CandidateSearchSummary.contactNumber).
            <span className="flex items-center gap-2 rounded-lg bg-teal-tint px-3.5 py-2 text-[12.5px] font-bold text-teal">
              {candidate.contactNumber}
              <a
                href={whatsAppLink(candidate.contactNumber)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('searchCandidates.openWhatsApp')}
                className="flex h-5 w-5 items-center justify-center text-teal hover:text-teal/80"
              >
                <WhatsAppIcon />
              </a>
              <a
                href={callLink(candidate.contactNumber)}
                aria-label={t('searchCandidates.callCandidate')}
                className="flex h-5 w-5 items-center justify-center text-teal hover:text-teal/80"
              >
                <CallIcon />
              </a>
            </span>
          ) : (
            <button
              type="button"
              disabled={revealing || !canContact}
              onClick={onRevealContact}
              title={canContact ? undefined : t('searchCandidates.contactDisabledHint')}
              className="rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/50"
            >
              {revealing
                ? t('searchCandidates.revealingContact')
                : t('searchCandidates.viewContact')}
            </button>
          )}
        </div>
        {revealError && (
          <p className="max-w-[220px] text-right text-[11.5px] text-danger">{revealError}</p>
        )}
      </div>
    </div>
  )
}

export default function SearchCandidatesPage() {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')

  const [candidates, setCandidates] = useState<CandidateSearchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Search itself has no eligibility gate — only revealing a candidate's contact does (see
  // JobService.requireEligibleToPostJobs for the equivalent job-posting gate on the backend;
  // CandidateSearchService.requireEligibleToContactCandidates mirrors it for reveal-contact).
  const [canContact, setCanContact] = useState(false)

  // Per-candidate reveal-in-flight/error state — keyed by userId, separate from `candidates`
  // itself since a reveal failure shouldn't touch the already-loaded card data.
  const [revealingIds, setRevealingIds] = useState<Set<string>>(new Set())
  const [revealErrors, setRevealErrors] = useState<Record<string, string>>({})

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
        setCandidates((prev) =>
          prev.map((candidate) =>
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
                    revealing={revealingIds.has(candidate.userId)}
                    revealError={revealErrors[candidate.userId] ?? null}
                    canContact={canContact}
                    onRevealContact={() => handleRevealContact(candidate.userId)}
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
