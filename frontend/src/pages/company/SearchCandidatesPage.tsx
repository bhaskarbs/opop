import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { candidates, type Candidate, type CandidateIntent } from '../../mocks/candidates'

const INTENT_OPTIONS: CandidateIntent[] = [
  'Open to jobs',
  'Open to partnership',
  'Open to community roles',
]
const EXPERIENCE_BUCKETS = ['0-2 yrs', '3-5 yrs', '5-8 yrs', '8+ yrs'] as const
type ExperienceBucket = (typeof EXPERIENCE_BUCKETS)[number]

const INTENT_BADGE_CLASS: Record<CandidateIntent, string> = {
  'Open to jobs': 'bg-primary-tint text-primary',
  'Open to partnership': 'bg-amber-tint text-amber',
  'Open to community roles': 'bg-teal-tint text-teal',
}

// Rendered text only — the literal intent/bucket values stay as the underlying data (Record
// keys, Set membership, comparisons against mock candidate data).
const INTENT_LABEL_KEYS: Record<CandidateIntent, string> = {
  'Open to jobs': 'searchCandidates.intent.jobs',
  'Open to partnership': 'searchCandidates.intent.partnership',
  'Open to community roles': 'searchCandidates.intent.community',
}
const EXPERIENCE_BUCKET_KEYS: Record<ExperienceBucket, string> = {
  '0-2 yrs': 'searchCandidates.experience.bucket02',
  '3-5 yrs': 'searchCandidates.experience.bucket35',
  '5-8 yrs': 'searchCandidates.experience.bucket58',
  '8+ yrs': 'searchCandidates.experience.bucket8plus',
}

function experienceBucket(years: number): ExperienceBucket {
  if (years <= 2) return '0-2 yrs'
  if (years <= 5) return '3-5 yrs'
  if (years <= 8) return '5-8 yrs'
  return '8+ yrs'
}

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}

function CandidateCard({
  candidate,
  contacted,
  onContact,
}: {
  candidate: Candidate
  contacted: boolean
  onContact: () => void
}) {
  const { t } = useTranslation('company')
  return (
    <div className="flex flex-wrap justify-between gap-4 rounded-card border border-border bg-surface px-5 py-[18px]">
      <div className="flex gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white ${candidate.avatarColorClass}`}
        >
          {candidate.initial}
        </div>
        <div>
          <div className="text-[15px] font-bold text-ink">{candidate.name}</div>
          <div className="mt-0.5 text-[13px] text-slate">
            {t('searchCandidates.candidateMeta', {
              title: candidate.title,
              location: candidate.location,
              years: candidate.years,
            })}
          </div>
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
        <span
          className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${INTENT_BADGE_CLASS[candidate.intent]}`}
        >
          {t(INTENT_LABEL_KEYS[candidate.intent])}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink"
          >
            {t('dashboard.viewProfile')}
          </button>
          <button
            type="button"
            disabled={contacted}
            onClick={onContact}
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
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [intents, setIntents] = useState<Set<CandidateIntent>>(new Set())
  const [experiences, setExperiences] = useState<Set<ExperienceBucket>>(new Set())
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const loc = location.trim().toLowerCase()
    return candidates.filter((candidate) => {
      if (q) {
        const matchesQuery =
          candidate.name.toLowerCase().includes(q) ||
          candidate.title.toLowerCase().includes(q) ||
          candidate.skills.some((skill) => skill.toLowerCase().includes(q))
        if (!matchesQuery) return false
      }
      if (loc && !candidate.location.toLowerCase().includes(loc)) return false
      if (intents.size > 0 && !intents.has(candidate.intent)) return false
      if (experiences.size > 0 && !experiences.has(experienceBucket(candidate.years))) return false
      return true
    })
  }, [query, location, intents, experiences])

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
            <div className="mb-4 text-[15px] font-bold text-ink">
              {t('public:filters.heading')}
            </div>

            <div className="mb-[18px]">
              <div className="mb-2.5 text-[13px] font-bold text-ink">
                {t('searchCandidates.lookingFor')}
              </div>
              {INTENT_OPTIONS.map((intent) => (
                <label
                  key={intent}
                  className="mb-2.5 flex cursor-pointer items-center gap-2.5 text-sm text-[#3A414D]"
                >
                  <input
                    type="checkbox"
                    checked={intents.has(intent)}
                    onChange={() => setIntents(toggleInSet(intents, intent))}
                    className="h-4 w-4 accent-primary"
                  />
                  {t(INTENT_LABEL_KEYS[intent])}
                </label>
              ))}
            </div>

            <div className="mb-[18px]">
              <div className="mb-2.5 text-[13px] font-bold text-ink">
                {t('searchCandidates.experience.heading')}
              </div>
              {EXPERIENCE_BUCKETS.map((bucket) => (
                <label
                  key={bucket}
                  className="mb-2.5 flex cursor-pointer items-center gap-2.5 text-sm text-[#3A414D]"
                >
                  <input
                    type="checkbox"
                    checked={experiences.has(bucket)}
                    onChange={() => setExperiences(toggleInSet(experiences, bucket))}
                    className="h-4 w-4 accent-primary"
                  />
                  {t(EXPERIENCE_BUCKET_KEYS[bucket])}
                </label>
              ))}
            </div>

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
          <div className="mb-4 text-[15px] text-slate">
            {t('searchCandidates.showingCount', { count: filtered.length })}
          </div>
          <div className="flex flex-col gap-3">
            {filtered.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                contacted={contactedIds.has(candidate.id)}
                onContact={() => setContactedIds((prev) => new Set(prev).add(candidate.id))}
              />
            ))}
            {filtered.length === 0 && (
              <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
                {t('searchCandidates.noResults')}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
