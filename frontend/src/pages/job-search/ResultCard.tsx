import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import type { Opportunity } from '../../mocks/jobs'
import { ROUTES } from '../../routes/paths'

function PartnershipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C2760C" strokeWidth={2}>
      <path d="M12 2l3 6 6 1-4.5 4.5L17.5 20 12 17l-5.5 3 1-6.5L3 9l6-1z" />
    </svg>
  )
}

function CommunityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F8A6B" strokeWidth={2}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 14.5c2.6.2 4.5 2.4 4.5 5" />
    </svg>
  )
}

function JobCard({ job }: { job: Extract<Opportunity, { type: 'job' }> }) {
  const [saved, setSaved] = useState(false)

  return (
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
  )
}

function PartnershipCard({ item }: { item: Extract<Opportunity, { type: 'partnership' }> }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] bg-[#FFF1DC]">
        <PartnershipIcon />
      </div>
      <div className="min-w-0 flex-1">
        <span className="rounded-full bg-amber-tint px-2.5 py-[3px] text-[11.5px] font-bold text-amber">
          Matches your skills · Partnership
        </span>
        <div className="mt-2 text-[16.5px] font-bold text-ink">{item.title}</div>
        <div className="mt-0.5 text-sm text-slate">
          {item.company} · {item.location}
        </div>
        <p className="my-2.5 text-[13.5px] leading-[1.55] text-slate">{item.blurb}</p>
        <Link
          to={ROUTES.partnerships}
          className="inline-block rounded-lg bg-amber px-[18px] py-2.5 text-[13.5px] font-bold text-white no-underline"
        >
          Apply for partnership
        </Link>
      </div>
    </div>
  )
}

function CommunityCard({ item }: { item: Extract<Opportunity, { type: 'community' }> }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] bg-[#E1F5EE]">
        <CommunityIcon />
      </div>
      <div className="min-w-0 flex-1">
        <span className="rounded-full bg-teal-tint px-2.5 py-[3px] text-[11.5px] font-bold text-teal">
          Builds soft skills · Community
        </span>
        <div className="mt-2 text-[16.5px] font-bold text-ink">{item.title}</div>
        <div className="mt-0.5 text-sm text-slate">{item.org}</div>
        <p className="my-2.5 text-[13.5px] leading-[1.55] text-slate">{item.blurb}</p>
        <Link
          to={ROUTES.community}
          className="inline-block rounded-lg bg-teal px-[18px] py-2.5 text-[13.5px] font-bold text-white no-underline"
        >
          Show interest
        </Link>
      </div>
    </div>
  )
}

export function ResultCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <Card className="p-5">
      {opportunity.type === 'job' && <JobCard job={opportunity} />}
      {opportunity.type === 'partnership' && <PartnershipCard item={opportunity} />}
      {opportunity.type === 'community' && <CommunityCard item={opportunity} />}
    </Card>
  )
}
