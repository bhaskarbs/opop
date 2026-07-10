import { useState } from 'react'

const STEPS = [
  {
    step: '01',
    title: 'Share your profile',
    desc: 'Resume, skills, life goals, and the values that matter to you.',
  },
  {
    step: '02',
    title: 'Get matched',
    desc: 'We surface startups whose needs fit your skill set.',
  },
  {
    step: '03',
    title: 'Seminar or meetup',
    desc: 'Meet the founders through an invited session.',
  },
  {
    step: '04',
    title: 'Partner & build experience',
    desc: 'Work together and document it for your resume.',
  },
]

const TRACKS = [
  {
    tag: 'With funding',
    tagClass: 'bg-primary-tint text-primary',
    gradientClass: 'bg-[linear-gradient(135deg,#2451D6,#7FA0F2)]',
    title: 'Funded partnership',
    desc: 'Startups that have raised capital and can offer a stipend, revenue share, or equity for your work.',
    cta: 'Apply with funding',
    ctaClass: 'bg-primary',
  },
  {
    tag: 'Without funding',
    tagClass: 'bg-teal-tint text-teal',
    gradientClass: 'bg-[linear-gradient(135deg,#0F8A6B,#7FE0C4)]',
    title: 'Early-stage partnership',
    desc: 'Pre-funding founders who can’t pay yet — you build real, documented experience alongside them.',
    cta: 'Apply without funding',
    ctaClass: 'bg-teal',
  },
]

function PlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export default function PartnershipsPage() {
  const [videoOpen, setVideoOpen] = useState(false)
  const [skill, setSkill] = useState('')
  const [interested, setInterested] = useState(false)

  return (
    <main>
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-10 px-6 py-14 profile:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <span className="rounded-full bg-amber-tint px-3 py-[5px] text-[12.5px] font-bold text-amber">
            Startup Partnership Ecosystem
          </span>
          <h1 className="mt-4 mb-3.5 text-[clamp(28px,4vw,40px)] leading-[1.15] font-extrabold tracking-[-0.01em] text-ink">
            Turn a startup&rsquo;s needs into your next career move
          </h1>
          <p className="mb-[26px] text-[15.5px] leading-[1.6] text-slate">
            There&rsquo;s no list of open roles here yet — this is where you learn how partnerships
            work, then choose the track that fits: startups with funding to offer, or early-stage
            ones offering pure experience.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="inline-flex items-center gap-2 rounded-[9px] bg-ink px-[22px] py-3 text-sm font-bold text-white"
            >
              <PlayIcon size={15} />
              Watch the explainer
            </button>
            <a
              href="#choose-track"
              className="rounded-[9px] border border-border bg-surface px-[22px] py-3 text-sm font-bold text-ink no-underline"
            >
              See the two tracks
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          className="relative flex aspect-[4/3] cursor-pointer items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#101522,#1B2130)]"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)]">
            <PlayIcon size={22} />
          </span>
          <span className="absolute bottom-4 left-4 font-mono text-xs text-[#B4BAC6]">
            3 min · How it works
          </span>
        </button>
      </div>

      {videoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,24,31,0.75)] p-5">
          <div className="relative flex aspect-video w-full max-w-[800px] items-center justify-center rounded-2xl bg-footer">
            <button
              type="button"
              onClick={() => setVideoOpen(false)}
              className="absolute top-3.5 right-3.5 h-8 w-8 rounded-full bg-[rgba(255,255,255,0.12)] text-base text-white"
            >
              ×
            </button>
            <div className="text-center font-mono text-[12.5px] text-[#7FA0F2]">
              [ video: how startup partnerships work · 3 min ]
            </div>
          </div>
        </div>
      )}

      <div className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 px-6 py-11">
          {STEPS.map((step) => (
            <div key={step.step}>
              <div className="mb-2 text-[22px] font-extrabold text-border">{step.step}</div>
              <div className="mb-1.5 text-[14.5px] font-bold text-ink">{step.title}</div>
              <div className="text-[13px] leading-[1.55] text-slate">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div id="choose-track" className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="mx-auto mb-9 max-w-[600px] text-center">
          <h2 className="mb-3 text-[26px] font-extrabold tracking-[-0.01em] text-ink">
            Two tracks. Both count as real experience.
          </h2>
        </div>
        <div className="mb-12 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
          {TRACKS.map((track) => (
            <div key={track.title} className={`rounded-2xl p-0.5 ${track.gradientClass}`}>
              <div className="h-full rounded-card bg-surface p-7">
                <span
                  className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${track.tagClass}`}
                >
                  {track.tag}
                </span>
                <h3 className="mt-3.5 mb-2 text-lg font-bold text-ink">{track.title}</h3>
                <p className="mb-5 text-sm leading-[1.6] text-slate">{track.desc}</p>
                <a
                  href="#apply"
                  onClick={(event) => event.preventDefault()}
                  className={`block rounded-[9px] p-3 text-center text-sm font-bold text-white no-underline ${track.ctaClass}`}
                >
                  {track.cta}
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[18px] bg-ink p-10">
          <div>
            <div className="mb-1.5 text-[17px] font-bold text-white">
              Still deciding which track fits?
            </div>
            <div className="text-sm text-[#B4BAC6]">
              Show interest and we&rsquo;ll notify you the moment a matching partnership opens —
              funded or not.
            </div>
          </div>
          {interested ? (
            <div className="text-sm font-bold text-[#7FE0C4]">
              Thanks — we&rsquo;ll notify you when a matching partnership opens ✓
            </div>
          ) : (
            <form
              className="flex flex-wrap gap-2.5"
              onSubmit={(event) => {
                event.preventDefault()
                setInterested(true)
              }}
            >
              <input
                type="text"
                value={skill}
                onChange={(event) => setSkill(event.target.value)}
                placeholder="Your top skill"
                className="w-[200px] rounded-[9px] border-none bg-white px-3.5 py-3 text-sm"
              />
              <button
                type="submit"
                className="rounded-[9px] bg-white px-[22px] text-sm font-bold text-ink"
              >
                Show interest
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
