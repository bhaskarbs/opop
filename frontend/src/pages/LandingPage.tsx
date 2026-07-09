import { type SubmitEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, LinkButton, Tag } from '../components/ui'
import { ROUTES } from '../routes/paths'

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
    title: 'Full-time & contract jobs',
    description:
      'Search thousands of roles from direct employers, plus listings aggregated from other job boards across the web.',
    linkLabel: 'Browse jobs →',
    linkClassName: 'text-primary',
    to: ROUTES.jobs,
  },
  {
    iconBgClass: 'bg-[#FFF1DC]',
    icon: <path d="M12 2l3 6 6 1-4.5 4.5L17.5 20 12 17l-5.5 3 1-6.5L3 9l6-1z" />,
    iconColor: '#C2760C',
    title: 'Startup partnerships',
    description:
      'Not landing the job yet? Partner with a startup that needs your exact skill set and turn it into real, countable experience.',
    linkLabel: 'Explore partnerships →',
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
    title: 'Community opportunities',
    description:
      'Sharpen soft skills through community roles, and learn how different income types can support you along the way.',
    linkLabel: 'Learn more →',
    linkClassName: 'text-teal',
    to: ROUTES.community,
  },
]

const STATS = [
  { value: '12,400+', label: 'Live job openings' },
  { value: '860+', label: 'Startups offering partnerships' },
  { value: '340+', label: 'Community sessions run' },
  { value: '92%', label: 'Candidates who found a path' },
]

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
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')

  function handleSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (location.trim()) params.set('loc', location.trim())
    const queryString = params.toString()
    navigate(queryString ? `${ROUTES.jobs}?${queryString}` : ROUTES.jobs)
  }

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-tint to-page px-6 pt-16 pb-14">
        <div className="mx-auto max-w-[1120px] text-center">
          <div className="mb-[22px] inline-flex items-center gap-1.5 rounded-full border border-[#D8E1FB] bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-primary">
            A job portal that also builds your career path
          </div>
          <h1 className="mb-[18px] text-[clamp(32px,5vw,52px)] leading-[1.12] font-extrabold tracking-[-0.02em] text-ink">
            Jobs. Startup partnerships.
            <br />
            Community income.
          </h1>
          <p className="mx-auto mb-9 max-w-[640px] text-lg leading-[1.6] text-slate">
            Still searching after years of applications? Every skill you list opens three doors — a
            job, a partnership with a growing startup, or a community role that builds real-world
            experience.
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
                placeholder="Job title, skill, or keyword"
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
                placeholder="City or remote"
                className="w-full font-[inherit] text-[15px] text-ink outline-none"
              />
            </label>
            <button
              type="submit"
              className="min-h-[46px] rounded-control bg-primary px-[26px] text-[15px] font-bold text-white hover:bg-primary/90"
            >
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {TRENDING_SKILLS.map((skill) => (
              <Link
                key={skill}
                to={`${ROUTES.jobs}?q=${encodeURIComponent(skill)}`}
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
            Three paths, one profile
          </h2>
          <p className="text-base leading-[1.6] text-slate">
            Your resume works across all three — every skill you build counts toward the role you
            actually want.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          {THREE_PATHS.map((path) => (
            <Card key={path.title} className="p-7">
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
              <h3 className="mb-2 text-lg font-bold text-ink">{path.title}</h3>
              <p className="mb-4 text-[14.5px] leading-[1.6] text-slate">{path.description}</p>
              <Link to={path.to} className={`text-sm font-bold no-underline ${path.linkClassName}`}>
                {path.linkLabel}
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <section className="mt-14 border-t border-b border-border bg-surface">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6 px-6 py-9 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="text-[30px] font-extrabold text-ink">{stat.value}</div>
              <div className="mt-1 text-[13.5px] text-slate">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Startups offering partnerships */}
      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[26px] font-extrabold tracking-[-0.01em] text-ink">
            Startups offering partnerships
          </h2>
          <Link to={ROUTES.partnerships} className="text-sm font-bold text-primary no-underline">
            View all →
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
              <LinkButton
                to={ROUTES.partnerships}
                variant="dark"
                className="block w-full text-center"
              >
                Apply for partnership
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
              Community income
            </span>
            <h2 className="mb-3 text-[26px] font-extrabold tracking-[-0.01em] text-white">
              Never heard of community income?
            </h2>
            <p className="mb-5 max-w-[460px] text-[15px] leading-[1.65] text-[#B9E9DC]">
              Watch short videos and read guides on different income types — then tell us you're
              interested and we'll invite you to the next session.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={ROUTES.community}
                className="rounded-lg bg-white px-5 py-[11px] text-sm font-bold text-[#0B3B34] no-underline"
              >
                Watch & read →
              </Link>
              <Link
                to={ROUTES.community}
                className="rounded-lg border border-[rgba(255,255,255,0.3)] px-5 py-[11px] text-sm font-bold text-white no-underline"
              >
                I'm interested
              </Link>
            </div>
          </div>
          <div className="flex aspect-video items-center justify-center rounded-card border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)]">
            <div className="text-center font-mono text-[12.5px] text-[#7FE0C4]">
              [ intro video: community income explained ]
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mb-[72px] max-w-[1120px] px-6 text-center">
        <h2 className="mb-3 text-[26px] font-extrabold text-ink">
          Ready to build the career you actually want?
        </h2>
        <p className="mb-6 text-[15px] text-slate">
          Create your profile once — it works across jobs, partnerships, and community roles.
        </p>
        <LinkButton to={ROUTES.register} size="lg" className="text-[15px]">
          Register & upload resume
        </LinkButton>
      </section>
    </main>
  )
}
