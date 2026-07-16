import type { IdeaStage } from './ideas'

export type MyIdeaStatus = 'Approved' | 'Pending review' | 'Rejected'
export type ApplicantRole = 'Investor' | 'Participant'

export interface MyIdeaApplicant {
  name: string
  role: ApplicantRole
  note: string
  date: string
}

/** The signed-in candidate's own submitted ideas — mock only, same as IdeasBrowse/IdeaDetail
 * (see mocks/ideas.ts). MyIdeasPage and IdeaSubmitPage (edit mode) both read from this list. */
export interface MyIdea {
  id: string
  title: string
  category: string
  stage: IdeaStage
  submitted: string
  status: MyIdeaStatus
  applicants: MyIdeaApplicant[]
}

export const MY_IDEAS: MyIdea[] = [
  {
    id: 'i1',
    title: 'Micro-warehousing for D2C sellers',
    category: 'D2C & Retail',
    stage: 'Live',
    submitted: 'Jun 18, 2026',
    status: 'Approved',
    applicants: [
      {
        name: 'Fatima Sheikh',
        role: 'Investor',
        note: 'Ticket size: ₹5,00,000. Interested in D2C logistics.',
        date: 'Jul 10, 2026',
      },
      {
        name: 'Devika Menon',
        role: 'Participant',
        note: 'Has 3 years in warehouse operations, wants to join full-time.',
        date: 'Jul 8, 2026',
      },
    ],
  },
  {
    id: 'i2',
    title: 'Peer-to-peer skill bartering app',
    category: 'Social Impact & Community',
    stage: 'Concept',
    submitted: 'Jul 2, 2026',
    status: 'Pending review',
    applicants: [
      {
        name: 'Arjun Subramaniam',
        role: 'Participant',
        note: 'Frontend developer, wants to build the MVP.',
        date: 'Jul 9, 2026',
      },
    ],
  },
  {
    id: 'i3',
    title: 'Subscription tool library for renters',
    category: 'D2C & Retail',
    stage: 'Concept',
    submitted: 'Jun 5, 2026',
    status: 'Rejected',
    applicants: [],
  },
]
