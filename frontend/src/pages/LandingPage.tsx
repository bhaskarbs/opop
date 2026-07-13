import { type SubmitEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Card, LinkButton, Tag } from '../components/ui'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import { ROUTES } from '../routes/paths'

// Trending-skill query chips double as literal search terms (see handleSearchSubmit), so — like
// job/company content elsewhere — they stay in English rather than being translated UI copy.
const TRENDING_SKILLS = [
  'Frontend Developer',
  'Data Analyst',
  'Customer Support',
  'Sales',
  'Content Writing',
]

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

const STATS = [
  { value: '12,400+', labelKey: 'landing.stats.liveJobs' },
  { value: '860+', labelKey: 'landing.stats.startups' },
  { value: '340+', labelKey: 'landing.stats.communitySessions' },
  { value: '92%', labelKey: 'landing.stats.candidatesWhoFoundPath' },
]

// Mock startup profiles — treated like company-authored content, not translated UI copy (i18n
// scope here is static UI text only; job/company content stays as entered).
const STARTUPS = [
  {
    name: 'Vertex Robotics',
    sector: 'Deep Tech · Seed',
    initial: 'V',
    avatarBgClass: 'bg-primary',
    blurb:
      'Looking for partners with embedded systems or hardware QA experience to co-build their next product line.',
    tags: ['Hardware', 'QA', 'Embedded'],
  },
  {
    name: 'Lumen Health',
    sector: 'Healthtech · Series A',
    initial: 'L',
    avatarBgClass: 'bg-teal',
    blurb:
      'Needs partners across clinical ops, customer success, and growth marketing for its telehealth platform.',
    tags: ['Ops', 'CS', 'Marketing'],
  },
  {
    name: 'Sahaay Finance',
    sector: 'Fintech · Pre-seed',
    initial: 'S',
    avatarBgClass: 'bg-amber',
    blurb:
      'Building rural credit tools — open to partners with sales, community outreach, or compliance backgrounds.',
    tags: ['Sales', 'Compliance'],
  },
]

export default function LandingPage() {
  const { t } = useTranslation('public')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')

  function handleSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (location.trim()) params.set('loc', location.trim())
    const queryString = params.toString()
    navigate(queryString ? `${localize(ROUTES.jobs)}?${queryString}` : localize(ROUTES.jobs))
  }

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-tint to-page px-6 pt-16 pb-14">
        <div className="mx-auto max-w-[1120px] text-center">
          <div className="mb-[22px] inline-flex items-center gap-1.5 rounded-full border border-[#D8E1FB] bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-primary">
            {t('landing.badge')}
          </div>
          <h1 className="mb-[18px] text-[clamp(32px,5vw,52px)] leading-[1.12] font-extrabold tracking-[-0.02em] text-ink">
            {t('landing.hero.titleLine1')}
            <br />
            {t('landing.hero.titleLine2')}
          </h1>
          <p className="mx-auto mb-9 max-w-[640px] text-lg leading-[1.6] text-slate">
            {t('landing.hero.subtitle')}
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto flex max-w-[820px] flex-wrap gap-2 rounded-card border border-border bg-surface p-2.5 shadow-[0_8px_24px_rgba(20,24,31,0.06)]"
          >
            <label className="flex min-w-[200px] flex-[2] items-center gap-2.5 px-3.5 py-2.5">
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
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('landing.search.jobPlaceholder')}
                className="w-full font-[inherit] text-[15px] text-ink outline-none"
              />
            </label>
            <label className="flex min-w-[160px] flex-1 items-center gap-2.5 border-l border-border px-3.5 py-2.5">
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
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t('landing.search.locationPlaceholder')}
                className="w-full font-[inherit] text-[15px] text-ink outline-none"
              />
            </label>
            <button
              type="submit"
              className="min-h-[46px] rounded-control bg-primary px-[26px] text-[15px] font-bold text-white hover:bg-primary/90"
            >
              {t('landing.search.submit')}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
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
      <section className="mx-auto max-w-[1120px] px-6 pt-16 pb-4">
        <div className="mx-auto mb-10 max-w-[640px] text-center">
          <h2 className="mb-3 text-[30px] font-extrabold tracking-[-0.01em] text-ink">
            {t('landing.paths.heading')}
          </h2>
          <p className="text-base leading-[1.6] text-slate">{t('landing.paths.subtitle')}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          {THREE_PATHS.map((path) => (
            <Card key={path.titleKey} className="p-7">
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] ${path.iconBgClass}`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={path.iconColor}
                  strokeWidth={2}
                >
                  {path.icon}
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-bold text-ink">{t(path.titleKey)}</h3>
              <p className="mb-4 text-[14.5px] leading-[1.6] text-slate">{t(path.descriptionKey)}</p>
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

      {/* Stats band */}
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

      {/* Startups offering partnerships */}
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
          {STARTUPS.map((startup) => (
            <Card key={startup.name} className="p-[22px]">
              <div className="mb-3.5 flex items-center gap-3">
                <div
                  className={`flex h-[42px] w-[42px] items-center justify-center rounded-[10px] text-[15px] font-bold text-white ${startup.avatarBgClass}`}
                >
                  {startup.initial}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-ink">{startup.name}</div>
                  <div className="text-[13px] text-fog">{startup.sector}</div>
                </div>
              </div>
              <p className="mb-3.5 text-sm leading-[1.55] text-slate">{startup.blurb}</p>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {startup.tags.map((tag) => (
                  <Tag key={tag} variant="partnership">
                    {tag}
                  </Tag>
                ))}
              </div>
              <LinkButton to={ROUTES.partnerships} variant="dark" className="block w-full text-center">
                {t('landing.startups.applyForPartnership')}
              </LinkButton>
            </Card>
          ))}
        </div>
      </section>

      {/* Community income banner */}
      <section className="mx-auto mb-16 max-w-[1120px] px-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-center gap-8 rounded-[20px] bg-[#0B3B34] p-11">
          <div>
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
              <Link
                to={localize(ROUTES.community)}
                className="rounded-lg border border-[rgba(255,255,255,0.3)] px-5 py-[11px] text-sm font-bold text-white no-underline"
              >
                {t('landing.community.interested')}
              </Link>
            </div>
          </div>
          <div className="flex aspect-video items-center justify-center rounded-card border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)]">
            <div className="text-center font-mono text-[12.5px] text-[#7FE0C4]">
              {t('landing.community.videoPlaceholder')}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mb-[72px] max-w-[1120px] px-6 text-center">
        <h2 className="mb-3 text-[26px] font-extrabold text-ink">{t('landing.finalCta.heading')}</h2>
        <p className="mb-6 text-[15px] text-slate">{t('landing.finalCta.subtitle')}</p>
        <LinkButton to={ROUTES.register} size="lg" className="text-[15px]">
          {t('landing.finalCta.button')}
        </LinkButton>
      </section>
    </main>
  )
}
