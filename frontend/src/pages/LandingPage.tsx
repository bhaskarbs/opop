import { type SubmitEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Card, LinkButton, SearchAutocompleteInput, Tag } from '../components/ui'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import { avatarColorClass } from '../lib/ideaAvatar'
import { ideasApi, type BackendIdeaStage, type IdeaSummary } from '../lib/ideasApi'
import { TRENDING_SKILLS as JOB_ROLE_SUGGESTIONS } from '../mocks/jobs'
import { LOCATION_SUGGESTIONS } from '../mocks/locations'
import { SKILL_SUGGESTIONS } from '../mocks/skills'
import { ROUTES } from '../routes/paths'

const STAGE_KEYS: Record<BackendIdeaStage, string> = {
  CONCEPT: 'ideas:browse.stages.concept',
  PROTOTYPE: 'ideas:browse.stages.prototype',
  LIVE: 'ideas:browse.stages.live',
}

// Trending-skill query chips double as literal search terms (see handleSearchSubmit), so — like
// job/company content elsewhere — they stay in English rather than being translated UI copy.
const TRENDING_SKILLS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'Product Manager',
  'Business Analyst',
  'UI/UX Design',
  'Digital Marketing',
  'DevOps Engineer',
  'Cloud Engineer',
  'Cybersecurity Analyst',
  'Civil Engineer',
  'Mechanical Engineer',
  'QA Tester',
  'Financial Analyst',
  'Operations Manager',
  'Recruiter',
  'Interior Designer',
  'Video Editor',
  'Customer Support',
  'Sales',
  'Content Writing',
  'Graphic Design',
  'Accounting',
  'HR',
]

// Combines job roles with individual technical/soft skills, since candidates search by either —
// deduplicated in case of overlap. Same source the /jobs page's own search bar suggests from.
const KEYWORD_SUGGESTIONS = [...new Set([...JOB_ROLE_SUGGESTIONS, ...SKILL_SUGGESTIONS])]

const THREE_PATHS = [
  {
    iconBgClass: 'bg-primary-tint',
    icon: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      </>
    ),
    iconColor: '#2451D6',
    titleKey: 'landing.paths.jobs.title',
    descriptionKey: 'landing.paths.jobs.description',
    linkLabelKey: 'landing.paths.jobs.link',
    linkClassName: 'text-primary',
    to: ROUTES.jobs,
  },
  {
    iconBgClass: 'bg-[#FFF1DC]',
    icon: <path d="M12 2l3 6 6 1-4.5 4.5L17.5 20 12 17l-5.5 3 1-6.5L3 9l6-1z" />,
    iconColor: '#C2760C',
    titleKey: 'landing.paths.partnerships.title',
    descriptionKey: 'landing.paths.partnerships.description',
    linkLabelKey: 'landing.paths.partnerships.link',
    linkClassName: 'text-amber',
    to: ROUTES.partnerships,
  },
  {
    iconBgClass: 'bg-[#E1F5EE]',
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 14.5c2.6.2 4.5 2.4 4.5 5" />
      </>
    ),
    iconColor: '#0F8A6B',
    titleKey: 'landing.paths.community.title',
    descriptionKey: 'landing.paths.community.description',
    linkLabelKey: 'landing.paths.community.link',
    linkClassName: 'text-teal',
    to: ROUTES.community,
  },
]

// Numbers/stats band — commented out per request, along with its render block below. Restore
// both to bring the section back.
// const STATS = [
//   { value: '12,400+', labelKey: 'landing.stats.liveJobs' },
//   { value: '860+', labelKey: 'landing.stats.startups' },
//   { value: '340+', labelKey: 'landing.stats.communitySessions' },
//   { value: '92%', labelKey: 'landing.stats.candidatesWhoFoundPath' },
// ]

