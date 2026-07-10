import { useState } from 'react'
import { DecisionActions, type Decision } from './shared/DecisionActions'
import { FlagBadge } from './shared/FlagBadge'

interface CompanyApproval {
  id: string
  name: string
  initial: string
  avatarColorClass: string
  sector: string
  entityType: string
  submitted: string
  cin: string
  gstin: string
  pan: string
  signatory: string
  flags: string[]
}

const COMPANIES: CompanyApproval[] = [
  {
    id: 'co1',
    name: 'Sahaay Finance Ltd.',
    initial: 'S',
    avatarColorClass: 'bg-amber',
    sector: 'Fintech',
    entityType: 'Private Limited',
    submitted: '1 day ago',
    cin: 'U65999DL2022PTC401987',
    gstin: '07ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    signatory: 'Priya Nambiar',
    flags: [],
  },
  {
    id: 'co2',
    name: 'Northstar EdTech',
    initial: 'N',
    avatarColorClass: 'bg-primary',
    sector: 'Education',
    entityType: 'Private Limited',
    submitted: '2 days ago',
    cin: 'U80903TN2023PTC167754',
    gstin: '33ABCDE5678F1Z2',
    pan: 'FGHIJ5678K',
    signatory: 'Arjun Subramaniam',
    flags: ['GSTIN could not be auto-verified'],
  },
  {
    id: 'co3',
    name: 'Kinship Consumer',
    initial: 'K',
    avatarColorClass: 'bg-teal',
    sector: 'D2C',
    entityType: 'Private Limited',
    submitted: '3 days ago',
    cin: 'U74999MH2021PTC298765',
    gstin: '27KLMNO9012P1Z8',
    pan: 'KLMNO9012P',
    signatory: 'Fatima Sheikh',
    flags: [],
  },
  {
    id: 'co4',
    name: 'Bharat Retail Tech',
    initial: 'B',
    avatarColorClass: 'bg-amber',
    sector: 'Retail Tech',
    entityType: 'LLP',
    submitted: '4 days ago',
    cin: 'AAA-1234',
    gstin: '06PQRST3456U1Z1',
    pan: 'PQRST3456U',
    signatory: 'Devika Menon',
    flags: ['CIN format does not match LLPIN pattern', 'Registered address unverifiable'],
  },
]

const STATUS_STYLES: Record<Decision, string> = {
  pending: 'bg-amber-tint text-amber',
  approved: 'bg-teal-tint text-teal',
  rejected: 'bg-danger/10 text-danger',
}

const STATUS_LABEL: Record<Decision, string> = {
  pending: 'Pending review',
  approved: 'Verified',
  rejected: 'Rejected',
}

export default function AdminCompanyApprovalsPage() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})

  function getDecision(id: string): Decision {
    return decisions[id] ?? 'pending'
  }

  const pendingCount = COMPANIES.filter((company) => getDecision(company.id) === 'pending').length

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">Company approvals</h1>
          <p className="text-sm text-slate">
            Verify company registrations against MCA records before they can post jobs or
            partnerships.
          </p>
        </div>
        <div className="rounded-full bg-amber-tint px-3.5 py-1.5 text-[13.5px] font-bold text-amber">
          {pendingCount} pending review
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {COMPANIES.map((company) => {
          const decision = getDecision(company.id)
          return (
            <div key={company.id} className="rounded-card border border-border bg-surface p-[22px]">
              <div className="mb-4 flex flex-wrap justify-between gap-4">
                <div className="flex gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-base font-bold text-white ${company.avatarColorClass}`}
                  >
                    {company.initial}
                  </div>
                  <div>
                    <div className="text-[15.5px] font-bold text-ink">{company.name}</div>
                    <div className="mt-0.5 text-[13px] text-slate">
                      {company.sector} · {company.entityType} · Submitted {company.submitted}
                    </div>
                  </div>
                </div>
                <span
                  className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[decision]}`}
                >
                  {STATUS_LABEL[decision]}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 rounded-[10px] bg-page p-4">
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    CIN / LLPIN
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-ink">{company.cin}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    GSTIN
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-ink">
                    {company.gstin}
                  </div>
                </div>
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    PAN
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-ink">{company.pan}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-[11.5px] tracking-[0.03em] text-fog uppercase">
                    Authorized signatory
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{company.signatory}</div>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2451D6"
                  strokeWidth={1.8}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                <a
                  href="#"
                  onClick={(event) => event.preventDefault()}
                  className="text-[13.5px] font-semibold text-primary no-underline"
                >
                  Certificate_of_Incorporation.pdf
                </a>
              </div>

              {company.flags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {company.flags.map((flag) => (
                    <FlagBadge key={flag} label={flag} />
                  ))}
                </div>
              )}

              <DecisionActions
                status={decision}
                onApprove={() => setDecisions((prev) => ({ ...prev, [company.id]: 'approved' }))}
                onReject={() => setDecisions((prev) => ({ ...prev, [company.id]: 'rejected' }))}
                approveLabel="Verify & approve"
                approvedText="Verified — company can now post jobs and partnerships"
                extraButtonLabel="Request more info"
              />
            </div>
          )
        })}
      </div>
    </main>
  )
}
