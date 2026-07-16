export type IdeaStage = 'Concept' | 'Prototype' | 'Live'
export type IdeaSubmitterType = 'Candidate' | 'Company'

/** Public community ideas — same treatment as jobs/candidates mock data elsewhere: real
 * user-generated-style content, not translated UI copy. There's no backend for this feature
 * yet, so IdeasBrowsePage/IdeaDetailPage both read from this fixed list. */
export interface IdeaListing {
  id: string
  title: string
  category: string
  stage: IdeaStage
  problem: string
  solution: string
  targetMarket: string
  submitter: string
  submitterType: IdeaSubmitterType
  initial: string
  avatarColorClass: string
  funding: string
  equity: string
  teamSize: string
  timeline: string
  applicants: number
  submittedLabel: string
}

export const IDEA_CATEGORIES = [
  'Technology & SaaS',
  'Fintech',
  'Healthtech',
  'Edtech',
  'D2C & Retail',
  'Climate & Sustainability',
  'Agritech',
  'Social Impact & Community',
]

export const IDEAS: IdeaListing[] = [
  {
    id: 'idea-1',
    title: 'Peer-to-peer skill bartering app',
    category: 'Social Impact & Community',
    stage: 'Concept',
    problem:
      'Skilled people with no cash have no way to trade expertise directly for services they need.',
    solution:
      'A barter marketplace matching people offering a skill with people who need it, settling exchanges via a simple credit system instead of cash.',
    targetMarket: 'Underemployed skilled workers and small households across urban India.',
    submitter: 'Ananya Desai',
    submitterType: 'Candidate',
    initial: 'A',
    avatarColorClass: 'bg-primary',
    funding: '₹8L',
    equity: '10% equity',
    teamSize: '3 people',
    timeline: '6 months',
    applicants: 12,
    submittedLabel: 'Jun 22, 2026',
  },
  {
    id: 'idea-2',
    title: 'AI-assisted regional language tutoring',
    category: 'Edtech',
    stage: 'Prototype',
    problem: 'Non-English speakers in tier-2 cities lack affordable, personalized tutoring.',
    solution:
      'An AI tutor that teaches core subjects in regional languages, adapting pace and examples to each student.',
    targetMarket: 'School students in tier-2 and tier-3 Indian cities.',
    submitter: 'Vertex Robotics',
    submitterType: 'Company',
    initial: 'V',
    avatarColorClass: 'bg-teal',
    funding: '₹35L',
    equity: '12% equity',
    teamSize: '6 people',
    timeline: '12 months',
    applicants: 27,
    submittedLabel: 'Jun 25, 2026',
  },
  {
    id: 'idea-3',
    title: 'Micro-warehousing for D2C sellers',
    category: 'D2C & Retail',
    stage: 'Live',
    problem: 'Small D2C brands overpay for storage they only need seasonally.',
    solution:
      'A network of small, flexible warehouse spaces D2C sellers can rent by the week, with pooled last-mile delivery.',
    targetMarket: 'D2C brands doing under ₹5Cr annual revenue.',
    submitter: 'Rohan Mehta',
    submitterType: 'Candidate',
    initial: 'R',
    avatarColorClass: 'bg-primary',
    funding: '₹20L',
    equity: '8% equity or 15% rev-share',
    teamSize: '4 people',
    timeline: '8 months',
    applicants: 9,
    submittedLabel: 'Jun 18, 2026',
  },
  {
    id: 'idea-4',
    title: 'Community-funded rooftop solar co-ops',
    category: 'Climate & Sustainability',
    stage: 'Concept',
    problem: 'Individual households can’t afford solar, but a co-op could pool costs and savings.',
    solution:
      'A platform that lets neighborhoods pool funds to install shared rooftop solar, splitting the generated power and savings proportionally.',
    targetMarket: 'Residential societies and gated communities in tier-1 cities.',
    submitter: 'Greenline Logistics',
    submitterType: 'Company',
    initial: 'G',
    avatarColorClass: 'bg-teal',
    funding: '₹1.2Cr',
    equity: '6% equity',
    teamSize: '5 people',
    timeline: '18 months',
    applicants: 34,
    submittedLabel: 'Jun 10, 2026',
  },
  {
    id: 'idea-5',
    title: 'Soil-health sensors for smallholder farms',
    category: 'Agritech',
    stage: 'Prototype',
    problem: 'Smallholder farmers lack affordable data to time fertilizer and irrigation.',
    solution:
      'Low-cost soil sensors paired with an SMS-based advisory service telling farmers exactly when to water and fertilize.',
    targetMarket: 'Smallholder farmers with under 5 acres of land.',
    submitter: 'Karan Patel',
    submitterType: 'Candidate',
    initial: 'K',
    avatarColorClass: 'bg-amber',
    funding: '₹45L',
    equity: '10% equity',
    teamSize: '5 people',
    timeline: '10 months',
    applicants: 18,
    submittedLabel: 'Jun 14, 2026',
  },
  {
    id: 'idea-6',
    title: 'Instant micro-insurance for gig workers',
    category: 'Fintech',
    stage: 'Live',
    problem:
      'Gig workers — delivery riders, drivers, freelancers — have no income protection for sick days, accidents, or lost work. Existing insurance products require paperwork and upfront annual premiums that don’t fit irregular gig income.',
    solution:
      'A pay-per-day micro-insurance product, deducted automatically from gig platform payouts, with claims settled within 48 hours via a simple app flow.',
    targetMarket: "12M+ gig workers across India's top 20 cities.",
    submitter: 'Sahaay Finance',
    submitterType: 'Company',
    initial: 'S',
    avatarColorClass: 'bg-teal',
    funding: '₹60,00,000',
    equity: '8% equity or 12% rev-share',
    teamSize: '4 people',
    timeline: '9 months to launch',
    applicants: 41,
    submittedLabel: 'Jun 30, 2026',
  },
]
