import { useState } from 'react'

type ApplicationType = 'Job' | 'Partnership' | 'Community'

type ApplicationStatus =
  | 'Interview scheduled'
  | 'Under review'
  | 'Applied'
  | 'Invited to session'
  | 'Not selected'
  | 'Seminar invite sent'

interface Application {
  title: string
  org: string
  applied: string
  type: ApplicationType
  status: ApplicationStatus
}

const TYPE_STYLES: Record<
  ApplicationType,
  { icon: string; strokeColor: string; iconBgClass: string; tagClass: string }
> = {
  Job: {
    icon: 'M3 7h18v13H3zM3 7l9-4 9 4',
    strokeColor: '#2451D6',
    iconBgClass: 'bg-primary-tint',
    tagClass: 'bg-primary-tint text-primary',
  },
  Partnership: {
    icon: 'M12 2l3 6 6 1-4.5 4.5L17.5 20 12 17l-5.5 3 1-6.5L3 9l6-1z',
    strokeColor: '#C2760C',
    iconBgClass: 'bg-warning-tint',
    tagClass: 'bg-amber-tint text-amber',
  },
  Community: {
    icon: 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M9 8a3 3 0 1 0 0 6',
    strokeColor: '#0F8A6B',
    iconBgClass: 'bg-[#E1F5EE]',
    tagClass: 'bg-teal-tint text-teal',
  },
}

const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  'Interview scheduled': 'bg-teal-tint text-teal',
  'Under review': 'bg-warning-tint text-warning',
  Applied: 'bg-neutral-tint text-slate',
  'Invited to session': 'bg-teal-tint text-teal',
  'Not selected': 'bg-[#FDECEC] text-danger',
  'Seminar invite sent': 'bg-teal-tint text-teal',
}

const APPLICATIONS: Application[] = [
  {
    title: 'Senior Frontend Developer',
    org: 'Nimbus Cloud',
    applied: '3 days ago',
    type: 'Job',
    status: 'Interview scheduled',
  },
  {
    title: 'Frontend Partner — Product MVP',
    org: 'Vertex Robotics',
    applied: '5 days ago',
    type: 'Partnership',
    status: 'Under review',
  },
  {
    title: 'React Developer',
    org: 'Bharat Retail Tech',
    applied: '1 week ago',
    type: 'Job',
    status: 'Applied',
  },
  {
    title: 'Peer Mentor Circle — Tech Careers',
    org: 'OpenOpportunity Community',
    applied: '1 week ago',
    type: 'Community',
    status: 'Invited to session',
  },
  {
    title: 'UI Engineer',
    org: 'Skyline Systems',
    applied: '2 weeks ago',
    type: 'Job',
    status: 'Not selected',
  },
  {
    title: 'Growth & Lifecycle Partner',
    org: 'Lumen Health',
    applied: '3 weeks ago',
    type: 'Partnership',
    status: 'Seminar invite sent',
  },
  {
    title: 'Full-Stack Developer',
    org: 'Sahaay Finance',
    applied: '1 month ago',
    type: 'Job',
    status: 'Under review',
  },
  {
    title: 'Founding Frontend Partner',
    org: 'Sahaay Finance',
    applied: '1 month ago',
    type: 'Partnership',
    status: 'Applied',
  },
  {
    title: 'Frontend Engineer — Platform',
    org: 'Lumen Health',
    applied: '1 month ago',
    type: 'Job',
    status: 'Applied',
  },
]

const TAB_FILTERS = ['All', 'Jobs', 'Partnerships', 'Community'] as const
type TabFilter = (typeof TAB_FILTERS)[number]

const TAB_TO_TYPE: Record<Exclude<TabFilter, 'All'>, ApplicationType> = {
  Jobs: 'Job',
  Partnerships: 'Partnership',
  Community: 'Community',
}

function tabCount(tab: TabFilter): number {
  if (tab === 'All') return APPLICATIONS.length
  return APPLICATIONS.filter((application) => application.type === TAB_TO_TYPE[tab]).length
}

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>('All')

  const visible =
    activeTab === 'All'
      ? APPLICATIONS
      : APPLICATIONS.filter((application) => application.type === TAB_TO_TYPE[activeTab])

  return (
    <main className="mx-auto max-w-[1000px] px-6 pt-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">My applications</h1>
      <p className="mb-5 text-sm text-slate">
        Track every job, partnership, and community application in one place.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {TAB_FILTERS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
              tab === activeTab
                ? 'border-ink bg-ink text-white'
                : 'border-border bg-surface text-[#3A414D]'
            }`}
          >
            {tab} ({tabCount(tab)})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((application) => {
          const typeStyle = TYPE_STYLES[application.type]
          return (
            <div
              key={application.title}
              className="flex flex-wrap items-center justify-between gap-3.5 rounded-card border border-border bg-surface px-5 py-[18px]"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div
                  className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[10px] ${typeStyle.iconBgClass}`}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={typeStyle.strokeColor}
                    strokeWidth="2"
                  >
                    <path d={typeStyle.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-bold text-ink">{application.title}</span>
                    <span
                      className={`rounded-full px-[9px] py-0.5 text-[11px] font-bold ${typeStyle.tagClass}`}
                    >
                      {application.type}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[13px] text-slate">
                    {application.org} · Applied {application.applied}
                  </div>
                </div>
              </div>
              <span
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold whitespace-nowrap ${STATUS_CLASSES[application.status]}`}
              >
                {application.status}
              </span>
            </div>
          )
        })}
      </div>
    </main>
  )
}
