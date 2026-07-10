import { type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import {
  candidateProfile,
  PROFILE_CHECKLIST,
  profileCompletionPercent,
  type ChecklistKey,
} from '../../mocks/candidateProfile'
import { ROUTES } from '../../routes/paths'

function CheckIcon() {
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-teal">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

function SectionCard({
  title,
  description,
  done,
  children,
}: {
  title: string
  description: string
  done: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`relative mb-[18px] rounded-card p-[26px] ${
        done ? 'border border-border bg-surface opacity-60' : 'border-2 border-[#FCE3B8] bg-surface'
      }`}
    >
      <span
        className={`absolute top-5 right-[26px] rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${
          done ? 'bg-teal-tint text-teal' : 'bg-amber-tint text-amber'
        }`}
      >
        {done ? 'Complete' : 'Missing'}
      </span>
      <h2 className="mb-1.5 text-base font-bold text-ink">{title}</h2>
      <p className="mb-3.5 text-[13px] text-fog">{description}</p>
      {children}
    </div>
  )
}

export default function AddMissingDetailsPage() {
  const [completed, setCompleted] = useState(candidateProfile.completedSections)
  const [lifeGoals, setLifeGoals] = useState('')
  const [workCulture, setWorkCulture] = useState('')
  const [mobile, setMobile] = useState(candidateProfile.mobile)
  const [workMode, setWorkMode] = useState('Remote')
  const [openTo, setOpenTo] = useState('Jobs only')

  const completionPercent = profileCompletionPercent(completed)

  function markDone(key: ChecklistKey) {
    setCompleted((prev) => ({ ...prev, [key]: true }))
  }

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16">
      <div className="profile:grid-cols-[260px_minmax(0,1fr)] grid grid-cols-1 gap-6">
        <aside className="profile:order-none order-first">
          <div className="sticky top-[88px] rounded-card border border-border bg-surface p-[22px]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">Profile strength</span>
              <span className="text-[13px] font-bold text-primary">{completionPercent}%</span>
            </div>
            <div className="mb-[18px] h-2 overflow-hidden rounded-full bg-neutral-tint">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="mb-3 text-[12.5px] font-bold tracking-[0.04em] text-fog uppercase">
              Still missing
            </div>
            {PROFILE_CHECKLIST.map((item) => {
              const done = completed[item.key]
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-2.5 border-t border-[#F0F1F3] py-2.5"
                >
                  {done ? (
                    <CheckIcon />
                  ) : (
                    <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-[#D7DBE2]" />
                  )}
                  <span className={`text-[13.5px] font-semibold ${done ? 'text-fog' : 'text-ink'}`}>
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        </aside>

        <div>
          <h1 className="mb-1 text-xl font-extrabold text-ink">Add missing details</h1>
          <p className="mb-6 text-sm text-slate">
            Finish these to unlock better job, partnership, and community matches.
          </p>

          <SectionCard
            title="Life goals & values"
            description="Shared with startups when you apply for a partnership — helps them assess fit beyond your resume."
            done={completed.goals}
          >
            <textarea
              rows={3}
              value={lifeGoals}
              onChange={(event) => setLifeGoals(event.target.value)}
              placeholder="What are you working toward?"
              className="mb-3.5 w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
            <textarea
              rows={3}
              value={workCulture}
              onChange={(event) => setWorkCulture(event.target.value)}
              placeholder="What ethics and work culture matter most to you?"
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
            <Button type="button" onClick={() => markDone('goals')} className="mt-4">
              Save
            </Button>
          </SectionCard>

          <SectionCard
            title="Mobile number verification"
            description="Verify your number so employers and startups can reach you and you receive OTP logins."
            done={completed.mobile}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="flex items-center rounded-control border border-border px-3 text-sm text-slate">
                +91
              </div>
              <input
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                className="min-w-[160px] flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
              <button
                type="button"
                className="rounded-control border border-border px-[18px] text-[13.5px] font-bold text-primary"
              >
                Send OTP
              </button>
            </div>
            <Button type="button" onClick={() => markDone('mobile')}>
              Verify & save
            </Button>
          </SectionCard>

          <SectionCard
            title="Work preferences"
            description="Helps us match jobs, partnerships, and community roles to how you want to work."
            done={completed.prefs}
          >
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col">
                <label htmlFor="work-mode" className="mb-1.5 text-[13px] font-bold text-ink">
                  Work mode
                </label>
                <select
                  id="work-mode"
                  value={workMode}
                  onChange={(event) => setWorkMode(event.target.value)}
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                >
                  <option>Remote</option>
                  <option>Hybrid</option>
                  <option>On-site</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label htmlFor="open-to" className="mb-1.5 text-[13px] font-bold text-ink">
                  Open to
                </label>
                <select
                  id="open-to"
                  value={openTo}
                  onChange={(event) => setOpenTo(event.target.value)}
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                >
                  <option>Jobs only</option>
                  <option>Jobs & partnerships</option>
                  <option>Jobs, partnerships & community roles</option>
                </select>
              </div>
            </div>
            <Button type="button" onClick={() => markDone('prefs')} className="mt-4">
              Save
            </Button>
          </SectionCard>

          <div className="rounded-card border border-border bg-surface p-[26px] opacity-60">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">Skills</h2>
              <span className="rounded-full bg-teal-tint px-2.5 py-[3px] text-[11.5px] font-bold text-teal">
                Complete
              </span>
            </div>
            <p className="text-[13px] text-fog">
              {candidateProfile.skills.length} skills added — nice work.
            </p>
          </div>

          {completionPercent === 100 && (
            <p className="mt-5 text-sm font-semibold text-teal">
              Your profile is complete!{' '}
              <Link to={ROUTES.candidateDashboard} className="underline">
                Back to dashboard
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