export default function LandingPage() {
  const { t } = useTranslation('public')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [startups, setStartups] = useState<IdeaSummary[]>([])
  const [startupsLoading, setStartupsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ideasApi
      .browse()
      .then((ideas) => {
        if (!cancelled) {
          setStartups(ideas.slice(0, 3))
        }
      })
      .catch(() => {
        // Best-effort — the section just stays hidden if this fails, same as any other
        // below-the-fold marketing content on this page.
      })
      .finally(() => {
        if (!cancelled) setStartupsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (location.trim()) params.set('loc', location.trim())
    const queryString = params.toString()
    // router state (not a query param) so submitting with both fields blank still tells
    // JobSearchPage "the user explicitly searched" and it lists every job, rather than showing
    // its default "start your search" prompt — distinct from just landing on /jobs directly
    // (e.g. the top-nav "Find Jobs" link), which still gets that prompt (or, for a logged-in
    // candidate, personalized suggestions — see JobSearchPage's personalization effect).
    navigate(queryString ? `${localize(ROUTES.jobs)}?${queryString}` : localize(ROUTES.jobs), {
      state: { triggeredSearch: true },
    })
  }

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-tint to-page px-6 pt-16 pb-6">
        {/* Purely decorative depth behind the hero content — soft blurred brand-color blobs, no
            imagery assets available, so this is what "richer hero" comes from without inventing
            binary assets. Hidden from assistive tech and never intercepts clicks. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute top-10 -right-20 h-[320px] w-[320px] rounded-full bg-teal/15 blur-[100px]" />
          <div className="absolute bottom-[-140px] left-1/3 h-[280px] w-[280px] rounded-full bg-amber/15 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-[1120px] text-center">
          <div className="animate-fade-in-up mb-[22px] inline-flex items-center gap-1.5 rounded-full border border-[#D8E1FB] bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-primary">
            {t('landing.badge')}
          </div>
          <h1 className="animate-fade-in-up mb-[18px] text-[clamp(32px,5vw,52px)] leading-[1.12] font-extrabold tracking-[-0.02em] text-ink [animation-delay:0.08s]">
            {t('landing.hero.titleLine1')}
            <br />
            {t('landing.hero.titleLine2')}
          </h1>
          <p className="animate-fade-in-up mx-auto mb-9 max-w-[640px] text-lg leading-[1.6] text-slate [animation-delay:0.16s]">
            {t('landing.hero.subtitle')}
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="animate-fade-in-up mx-auto flex max-w-[820px] flex-wrap gap-2 rounded-card border border-border bg-surface p-2.5 shadow-[0_8px_24px_rgba(20,24,31,0.06)] [animation-delay:0.24s]"
          >
            <SearchAutocompleteInput
              value={query}
              onChange={setQuery}
              suggestions={KEYWORD_SUGGESTIONS}
              placeholder={t('landing.search.jobPlaceholder')}
              containerClassName="min-w-[200px] flex-[2]"
              labelClassName="flex items-center gap-2.5 px-3.5 py-2.5"
              inputClassName="w-full font-[inherit] text-[15px] text-ink outline-none"
              icon={
                <svg
                  width="18"
                  height="18"
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
            <SearchAutocompleteInput
              value={location}
              onChange={setLocation}
              suggestions={LOCATION_SUGGESTIONS}
              placeholder={t('landing.search.locationPlaceholder')}
              containerClassName="min-w-[160px] flex-1"
              labelClassName="flex items-center gap-2.5 border-l border-border px-3.5 py-2.5"
              inputClassName="w-full font-[inherit] text-[15px] text-ink outline-none"
              icon={
                <svg
                  width="18"
                  height="18"
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
              className="min-h-[46px] rounded-control bg-primary px-[26px] text-[15px] font-bold text-white hover:bg-primary/90"
            >
              {t('landing.search.submit')}
            </button>
          </form>

          <div className="animate-fade-in-up mt-4 flex flex-wrap justify-center gap-2.5 [animation-delay:0.32s]">
            {TRENDING_SKILLS.map((skill) => (
              <Link
                key={skill}
                to={`${localize(ROUTES.jobs)}?q=${encodeURIComponent(skill)}`}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-slate no-underline"
              >
                {skill}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Three paths, one profile */}
      <section className="mx-auto max-w-[1120px] px-6 pt-8 pb-4">
        <div className="mx-auto mb-10 max-w-[640px] text-center">
          <h2 className="mb-3 text-[30px] font-extrabold tracking-[-0.01em] text-ink">
            {t('landing.paths.heading')}
          </h2>
          <p className="text-base leading-[1.6] text-slate">{t('landing.paths.subtitle')}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          {THREE_PATHS.map((path) => (
            <Card key={path.titleKey} interactive className="group p-7">
              <div
                className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${path.iconBgClass} transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105`}
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={path.iconColor}
                  strokeWidth={1.75}
                >
                  {path.icon}
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-bold text-ink">{t(path.titleKey)}</h3>
              <p className="mb-4 text-[14.5px] leading-[1.6] text-slate">
                {t(path.descriptionKey)}
              </p>
              <Link
                to={localize(path.to)}
                className={`text-sm font-bold no-underline ${path.linkClassName}`}
              >
                {t(path.linkLabelKey)}
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats band — commented out per request; see STATS above.
      <section className="mt-14 border-t border-b border-border bg-surface">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6 px-6 py-9 text-center">
          {STATS.map((stat) => (
            <div key={stat.labelKey}>
              <div className="text-[30px] font-extrabold text-ink">{stat.value}</div>
              <div className="mt-1 text-[13.5px] text-slate">{t(stat.labelKey)}</div>
            </div>
          ))}
        </div>
      </section>
      */}

      {/* Startups offering partnerships — backed by approved ideas from any submitter, candidate
      or company (see IdeasBrowsePage); an idea only becomes visible here once an admin approves
      it (see IdeaService.browse). Hidden entirely once loaded if there are none yet, rather than
      showing an empty heading with nothing under it. */}
      {(startupsLoading || startups.length > 0) && (
        <section className="mx-auto max-w-[1120px] px-6 py-16">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[26px] font-extrabold tracking-[-0.01em] text-ink">
              {t('landing.startups.heading')}
            </h2>
            <Link
              to={localize(ROUTES.partnerships)}
              className="text-sm font-bold text-primary no-underline"
            >
              {t('landing.startups.viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[18px]">
            {startups.map((idea) => (
              <Card key={idea.id} interactive className="p-[22px]">
                <div className="mb-3.5 flex items-center gap-3">
                  <div
                    className={`ring-surface flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px] text-base font-bold text-white shadow-sm ring-2 ${avatarColorClass(idea.submitterName)}`}
                  >
                    {idea.submitterName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-ink">{idea.submitterName}</div>
                    <div className="text-[13px] text-fog">{idea.category}</div>
                  </div>
                </div>
                <p className="mb-3.5 text-sm leading-[1.55] text-slate">{idea.problem}</p>
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <Tag variant="partnership">{t(STAGE_KEYS[idea.stage])}</Tag>
                  <Link
                    to={localize(ROUTES.ideaDetail(idea.id))}
                    className="text-[13px] font-bold text-primary no-underline"
                  >
                    {t('ideas:browse.viewIdea')}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Community income banner */}
      <section className="mx-auto mb-16 max-w-[1120px] px-6">
        <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] items-center gap-8 overflow-hidden rounded-[20px] bg-[#0B3B34] p-11">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 h-[260px] w-[260px] rounded-full bg-[#7FE0C4]/20 blur-[100px]"
          />
          <div className="relative">
            <span className="mb-3.5 inline-block rounded-full bg-[rgba(127,224,196,0.12)] px-3 py-[5px] text-[12.5px] font-bold text-[#7FE0C4]">
              {t('landing.community.badge')}
            </span>
            <h2 className="mb-3 text-[26px] font-extrabold tracking-[-0.01em] text-white">
              {t('landing.community.heading')}
            </h2>
            <p className="mb-5 max-w-[460px] text-[15px] leading-[1.65] text-[#B9E9DC]">
              {t('landing.community.subtitle')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={localize(ROUTES.community)}
                className="rounded-lg bg-white px-5 py-[11px] text-sm font-bold text-[#0B3B34] no-underline"
              >
                {t('landing.community.watchAndRead')}
              </Link>
            </div>
          </div>
          <div className="aspect-video overflow-hidden rounded-card border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)]">
            <video
              src="/videos/community-hero.mp4"
              poster="/videos/community-hero-thumbnail.jpg"
              controls
              className="h-full w-full object-contain"
            >
              {t('landing.community.videoPlaceholder')}
            </video>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mb-[72px] max-w-[1120px] px-6 text-center">
        <h2 className="mb-3 text-[26px] font-extrabold text-ink">
          {t('landing.finalCta.heading')}
        </h2>
        <p className="mb-6 text-[15px] text-slate">{t('landing.finalCta.subtitle')}</p>
        <LinkButton to={ROUTES.register} size="lg" className="text-[15px]">
          {t('landing.finalCta.button')}
        </LinkButton>
      </section>
    </main>
  )
}
