export type WorkMode = 'Remote' | 'Hybrid' | 'On-site'
export type ExperienceLevel = 'Entry level' | 'Mid level' | 'Senior' | 'Leadership'

interface OpportunityBase {
  id: string
  title: string
  /** Used for the "Newest first" sort — not necessarily displayed on every card type. */
  postedDaysAgo: number
  /** Used for the "Company rating" sort — not necessarily displayed on every card type. */
  rating: number
}

export interface JobListing extends OpportunityBase {
  type: 'job'
  company: string
  location: string
  mode: WorkMode
  level: ExperienceLevel
  initial: string
  avatarColorClass: string
  tags: string[]
  salary: string
  salaryMinLakhs: number
  salaryMaxLakhs: number
  postedLabel: string
  source: string
  sourceColorClass: string
}

export interface PartnershipListing extends OpportunityBase {
  type: 'partnership'
  company: string
  location: string
  mode: WorkMode
  blurb: string
}

export interface CommunityListing extends OpportunityBase {
  type: 'community'
  org: string
  blurb: string
}

export type Opportunity = JobListing | PartnershipListing | CommunityListing

export const opportunities: Opportunity[] = [
  {
    id: 'job-1',
    type: 'job',
    title: 'Senior Frontend Developer',
    company: 'Nimbus Cloud',
    location: 'Bengaluru · Hybrid',
    mode: 'Hybrid',
    level: 'Senior',
    initial: 'N',
    avatarColorClass: 'bg-primary',
    tags: ['React', '5+ yrs', 'Full-time'],
    salary: '₹18L–24L',
    salaryMinLakhs: 18,
    salaryMaxLakhs: 24,
    postedDaysAgo: 2,
    postedLabel: '2 days ago',
    source: 'OpenOpportunity',
    sourceColorClass: 'text-slate',
    rating: 4.6,
  },
  {
    id: 'partnership-1',
    type: 'partnership',
    title: 'Frontend Partner — Product MVP',
    company: 'Vertex Robotics',
    location: 'Remote',
    mode: 'Remote',
    blurb:
      "Co-build the customer dashboard with equity-linked partnership terms. Great next step if job offers haven't landed yet.",
    postedDaysAgo: 3,
    rating: 4.5,
  },
  {
    id: 'job-2',
    type: 'job',
    title: 'React Developer',
    company: 'Bharat Retail Tech',
    location: 'Pune · On-site',
    mode: 'On-site',
    level: 'Mid level',
    initial: 'B',
    avatarColorClass: 'bg-teal',
    tags: ['React', 'TypeScript', '2-4 yrs'],
    salary: '₹9L–14L',
    salaryMinLakhs: 9,
    salaryMaxLakhs: 14,
    postedDaysAgo: 5,
    postedLabel: '5 days ago',
    source: 'via Naukri.com',
    sourceColorClass: 'text-amber',
    rating: 4.1,
  },
  {
    id: 'community-1',
    type: 'community',
    title: 'Peer Mentor Circle — Tech Careers',
    org: 'OpenOpportunity Community',
    blurb:
      'Practice interviewing and communication skills with peers weekly. Counts as documented soft-skill experience.',
    postedDaysAgo: 1,
    rating: 4.8,
  },
  {
    id: 'job-3',
    type: 'job',
    title: 'UI Engineer',
    company: 'Skyline Systems',
    location: 'Hyderabad · Hybrid',
    mode: 'Hybrid',
    level: 'Mid level',
    initial: 'S',
    avatarColorClass: 'bg-amber',
    tags: ['JavaScript', 'CSS', '3+ yrs'],
    salary: '₹12L–17L',
    salaryMinLakhs: 12,
    salaryMaxLakhs: 17,
    postedDaysAgo: 7,
    postedLabel: '1 week ago',
    source: 'via LinkedIn',
    sourceColorClass: 'text-amber',
    rating: 4.3,
  },
  {
    id: 'job-4',
    type: 'job',
    title: 'Frontend Engineer (Contract)',
    company: 'Lumen Health',
    location: 'Remote',
    mode: 'Remote',
    level: 'Mid level',
    initial: 'L',
    avatarColorClass: 'bg-teal',
    tags: ['Vue', 'Contract', '3+ yrs'],
    salary: '₹80/hr',
    salaryMinLakhs: 15,
    salaryMaxLakhs: 15,
    postedDaysAgo: 3,
    postedLabel: '3 days ago',
    source: 'OpenOpportunity',
    sourceColorClass: 'text-slate',
    rating: 4.4,
  },
  {
    id: 'job-5',
    type: 'job',
    title: 'Backend Engineer',
    company: 'Nimbus Cloud',
    location: 'Bengaluru · Hybrid',
    mode: 'Hybrid',
    level: 'Senior',
    initial: 'N',
    avatarColorClass: 'bg-primary',
    tags: ['Node.js', 'PostgreSQL', '4+ yrs'],
    salary: '₹20L–28L',
    salaryMinLakhs: 20,
    salaryMaxLakhs: 28,
    postedDaysAgo: 1,
    postedLabel: '1 day ago',
    source: 'OpenOpportunity',
    sourceColorClass: 'text-slate',
    rating: 4.6,
  },
  {
    id: 'partnership-2',
    type: 'partnership',
    title: 'Growth Marketing Partner',
    company: 'Sahaay Finance',
    location: 'Mumbai · Hybrid',
    mode: 'Hybrid',
    blurb:
      'Help design and run outreach campaigns for a rural fintech product — flexible hours, mentorship included.',
    postedDaysAgo: 6,
    rating: 4.2,
  },
  {
    id: 'job-6',
    type: 'job',
    title: 'Junior Data Analyst',
    company: 'Sahaay Finance',
    location: 'Mumbai · On-site',
    mode: 'On-site',
    level: 'Entry level',
    initial: 'S',
    avatarColorClass: 'bg-amber',
    tags: ['SQL', 'Excel', '0-2 yrs'],
    salary: '₹5L–8L',
    salaryMinLakhs: 5,
    salaryMaxLakhs: 8,
    postedDaysAgo: 4,
    postedLabel: '4 days ago',
    source: 'via Indeed',
    sourceColorClass: 'text-amber',
    rating: 4.0,
  },
  {
    id: 'community-2',
    type: 'community',
    title: 'Public Speaking Workshop Series',
    org: 'OpenOpportunity Community',
    blurb:
      'Build confidence presenting ideas out loud in a supportive small-group setting — great for interview prep.',
    postedDaysAgo: 8,
    rating: 4.7,
  },
  {
    id: 'job-7',
    type: 'job',
    title: 'Customer Support Associate',
    company: 'Nimbus Cloud',
    location: 'Remote',
    mode: 'Remote',
    level: 'Entry level',
    initial: 'N',
    avatarColorClass: 'bg-primary',
    tags: ['Zendesk', 'Communication', '0-2 yrs'],
    salary: '₹4L–6L',
    salaryMinLakhs: 4,
    salaryMaxLakhs: 6,
    postedDaysAgo: 6,
    postedLabel: '6 days ago',
    source: 'OpenOpportunity',
    sourceColorClass: 'text-slate',
    rating: 4.6,
  },
  {
    id: 'job-8',
    type: 'job',
    title: 'Sales Development Representative',
    company: 'Bharat Retail Tech',
    location: 'Delhi · On-site',
    mode: 'On-site',
    level: 'Mid level',
    initial: 'B',
    avatarColorClass: 'bg-teal',
    tags: ['B2B Sales', 'CRM', '1-3 yrs'],
    salary: '₹6L–10L',
    salaryMinLakhs: 6,
    salaryMaxLakhs: 10,
    postedDaysAgo: 3,
    postedLabel: '3 days ago',
    source: 'via Naukri.com',
    sourceColorClass: 'text-amber',
    rating: 4.1,
  },
  {
    id: 'job-9',
    type: 'job',
    title: 'Content Writer',
    company: 'Lumen Health',
    location: 'Remote',
    mode: 'Remote',
    level: 'Mid level',
    initial: 'L',
    avatarColorClass: 'bg-teal',
    tags: ['SEO', 'Copywriting', '1-3 yrs'],
    salary: '₹5L–9L',
    salaryMinLakhs: 5,
    salaryMaxLakhs: 9,
    postedDaysAgo: 5,
    postedLabel: '5 days ago',
    source: 'OpenOpportunity',
    sourceColorClass: 'text-slate',
    rating: 4.4,
  },
  {
    id: 'job-10',
    type: 'job',
    title: 'Engineering Manager',
    company: 'Vertex Robotics',
    location: 'Bengaluru · Hybrid',
    mode: 'Hybrid',
    level: 'Leadership',
    initial: 'V',
    avatarColorClass: 'bg-primary',
    tags: ['Leadership', 'Hardware', '8+ yrs'],
    salary: '₹35L–48L',
    salaryMinLakhs: 35,
    salaryMaxLakhs: 48,
    postedDaysAgo: 14,
    postedLabel: '2 weeks ago',
    source: 'OpenOpportunity',
    sourceColorClass: 'text-slate',
    rating: 4.7,
  },
  {
    id: 'job-11',
    type: 'job',
    title: 'DevOps Engineer',
    company: 'Skyline Systems',
    location: 'Hyderabad · Remote',
    mode: 'Remote',
    level: 'Senior',
    initial: 'S',
    avatarColorClass: 'bg-amber',
    tags: ['AWS', 'Kubernetes', '4+ yrs'],
    salary: '₹22L–30L',
    salaryMinLakhs: 22,
    salaryMaxLakhs: 30,
    postedDaysAgo: 1,
    postedLabel: '1 day ago',
    source: 'via LinkedIn',
    sourceColorClass: 'text-amber',
    rating: 4.3,
  },
  {
    id: 'job-12',
    type: 'job',
    title: 'HR Coordinator',
    company: 'Sahaay Finance',
    location: 'Mumbai · Hybrid',
    mode: 'Hybrid',
    level: 'Mid level',
    initial: 'S',
    avatarColorClass: 'bg-amber',
    tags: ['Recruiting', 'Onboarding', '1-3 yrs'],
    salary: '₹6L–9L',
    salaryMinLakhs: 6,
    salaryMaxLakhs: 9,
    postedDaysAgo: 4,
    postedLabel: '4 days ago',
    source: 'via Indeed',
    sourceColorClass: 'text-amber',
    rating: 4.0,
  },
]

export const TRENDING_SKILLS = [
  'Frontend Developer',
  'Data Analyst',
  'Customer Support',
  'Sales',
  'Content Writing',
]
