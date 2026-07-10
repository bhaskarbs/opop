import { useMemo, useState } from 'react'

type Tab = 'candidates' | 'companies'

interface CandidateUser {
  name: string
  initial: string
  avatarColorClass: string
  email: string
  focus: string
  joined: string
  status: 'Active' | 'Pending verification' | 'Suspended'
}

interface CompanyUser {
  name: string
  sector: string
  cin: string
  date: string
  status: 'Verified' | 'Pending review' | 'Suspended'
}

const CANDIDATES: CandidateUser[] = [
  {
    name: 'Rohan Mehta',
    initial: 'R',
    avatarColorClass: 'bg-primary',
    email: 'rohan@email.com',
    focus: 'Jobs + Partnership',
    joined: 'Jun 12, 2026',
    status: 'Active',
  },
  {
    name: 'Anita Sharma',
    initial: 'A',
    avatarColorClass: 'bg-teal',
    email: 'anita@email.com',
    focus: 'Jobs',
    joined: 'May 28, 2026',
    status: 'Active',
  },
  {
    name: 'Karan Patel',
    initial: 'K',
    avatarColorClass: 'bg-amber',
    email: 'karan@email.com',
    focus: 'Community',
    joined: 'May 20, 2026',
    status: 'Active',
  },
  {
    name: 'Meera Iyer',
    initial: 'M',
    avatarColorClass: 'bg-primary',
    email: 'meera@email.com',
    focus: 'Partnership',
    joined: 'Apr 30, 2026',
    status: 'Pending verification',
  },
  {
    name: 'Vikram Rao',
    initial: 'V',
    avatarColorClass: 'bg-teal',
    email: 'vikram@email.com',
    focus: 'Jobs',
    joined: 'Apr 14, 2026',
    status: 'Suspended',
  },
  {
    name: 'Divya Nair',
    initial: 'D',
    avatarColorClass: 'bg-amber',
    email: 'divya@email.com',
    focus: 'Jobs + Community',
    joined: 'Mar 22, 2026',
    status: 'Active',
  },
]

const COMPANIES: CompanyUser[] = [
  {
    name: 'Vertex Robotics Pvt. Ltd.',
    sector: 'Deep Tech',
    cin: 'U74999KA2021PTC145632',
    date: 'Jul 6, 2026',
    status: 'Verified',
  },
  {
    name: 'Lumen Health Solutions',
    sector: 'Healthtech',
    cin: 'U85100MH2020PTC338211',
    date: 'Jul 5, 2026',
    status: 'Verified',
  },
  {
    name: 'Sahaay Finance Ltd.',
    sector: 'Fintech',
    cin: 'U65999DL2022PTC401987',
    date: 'Jul 4, 2026',
    status: 'Pending review',
  },
  {
    name: 'Greenline Logistics',
    sector: 'Climate Tech',
    cin: 'U60232KA2019PTC121044',
    date: 'Jul 3, 2026',
    status: 'Verified',
  },
  {
    name: 'Northstar EdTech',
    sector: 'Education',
    cin: 'U80903TN2023PTC167754',
    date: 'Jul 2, 2026',
    status: 'Pending review',
  },
  {
    name: 'Kinship Consumer',
    sector: 'D2C',
    cin: 'U74999MH2021PTC298765',
    date: 'Jun 28, 2026',
    status: 'Suspended',
  },
]

const CANDIDATE_STATUS_CLASS: Record<CandidateUser['status'], string> = {
  Active: 'bg-teal-tint text-teal',
  'Pending verification': 'bg-amber-tint text-amber',
  Suspended: 'bg-danger/10 text-danger',
}

const COMPANY_STATUS_CLASS: Record<CompanyUser['status'], string> = {
  Verified: 'bg-teal-tint text-teal',
  'Pending review': 'bg-amber-tint text-amber',
  Suspended: 'bg-danger/10 text-danger',
}

export default function AdminUsersPage() {
  const [tab, setTab] = useState<Tab>('candidates')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')

  const statusOptions =
    tab === 'candidates'
      ? ['All statuses', 'Active', 'Pending verification', 'Suspended']
      : ['All statuses', 'Verified', 'Pending review', 'Suspended']

  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CANDIDATES.filter((candidate) => {
      if (
        q &&
        !candidate.name.toLowerCase().includes(q) &&
        !candidate.email.toLowerCase().includes(q)
      )
        return false
      if (status !== 'All statuses' && candidate.status !== status) return false
      return true
    })
  }, [query, status])

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase()
    return COMPANIES.filter((company) => {
      if (q && !company.name.toLowerCase().includes(q)) return false
      if (status !== 'All statuses' && company.status !== status) return false
      return true
    })
  }, [query, status])

  function switchTab(next: Tab) {
    setTab(next)
    setStatus('All statuses')
  }

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="mb-5">
        <h1 className="mb-1 text-[22px] font-extrabold text-ink">Users</h1>
        <p className="text-sm text-slate">
          Manage candidates and company accounts across the platform.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchTab('candidates')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'candidates'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          Candidates
        </button>
        <button
          type="button"
          onClick={() => switchTab('companies')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'companies'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          Companies
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5 rounded-card border border-border bg-surface p-4">
        <div className="flex min-w-[220px] flex-[2] items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
          <svg
            width="16"
            height="16"
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
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            className="w-full text-[13.5px] text-ink outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-border px-3 py-2.5 text-[13.5px] text-ink"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {tab === 'candidates' ? (
        <div className="flex flex-col gap-3">
          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.email}
              className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface px-5 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${candidate.avatarColorClass}`}
                >
                  {candidate.initial}
                </span>
                <div className="min-w-0">
                  <div className="text-[14.5px] font-bold text-ink">{candidate.name}</div>
                  <div className="text-[13px] text-slate">
                    {candidate.email} · {candidate.focus} · Joined {candidate.joined}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${CANDIDATE_STATUS_CLASS[candidate.status]}`}
                >
                  {candidate.status}
                </span>
                <button
                  type="button"
                  className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
          {filteredCandidates.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
              No candidates match your search.
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredCompanies.map((company) => (
            <div
              key={company.name}
              className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface px-5 py-4"
            >
              <div className="min-w-0">
                <div className="text-[14.5px] font-bold text-ink">{company.name}</div>
                <div className="text-[13px] text-slate">
                  {company.sector} · <span className="font-mono text-[12.5px]">{company.cin}</span>{' '}
                  · Registered {company.date}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${COMPANY_STATUS_CLASS[company.status]}`}
                >
                  {company.status}
                </span>
                <button
                  type="button"
                  className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
          {filteredCompanies.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
              No companies match your search.
            </div>
          )}
        </div>
      )}
    </main>
  )
}
