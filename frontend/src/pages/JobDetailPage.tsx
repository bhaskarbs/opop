import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../components/ui'
import { opportunities, type JobListing } from '../mocks/jobs'
import { ROUTES } from '../routes/paths'

function findSimilarJobs(current: JobListing, count = 3): JobListing[] {
  const otherJobs = opportunities.filter(
    (item): item is JobListing => item.type === 'job' && item.id !== current.id,
  )
  const scored = otherJobs
    .map((job) => ({
      job,
      sharedTags: job.tags.filter((tag) => current.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.sharedTags - a.sharedTags)
  return scored.slice(0, count).map((entry) => entry.job)
}

function NotFound() {
  return (
    <main className="mx-auto max-w-[640px] px-6 py-24 text-center">
      <h1 className="mb-2 text-h2 text-ink">Job not found</h1>
      <p className="mb-6 text-body text-slate">
        This posting may have been removed or the link is incorrect.
      </p>
      <Link to={ROUTES.jobs} className="text-sm font-bold text-primary no-underline">
        ← Back to Job Search
      </Link>
    </main>
  )
}

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const job = opportunities.find(
    (item): item is JobListing => item.type === 'job' && item.id === jobId,
  )

  const [saved, setSaved] = useState(false)
  const [applied, setApplied] = useState(false)

  if (!job) {
    return <NotFound />
  }

  const similarJobs = findSimilarJobs(job)

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <div className="search:grid-cols-[minmax(0,1fr)_300px] grid grid-cols-1 gap-6">
        <div>
          <Card className="mb-5 p-7">
            <div className="flex flex-wrap justify-between gap-[18px]">
              <div className="flex gap-4">
                <div
                  className={`flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white ${job.avatarColorClass}`}
                >
                  {job.initial}
                </div>
                <div>
                  <h1 className="mb-1.5 text-[23px] font-extrabold tracking-[-0.01em] text-ink">
                    {job.title}
                  </h1>
                  <div className="text-[15px] text-slate">
                    {job.company} · {job.location}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...job.tags.filter((tag) => !tag.includes('yrs')), `${job.salary} / yr`].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-neutral-tint px-3 py-1 text-[12.5px] font-semibold text-[#3A414D]"
                        >
                          {tag}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => setSaved((prev) => !prev)}
                  className="rounded-control border border-border bg-surface px-[18px] py-2.5 text-sm font-bold text-ink"
                >
                  {saved ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  disabled={applied}
                  onClick={() => setApplied(true)}
                  className="rounded-control bg-primary px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-primary/50"
                >
                  {applied ? 'Applied ✓' : 'Apply now'}
                </button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#F0F1F3] pt-4 text-[13.5px] text-fog">
              <span>Posted {job.postedLabel}</span>
              <span>·</span>
              <span>{job.applicants} applicants</span>
              <span>·</span>
              <span>Sourced from {job.source}</span>
            </div>
          </Card>

          <Card className="mb-5 p-7">
            <h2 className="mb-3.5 text-[17px] font-bold text-ink">About the role</h2>
            <p className="mb-[18px] text-[14.5px] leading-[1.7] text-[#3A414D]">
              {job.description}
            </p>
            <h3 className="mb-2.5 text-[15px] font-bold text-ink">Responsibilities</h3>
            <ul className="mb-[18px] list-disc pl-5 text-[14.5px] leading-[1.8] text-[#3A414D]">
              {job.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className="mb-2.5 text-[15px] font-bold text-ink">Requirements</h3>
            <ul className="list-disc pl-5 text-[14.5px] leading-[1.8] text-[#3A414D]">
              {job.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>

          <Card className="p-7">
            <h2 className="mb-3.5 text-[17px] font-bold text-ink">About {job.company}</h2>
            <p className="text-[14.5px] leading-[1.7] text-[#3A414D]">{job.companyDescription}</p>
          </Card>
        </div>

        <aside className="search:order-none order-first">
          <div className="mb-4 rounded-card border border-[#FCE3B8] bg-amber-tint p-5">
            <span className="rounded-full bg-surface px-2.5 py-[3px] text-[11.5px] font-bold text-amber">
              While you wait
            </span>
            <h3 className="mt-3 mb-2 text-[15px] font-bold text-ink">
              Partner with a startup in this space
            </h3>
            <p className="mb-3.5 text-[13.5px] leading-[1.55] text-slate">
              Vertex Robotics needs a frontend partner right now — same skill set, real product,
              counts as experience.
            </p>
            <Link
              to={ROUTES.partnerships}
              className="block rounded-lg bg-amber py-2.5 text-center text-[13.5px] font-bold text-white no-underline"
            >
              View partnership
            </Link>
          </div>

          <div className="mb-4 rounded-card border border-[#C9EEDF] bg-teal-tint p-5">
            <span className="rounded-full bg-surface px-2.5 py-[3px] text-[11.5px] font-bold text-teal">
              Build soft skills
            </span>
            <h3 className="mt-3 mb-2 text-[15px] font-bold text-ink">Join a peer mentor circle</h3>
            <p className="mb-3.5 text-[13.5px] leading-[1.55] text-slate">
              Practice technical communication with peers weekly — useful for interviews like this
              one.
            </p>
            <Link
              to={ROUTES.community}
              className="block rounded-lg bg-teal py-2.5 text-center text-[13.5px] font-bold text-white no-underline"
            >
              Show interest
            </Link>
          </div>

          <Card className="p-5">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">Similar jobs</h3>
            {similarJobs.map((similar) => (
              <Link
                key={similar.id}
                to={ROUTES.jobDetail(similar.id)}
                className="block border-t border-[#F0F1F3] py-2.5 no-underline first:border-t-0"
              >
                <div className="text-sm font-semibold text-ink">{similar.title}</div>
                <div className="mt-0.5 text-[12.5px] text-fog">
                  {similar.company} · {similar.salary}
                </div>
              </Link>
            ))}
          </Card>
        </aside>
      </div>
    </main>
  )
}
