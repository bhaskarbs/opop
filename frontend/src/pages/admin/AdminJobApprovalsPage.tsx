import { useState } from 'react'
import { DecisionActions, type Decision } from './shared/DecisionActions'
import { FlagBadge } from './shared/FlagBadge'

type ListingType = 'Job' | 'Partnership' | 'Community'

interface Listing {
  id: string
  type: ListingType
  title: string
  company: string
  location: string
  submitted: string
  summary: string
  flags: string[]
  icon: string
}

const TYPE_STYLES: Record<
  ListingType,
  { iconColor: string; iconBgClass: string; tagClass: string }
> = {
  Job: {
    iconColor: '#2451D6',
    iconBgClass: 'bg-primary-tint',
    tagClass: 'bg-primary-tint text-primary',
  },
  Partnership: {
    iconColor: '#C2760C',
    iconBgClass: 'bg-[#FFF1DC]',
    tagClass: 'bg-amber-tint text-amber',
  },
  Community: {
    iconColor: '#0F8A6B',
    iconBgClass: 'bg-[#E1F5EE]',
    tagClass: 'bg-teal-tint text-teal',
  },
}

const LISTINGS: Listing[] = [
  {
    id: 'j1',
    type: 'Job',
    title: 'Senior Frontend Developer',
    company: 'Nimbus Cloud',
    location: 'Bengaluru · Hybrid',
    submitted: '2 hours ago',
    summary:
      'Senior React role rebuilding the customer analytics dashboard. Salary ₹18L–24L, full-time, hybrid.',
    flags: [],
    icon: 'M3 7h18v13H3zM3 7l9-4 9 4',
  },
  {
    id: 'p1',
    type: 'Partnership',
    title: 'Frontend Partner — Product MVP',
    company: 'Vertex Robotics',
    location: 'Remote',
    submitted: '5 hours ago',
    summary:
      'Equity-linked partnership to co-build the product MVP. No stipend disclosed yet — flagged for clarification.',
    flags: ['Compensation terms unclear'],
    icon: 'M12 2l3 6 6 1-4.5 4.5L17.5 20 12 17l-5.5 3 1-6.5L3 9l6-1z',
  },
  {
    id: 'c1',
    type: 'Community',
    title: 'Peer Mentor Circle — Tech Careers',
    company: 'OpenOpportunity Community',
    location: 'Bengaluru · Online',
    submitted: '1 day ago',
    summary:
      'Weekly peer mentoring circle for interview and communication practice — recurring session, no cost to candidates.',
    flags: [],
    icon: 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M9 8a3 3 0 1 0 0 6M17 9a2.5 2.5 0 1 0 0 5',
  },
  {
    id: 'j2',
    type: 'Job',
    title: 'React Developer',
    company: 'Bharat Retail Tech',
    location: 'Pune · On-site',
    submitted: '2 days ago',
    summary:
      'Duplicate listing detected — same title and description posted twice within 48 hours.',
    flags: ['Possible duplicate listing'],
    icon: 'M3 7h18v13H3zM3 7l9-4 9 4',
  },
]

const STATUS_STYLES: Record<Decision, string> = {
  pending: 'bg-amber-tint text-amber',
  approved: 'bg-teal-tint text-teal',
  rejected: 'bg-danger/10 text-danger',
}

const STATUS_LABEL: Record<Decision, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default function AdminJobApprovalsPage() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})

  function getDecision(id: string): Decision {
    return decisions[id] ?? 'pending'
  }

  const pendingCount = LISTINGS.filter((listing) => getDecision(listing.id) === 'pending').length

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">Job approvals</h1>
          <p className="text-sm text-slate">
            Review new job, partnership, and community postings before they go live.
          </p>
        </div>
        <div className="rounded-full bg-amber-tint px-3.5 py-1.5 text-[13.5px] font-bold text-amber">
          {pendingCount} pending review
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {LISTINGS.map((listing) => {
          const decision = getDecision(listing.id)
          const styles = TYPE_STYLES[listing.type]
          return (
            <div key={listing.id} className="rounded-card border border-border bg-surface p-[22px]">
              <div className="mb-3.5 flex flex-wrap justify-between gap-4">
                <div className="flex gap-3.5">
                  <div
                    className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] ${styles.iconBgClass}`}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={styles.iconColor}
                      strokeWidth={2}
                    >
                      <path d={listing.icon} />
                    </svg>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15.5px] font-bold text-ink">{listing.title}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles.tagClass}`}
                      >
                        {listing.type}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-slate">
                      {listing.company} · {listing.location} · Submitted {listing.submitted}
                    </div>
                  </div>
                </div>
                <span
                  className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[decision]}`}
                >
                  {STATUS_LABEL[decision]}
                </span>
              </div>

              <p className="mb-3 text-[13.5px] leading-[1.6] text-slate">{listing.summary}</p>

              {listing.flags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {listing.flags.map((flag) => (
                    <FlagBadge key={flag} label={flag} />
                  ))}
                </div>
              )}

              <DecisionActions
                status={decision}
                onApprove={() => setDecisions((prev) => ({ ...prev, [listing.id]: 'approved' }))}
                onReject={() => setDecisions((prev) => ({ ...prev, [listing.id]: 'rejected' }))}
                approveLabel="Approve"
                approvedText="Approved — now live on the platform"
                extraButtonLabel="View full listing"
              />
            </div>
          )
        })}
      </div>
    </main>
  )
}
