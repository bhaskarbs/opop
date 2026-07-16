export type AdminIdeaSubmitterType = 'Candidate' | 'Company'

/** Admin's idea-review queue — a separate mock dataset from the public IDEAS list (mocks/ideas.ts),
 * representing freshly submitted ideas that haven't been reviewed yet. No backend for this
 * feature exists yet, so AdminIdeaApprovalsPage manages approve/reject entirely in local state. */
export interface AdminPendingIdea {
  id: string
  title: string
  category: string
  submitter: string
  submitterType: AdminIdeaSubmitterType
  submitted: string
  problem: string
  stage: string
  funding: string
  team: string
  timeline: string
}

export const ADMIN_PENDING_IDEAS: AdminPendingIdea[] = [
  {
    id: 'd1',
    title: 'Peer-to-peer skill bartering app',
    category: 'Social Impact',
    submitter: 'Ananya Desai',
    submitterType: 'Candidate',
    submitted: '2 days ago',
    problem:
      'Skilled people with no cash have no way to trade expertise directly for services they need.',
    stage: 'Concept',
    funding: '₹8,00,000',
    team: '3 people',
    timeline: '6 months',
  },
  {
    id: 'd2',
    title: 'AI-assisted regional language tutoring',
    category: 'Edtech',
    submitter: 'Vertex Robotics',
    submitterType: 'Company',
    submitted: '3 days ago',
    problem: 'Non-English speakers in tier-2 cities lack affordable, personalized tutoring.',
    stage: 'Prototype',
    funding: '₹35,00,000',
    team: '6 people',
    timeline: '12 months',
  },
  {
    id: 'd3',
    title: 'Subscription tool library for renters',
    category: 'D2C & Retail',
    submitter: 'Priya Nambiar',
    submitterType: 'Candidate',
    submitted: '5 days ago',
    problem: 'Renters buy tools they use once a year and then store forever.',
    stage: 'Concept',
    funding: '₹6,00,000',
    team: '2 people',
    timeline: '4 months',
  },
  {
    id: 'd4',
    title: 'Community-funded rooftop solar co-ops',
    category: 'Climate & Sustainability',
    submitter: 'Greenline Logistics',
    submitterType: 'Company',
    submitted: '1 week ago',
    problem: 'Individual households can’t afford solar, but a co-op could pool costs and savings.',
    stage: 'Concept',
    funding: '₹1,20,00,000',
    team: '5 people',
    timeline: '18 months',
  },
]
