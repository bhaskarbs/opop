import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { ROUTES } from '../../routes/paths'
import type { DisplayJob } from './jobDisplay'

export function ResultCard({ job }: { job: DisplayJob }) {
  const [saved, setSaved] = useState(false)

  return (
    <Card className="p-5">
      <div className="flex gap-4">
        <div
          className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] text-[16px] font-bold text-white ${job.avatarColorClass}`}
        >
          {job.initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap justify-between gap-2.5">
            <div>
              <Link
                to={ROUTES.jobDetail(job.id)}
                className="text-[16.5px] font-bold text-ink no-underline"
              >
                {job.title}
              </Link>
              <div className="mt-0.5 text-sm text-slate">
                {job.company} · {job.location}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSaved((prev) => !prev)}
              className="h-[38px] rounded-lg border border-border bg-surface px-[18px] text-[13.5px] font-bold whitespace-nowrap text-ink"
            >
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <div className="my-3 flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-neutral-tint px-2.5 py-1 text-[12px] font-semibold text-[#3A414D]"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-[13.5px] text-slate">
              {job.salary} · {job.postedLabel} ·{' '}
              <span className={`font-semibold ${job.sourceColorClass}`}>{job.source}</span>
            </div>
            <Link
              to={ROUTES.jobDetail(job.id)}
              className="rounded-lg bg-primary px-[18px] py-2.5 text-[13.5px] font-bold text-white no-underline"
            >
              Apply now
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}
