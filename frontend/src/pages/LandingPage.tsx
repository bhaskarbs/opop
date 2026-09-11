import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card, LinkButton, Tag } from '../components/ui'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import { avatarColorClass } from '../lib/ideaAvatar'
import { ideasApi, type BackendIdeaStage, type IdeaSummary } from '../lib/ideasApi'
import { ROUTES } from '../routes/paths'

const STAGE_KEYS: Record<BackendIdeaStage, string> = {
  CONCEPT: 'ideas:browse.stages.concept',
  PROTOTYPE: 'ideas:browse.stages.prototype',
  LIVE: 'ideas:browse.stages.live',
}

// The emotional reality most job seekers live in — four short, scannable pain points
// (see t('landing.struggle.*')). Icons are decorative only; the copy carries the message.
const STRUGGLES = [
  {
    iconBgClass: 'bg-primary-tint',
    iconColor: '#2451D6',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
        <path d="M4 4l16 16" />
      </>
    ),
    titleKey: 'landing.struggle.points.frustrated.title',
    textKey: 'landing.struggle.points.frustrated.text',
  },
  {
    iconBgClass: 'bg-amber-tint',
    iconColor: '#C2760C',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </>
    ),
    titleKey: 'landing.struggle.points.rejected.title',
    textKey: 'landing.struggle.points.rejected.text',
  },
  {
    iconBgClass: 'bg-teal-tint',
    iconColor: '#0F8A6B',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      </>
    ),
    titleKey: 'landing.struggle.points.lost.title',
    textKey: 'landing.struggle.points.lost.text',
  },
  {
    iconBgClass: 'bg-warning-tint',
    iconColor: '#B45309',
    icon: (
      <>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </>
    ),
    titleKey: 'landing.struggle.points.underpaid.title',
    textKey: 'landing.struggle.points.underpaid.text',
  },
]

// The candidate journey, revealed one step at a time (see t('landing.steps.*')).
const STEPS = [
  { step: '1', titleKey: 'landing.steps.search.title', textKey: 'landing.steps.search.text' },
  { step: '2', titleKey: 'landing.steps.skills.title', textKey: 'landing.steps.skills.text' },
  { step: '3', titleKey: 'landing.steps.community.title', textKey: 'landing.steps.community.text' },
  {
    step: '4',
    titleKey: 'landing.steps.partnerships.title',
    textKey: 'landing.steps.partnerships.text',
  },
  { step: '5', titleKey: 'landing.steps.income.title', textKey: 'landing.steps.income.text' },
]

const TRUST_POINTS = [
  { key: 'landing.hero.trustFree' },
  { key: 'landing.hero.trustModerated' },
  { key: 'landing.hero.trustIndia' },
]

export default function LandingPage() {
  const { t } = useTranslation('public')
  const localize = useLocalizedPath()
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

  return (
    <main>
      {/* Hero — one promise, one primary action. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-tint to-page px-6 pt-20 pb-16">
        {/* Purely decorative depth behind the hero content — soft blurred brand-color blobs.
            Hidden from assistive tech and never intercepts clicks. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute top-10 -right-20 h-[320px] w-[320px] rounded-full bg-teal/15 blur-[100px]" />
          <div className="absolute bottom-[-140px] left-1/3 h-[280px] w-[280px] rounded-full bg-amber/15 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-[760px] text-center">
          <h1 className="animate-fade-in-up text-[clamp(34px,5vw,56px)] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">
            {t('landing.hero.title')}
          </h1>
          <p className="animate-fade-in-up mx-auto mt-5 mb-9 max-w-[600px] text-lg leading-[1.6] text-slate [animation-delay:0.08s]">
            {t('landing.hero.subtitle')}
          </p>
          <div className="animate-fade-in-up flex flex-wrap justify-center gap-3 [animation-delay:0.16s]">
            <LinkButton to={ROUTES.jobs} size="lg" className="text-[15px]">
              {t('landing.hero.findJobs')}
            </LinkButton>
            <LinkButton to={ROUTES.community} size="lg" variant="secondary" className="text-[15px]">
              {t('landing.hero.joinCommunity')}
            </LinkButton>
          </div>
          <ul className="animate-fade-in-up mx-auto mt-9 flex max-w-[640px] flex-wrap justify-center gap-x-7 gap-y-2 [animation-delay:0.24s]">
            {TRUST_POINTS.map(({ key }) => (
              <li key={key} className="flex items-center gap-2 text-[13px] font-semibold text-fog">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0F8A6B"
                  strokeWidth={2.5}
                  className="shrink-0"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why most job seekers struggle — the emotional hook. */}
      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="mx-auto mb-10 max-w-[640px] text-center">
          <span className="text-[12px] font-extrabold tracking-[0.1em] text-primary uppercase">
            {t('landing.struggle.eyebrow')}
          </span>
          <h2 className="mt-2 mb-3 text-[30px] font-extrabold tracking-[-0.01em] text-ink">
            {t('landing.struggle.heading')}
          </h2>
          <p className="text-base leading-[1.6] text-slate">{t('landing.struggle.lead')}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
          {STRUGGLES.map((s) => (
            <Card key={s.titleKey} className="p-6">
              <div
                className={`mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-2xl ${s.iconBgClass}`}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={s.iconColor}
                  strokeWidth={1.75}
                >
                  {s.icon}
                </svg>
              </div>
              <h3 className="mb-1.5 text-base font-bold text-ink">{t(s.titleKey)}</h3>
              <p className="text-[13.5px] leading-[1.6] text-slate">{t(s.textKey)}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How OpenOpportunity helps — the journey, one step at a time. */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <div className="mx-auto mb-10 max-w-[640px] text-center">
            <span className="text-[12px] font-extrabold tracking-[0.1em] text-primary uppercase">
              {t('landing.steps.eyebrow')}
            </span>
            <h2 className="mt-2 mb-3 text-[30px] font-extrabold tracking-[-0.01em] text-ink">
              {t('landing.steps.heading')}
            </h2>
            <p className="text-base leading-[1.6] text-slate">{t('landing.steps.subtitle')}</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-5">
            {STEPS.map((s) => (
              <Card key={s.step} className="p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-[13px] font-extrabold text-primary">
                  {s.step}
                </div>
                <h3 className="mt-4 mb-1.5 text-base font-bold text-ink">{t(s.titleKey)}</h3>
                <p className="text-[13.5px] leading-[1.6] text-slate">{t(s.textKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

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

      {/* Final CTA */}
      <section className="mx-auto mb-[72px] mt-4 max-w-[1120px] px-6 text-center">
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
