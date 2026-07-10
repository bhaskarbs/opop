import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { candidateProfile, profileCompletionPercent } from '../../mocks/candidateProfile'
import { opportunities, type JobListing } from '../../mocks/jobs'
import { ROUTES } from '../../routes/paths'

const DASHBOARD_STARTUPS = [
  {
    name: 'Vertex Robotics',
    initial: 'V',
    blurb: 'Needs a frontend partner for their product MVP — remote friendly.',
  },
  {
    name: 'Sahaay Finance',
    initial: 'S',
    blurb: 'Looking for partners with UI and customer research experience.',
  },
  {
    name: 'Lumen Health',
    initial: 'L',
    blurb: 'Partner opportunity in growth and lifecycle design.',
  },
]

const RECORDINGS = [
  { title: 'Frontend behavioral round', date: 'Jul 2, 2026' },
  { title: 'System design practice', date: 'Jun 24, 2026' },
]

const ACTIVITY = [
  { text: 'Application to Nimbus Cloud viewed by recruiter', colorClass: 'bg-primary' },
  { text: 'Interview scheduled with Skyline Systems', colorClass: 'bg-teal' },
  { text: 'Profile viewed 6 times this week', colorClass: 'bg-fog' },
]

export default function CandidateDashboardPage() {
  const [showNudge, setShowNudge] = useState(true)
  const completionPercent = profileCompletionPercent(candidateProfile.completedSections)

  const matchedJobs = useMemo(() => {
    const skillSet = new Set(candidateProfile.skills.map((skill) => skill.toLowerCase()))
    return opportunities.filter(
      (item): item is JobListing =>
        item.type === 'job' && item.tags.some((tag) => skillSet.has(tag.toLowerCase())),
    )
  }, [])

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="header:grid-cols-[minmax(0,1fr)_300px] grid grid-cols-1 gap-6">
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-card bg-gradient-to-br from-primary to-[#1B3FB0] p-[26px] text-white">
            <div>
              <h1 className="mb-1.5 text-[22px] font-extrabold">
                Welcome back, {candidateProfile.name.split(' ')[0]}
              </h1>
              <p className="text-sm text-[#C9D8FA]">
                Your profile is {completionPercent}% complete — finish it to unlock better matches.
              </p>
            </div>
            <Link
              to={ROUTES.candidateProfile}
              className="rounded-lg bg-white px-[18px] py-2.5 text-[13.5px] font-bold whitespace-nowrap text-primary no-underline"
            >
              Complete profile
            </Link>
          </div>

          {showNudge && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-card border border-[#FCE3B8] bg-amber-tint p-[18px]">
              <div className="flex items-center gap-3.5">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C2760C"
                  strokeWidth={2}
                  className="shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                <div>
                  <div className="text-[14.5px] font-bold text-ink">
                    It's been 47 days without an offer
                  </div>
                  <div className="text-[13.5px] text-slate">
                    A short training on income types has helped candidates in your field land roles
                    faster.
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2.5">
                <Link
                  to={ROUTES.community}
                  className="rounded-lg bg-amber px-4 py-2.5 text-[13.5px] font-bold text-white no-underline"
                >
                  Attend training
                </Link>
                <button
                  type="button"
                  onClick={() => setShowNudge(false)}
                  className="text-[13.5px] font-semibold text-fog"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold text-ink">Jobs matched to your skills</h2>
            <Link to={ROUTES.jobs} className="text-[13.5px] font-bold text-primary no-underline">
              Search jobs →
            </Link>
          </div>
          {matchedJobs.length === 0 ? (
            <div className="mb-7 rounded-xl border border-dashed border-[#D7DBE2] bg-surface p-7 text-center">
              <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-neutral-tint">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8891A0"
                  strokeWidth={2}
                >
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div className="mb-1.5 text-[14.5px] font-bold text-ink">
                No jobs matching your skills right now
              </div>
              <p className="mx-auto mb-4 max-w-[420px] text-[13.5px] leading-[1.55] text-slate">
                We'll notify you the moment a matching role opens up. Meanwhile, the startups and
                community roles below can build experience toward it.
              </p>
              <Link
                to={ROUTES.jobs}
                className="inline-block rounded-lg border border-border bg-surface px-[18px] py-2.5 text-[13.5px] font-bold text-ink no-underline"
              >
                Broaden your search
              </Link>
            </div>
          ) : (
            <div className="mb-7 flex flex-col gap-3">
              {matchedJobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link
                        to={ROUTES.jobDetail(job.id)}
                        className="text-[14.5px] font-bold text-ink no-underline"
                      >
                        {job.title}
                      </Link>
                      <div className="mt-0.5 text-[13px] text-slate">
                        {job.company} · {job.salary}
                      </div>
                    </div>
                    <Link
                      to={ROUTES.jobDetail(job.id)}
                      className="rounded-lg bg-primary px-4 py-2 text-[13px] font-bold text-white no-underline"
                    >
                      View job
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold text-ink">Startups matching your skill set</h2>
            <Link
              to={ROUTES.partnerships}
              className="text-[13.5px] font-bold text-primary no-underline"
            >
              See all →
            </Link>
          </div>
          <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
            {DASHBOARD_STARTUPS.map((startup) => (
              <div
                key={startup.name}
                className="rounded-xl border border-border bg-surface px-[18px] py-4"
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF1DC] text-[13.5px] font-bold text-amber">
                    {startup.initial}
                  </div>
                  <div className="text-[14.5px] font-bold text-ink">{startup.name}</div>
                </div>
                <p className="mb-3 text-[13px] leading-[1.5] text-slate">{startup.blurb}</p>
                <Link
                  to={ROUTES.partnerships}
                  className="block rounded-lg bg-amber-tint py-2 text-center text-[13px] font-bold text-amber no-underline"
                >
                  Apply for partnership
                </Link>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-[#0B3B34] p-[22px]">
            <div>
              <div className="text-[14.5px] font-bold text-white">
                Curious about community income?
              </div>
              <div className="mt-0.5 text-[13px] text-[#B9E9DC]">
                Watch a 4-minute explainer, then tell us you're interested.
              </div>
            </div>
            <div className="flex gap-2.5">
              <Link
                to={ROUTES.community}
                className="rounded-lg bg-white px-4 py-2.5 text-[13px] font-bold text-[#0B3B34] no-underline"
              >
                Watch now
              </Link>
              <Link
                to={ROUTES.community}
                className="rounded-lg border border-[rgba(255,255,255,0.3)] px-4 py-2.5 text-[13px] font-bold text-white no-underline"
              >
                I'm interested
              </Link>
            </div>
          </div>
        </div>

        <aside className="header:order-none order-first">
          <Card className="mb-4 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[14.5px] font-bold text-ink">Profile strength</h3>
              <span className="text-[13px] font-bold text-primary">{completionPercent}%</span>
            </div>
            <div className="mb-3.5 h-2 overflow-hidden rounded-full bg-neutral-tint">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <Link
              to={ROUTES.candidateAddDetails}
              className="block rounded-lg border border-border py-2.5 text-center text-[13.5px] font-bold text-ink no-underline"
            >
              Add missing details
            </Link>
          </Card>

          <Card className="mb-4 p-5">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">Mock interviews</h3>
            <p className="mb-3.5 text-[13px] leading-[1.5] text-slate">
              Practice on camera and review your recorded sessions anytime.
            </p>
            <Link
              to={ROUTES.candidateMockInterview}
              className="mb-2.5 block rounded-lg bg-ink py-2.5 text-center text-[13.5px] font-bold text-white no-underline"
            >
              Start a mock interview
            </Link>
            {RECORDINGS.map((recording) => (
              <div
                key={recording.title}
                className="flex items-center justify-between border-t border-[#F0F1F3] py-2"
              >
                <div>
                  <div className="text-[13px] font-semibold text-ink">{recording.title}</div>
                  <div className="text-xs text-fog">{recording.date}</div>
                </div>
                <a
                  href="#"
                  onClick={(event) => event.preventDefault()}
                  className="text-[12.5px] font-bold text-primary no-underline"
                >
                  Watch
                </a>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">Application activity</h3>
            {ACTIVITY.map((entry) => (
              <div key={entry.text} className="flex gap-2.5 border-t border-[#F0F1F3] py-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${entry.colorClass}`} />
                <div className="text-[13px] leading-[1.5] text-[#3A414D]">{entry.text}</div>
              </div>
            ))}
          </Card>
        </aside>
      </div>
    </main>
  )
}
