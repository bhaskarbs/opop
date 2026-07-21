import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import { ApiError } from '../lib/apiClient'
import { avatarColorClass } from '../lib/ideaAvatar'
import { ideasApi, type BackendIdeaStage, type IdeaSummary } from '../lib/ideasApi'
import { IDEA_CATEGORIES } from '../mocks/ideas'
import { ideaRoutesFor, ROUTES } from '../routes/paths'
import { useAuthStore } from '../stores/authStore'

const IDEAS_PAGE_SIZE = 6

const STAGE_KEYS: Record<BackendIdeaStage, string> = {
  CONCEPT: 'browse.stages.concept',
  PROTOTYPE: 'browse.stages.prototype',
  LIVE: 'browse.stages.live',
}

const STAGE_BADGE_CLASSES: Record<BackendIdeaStage, string> = {
  CONCEPT: 'bg-amber-tint text-amber',
  PROTOTYPE: 'bg-primary-tint text-primary',
  LIVE: 'bg-teal-tint text-teal',
}

/** Public — anyone can browse, living under /partnerships/ideas so it highlights the
 * "Partnerships" nav item (matching how PartnershipsPage's other guest-accessible pages work).
 * Deliberately not linked from any nav/menu (per request); only reachable by direct URL or
 * from an idea-related page (e.g. IdeaDetailPage's back link). */
export default function IdeasBrowsePage() {
  const { t } = useTranslation('ideas')
  const localize = useLocalizedPath()
  const authStatus = useAuthStore((state) => state.status)
  const role = useAuthStore((state) => state.user?.role)
  const submitRoute = ideaRoutesFor(role === 'COMPANY' ? 'COMPANY' : 'CANDIDATE').submit
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [stage, setStage] = useState<BackendIdeaStage | ''>('')

  const [ideas, setIdeas] = useState<IdeaSummary[]>([])
  const [ideasShown, setIdeasShown] = useState(IDEAS_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appliedIdeaIds, setAppliedIdeaIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
      ideasApi
        .browse({
          q: query.trim() || undefined,
          category: category || undefined,
          stage: stage || undefined,
        })
        .then((results) => {
          setIdeas(results)
          setIdeasShown(IDEAS_PAGE_SIZE)
        })
        .catch((caught) => {
          setError(caught instanceof ApiError ? caught.message : t('browse.errorLoading'))
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [query, category, stage, t])

  // Independent of the search filters above — which ideas the caller has already expressed
  // interest in doesn't change with query/category/stage. Always resolves through a promise
  // chain (even the "not logged in" case) so setAppliedIdeaIds is only ever called from a
  // .then(), not synchronously in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false
    const interests =
      authStatus === 'authenticated' && (role === 'CANDIDATE' || role === 'COMPANY')
        ? ideasApi.myInterests()
        : Promise.resolve([])
    interests
      .then((results) => {
        if (cancelled) return
        setAppliedIdeaIds(new Set(results.map((interest) => interest.ideaId)))
      })
      .catch(() => {
        // Best-effort — the "already applied" highlight just won't show if this fails.
      })
    return () => {
      cancelled = true
    }
  }, [authStatus, role])

  return (
    <main>
      <div className="bg-gradient-to-br from-[#0B3B34] to-[#0F5B4F] px-6 py-11">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-5">
          <div>
            <span className="rounded-full bg-white/10 px-3 py-[5px] text-xs font-bold text-[#B9E9DC]">
              {t('browse.badge')}
            </span>
            <h1 className="mt-3.5 mb-2 text-[clamp(24px,3vw,32px)] font-extrabold text-white">
              {t('browse.heroTitle')}
            </h1>
            <p className="max-w-[560px] text-[14.5px] text-[#CBEAE0]">{t('browse.heroSubtitle')}</p>
          </div>
          <Link
            to={localize(submitRoute)}
            className="rounded-[9px] bg-white px-[22px] py-3 text-sm font-bold whitespace-nowrap text-[#0B3B34] no-underline"
          >
            {t('browse.submitCta')}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-6 pt-7 pb-16">
        <div className="mb-[22px] flex flex-wrap gap-2.5 rounded-card border border-border bg-surface px-5 py-4">
          <label className="flex min-w-[220px] flex-[2] items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8891A0"
              strokeWidth={2}
              className="shrink-0"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('browse.searchPlaceholder')}
              className="w-full text-[13.5px] text-ink outline-none"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-border px-3 py-2.5 text-[13.5px] text-ink"
          >
            <option value="">{t('browse.allCategories')}</option>
            {IDEA_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value as BackendIdeaStage | '')}
            className="rounded-lg border border-border px-3 py-2.5 text-[13.5px] text-ink"
          >
            <option value="">{t('browse.allStages')}</option>
            {(Object.keys(STAGE_KEYS) as BackendIdeaStage[]).map((s) => (
              <option key={s} value={s}>
                {t(STAGE_KEYS[s])}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="mb-4 text-center text-sm text-danger">{error}</p>}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          {ideas.slice(0, ideasShown).map((idea) => {
            const applied = appliedIdeaIds.has(idea.id)
            return (
              <div
                key={idea.id}
                className={
                  applied
                    ? 'flex flex-col gap-2.5 rounded-card border-2 border-teal bg-teal-tint p-5'
                    : 'flex flex-col gap-2.5 rounded-card border border-border bg-surface p-5'
                }
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-teal-tint px-2.5 py-[3px] text-[11.5px] font-bold text-teal">
                      {idea.category}
                    </span>
                    {applied && (
                      <span className="rounded-full bg-teal px-2.5 py-[3px] text-[11.5px] font-bold text-white">
                        {t('browse.applied')}
                      </span>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-bold whitespace-nowrap ${STAGE_BADGE_CLASSES[idea.stage]}`}
                  >
                    {t(STAGE_KEYS[idea.stage])}
                  </span>
                </div>
                <div>
                  <h3 className="mb-1.5 text-[16.5px] font-bold text-ink">{idea.title}</h3>
                  <p className="text-[13.5px] leading-[1.55] text-slate">{idea.problem}</p>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColorClass(idea.submitterName)}`}
                  >
                    {idea.submitterName.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[12.5px] text-slate">
                    {t('browse.submitterMeta', {
                      name: idea.submitterName,
                      type: t(`browse.submitterTypes.${idea.submitterRole.toLowerCase()}`),
                    })}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between border-t border-[#F0F1F3] pt-3">
                  <div className="text-[12.5px] text-fog">
                    {t('browse.seekingInterested', {
                      funding: idea.funding ?? '—',
                      count: idea.interestedCount,
                    })}
                  </div>
                  <Link
                    to={localize(ROUTES.ideaDetail(idea.id))}
                    className="text-[13px] font-bold no-underline"
                  >
                    {t('browse.viewIdea')}
                  </Link>
                </div>
              </div>
            )
          })}
          {!loading && ideas.length === 0 && !error && (
            <div className="col-span-full rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
              {t('browse.noResults')}
            </div>
          )}
        </div>

        {ideasShown < ideas.length && (
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={() => setIdeasShown((prev) => prev + IDEAS_PAGE_SIZE)}
              className="rounded-lg border border-border bg-surface px-5 py-2.5 text-[13.5px] font-bold text-ink"
            >
              {t('browse.showMore')}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
