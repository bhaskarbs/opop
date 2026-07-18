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
  applicants: number
  description: string
  responsibilities: string[]
  requirements: string[]
  companyDescription: string
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

const NIMBUS_CLOUD_DESCRIPTION =
  'Nimbus Cloud builds infrastructure monitoring tools for mid-market SaaS companies. 220 employees, Series C, headquartered in Bengaluru with a distributed engineering team.'
const BHARAT_RETAIL_TECH_DESCRIPTION =
  'Bharat Retail Tech powers point-of-sale and inventory software for retail chains across India. 140 employees, Series B, headquartered in Pune.'
const SKYLINE_SYSTEMS_DESCRIPTION =
  'Skyline Systems builds cloud infrastructure tooling for enterprise DevOps teams. 90 employees, Series A, headquartered in Hyderabad with a fully remote engineering org.'
const LUMEN_HEALTH_DESCRIPTION =
  'Lumen Health runs a telehealth platform connecting patients with clinicians across India. 160 employees, Series A, headquartered remotely with hubs in Bengaluru and Mumbai.'
const SAHAAY_FINANCE_DESCRIPTION =
  'Sahaay Finance builds credit and savings tools for underserved communities across rural India. 60 employees, Pre-seed, headquartered in Mumbai.'
const VERTEX_ROBOTICS_DESCRIPTION =
  'Vertex Robotics designs embedded hardware and software for industrial automation. 45 employees, Seed, headquartered in Bengaluru.'

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
    applicants: 412,
    description:
      "Nimbus Cloud is looking for a senior frontend developer to lead the rebuild of its customer-facing analytics dashboard. You'll work closely with product and design to ship performant, accessible interfaces used by thousands of enterprise customers daily.",
    responsibilities: [
      'Own architecture and delivery of core dashboard modules in React/TypeScript',
      'Partner with design on a component system used across the product',
      'Mentor two mid-level engineers and review code for quality and performance',
    ],
    requirements: [
      '5+ years building production React applications',
      'Strong grasp of TypeScript, performance profiling, and accessibility',
      'Experience mentoring or leading a small engineering team',
    ],
    companyDescription: NIMBUS_CLOUD_DESCRIPTION,
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
    applicants: 268,
    description:
      'Bharat Retail Tech is hiring a React developer to build customer-facing features for its point-of-sale and inventory platform used by retail chains across India.',
    responsibilities: [
      'Build and maintain React components for the merchant dashboard',
      'Work with backend engineers to integrate REST APIs',
      'Fix bugs and improve performance across the product',
    ],
    requirements: [
      '2-4 years of experience with React and TypeScript',
      'Comfortable working directly with product managers on requirements',
      'Familiarity with REST APIs and basic state management',
    ],
    companyDescription: BHARAT_RETAIL_TECH_DESCRIPTION,
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
    applicants: 190,
    description:
      'Skyline Systems is looking for a UI engineer to help modernize its DevOps tooling interface used by enterprise engineering teams.',
    responsibilities: [
      'Implement UI components from Figma designs in JavaScript and CSS',
      'Collaborate with the design team on a shared component library',
      'Improve accessibility and cross-browser consistency across the app',
    ],
    requirements: [
      '3+ years of frontend development experience',
      'Strong CSS skills and attention to visual detail',
      'Experience working from design specs in Figma or similar tools',
    ],
    companyDescription: SKYLINE_SYSTEMS_DESCRIPTION,
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
    applicants: 74,
    description:
      'Lumen Health needs a contract frontend engineer to help ship new patient-facing features on its telehealth platform over the next few months.',
    responsibilities: [
      'Build patient-facing screens in Vue for the telehealth platform',
      'Collaborate with a small remote team on sprint deliverables',
      'Write tests for critical booking and consultation flows',
    ],
    requirements: [
      '3+ years building production Vue applications',
      'Comfortable working independently in a remote, contract role',
      'Experience with healthcare or other regulated consumer products a plus',
    ],
    companyDescription: LUMEN_HEALTH_DESCRIPTION,
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
    applicants: 301,
    description:
      'Nimbus Cloud is hiring a backend engineer to scale the services powering its infrastructure monitoring platform as customer usage grows.',
    responsibilities: [
      'Design and build backend services in Node.js and PostgreSQL',
      'Improve reliability and performance of high-traffic monitoring pipelines',
      'Partner with frontend engineers on API design',
    ],
    requirements: [
      '4+ years of backend engineering experience',
      'Strong grasp of relational databases and query performance',
      'Experience operating production services at scale',
    ],
    companyDescription: NIMBUS_CLOUD_DESCRIPTION,
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
    applicants: 156,
    description:
      'Sahaay Finance is looking for a junior data analyst to help track lending performance and customer outcomes across its rural credit products.',
    responsibilities: [
      'Build and maintain recurring reports in SQL and Excel',
      'Support the credit team with ad-hoc data requests',
      'Help identify trends in loan performance across regions',
    ],
    requirements: [
      '0-2 years of experience working with SQL and spreadsheets',
      'Comfortable communicating findings to non-technical stakeholders',
      'Interest in fintech or financial inclusion a plus',
    ],
    companyDescription: SAHAAY_FINANCE_DESCRIPTION,
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
    applicants: 203,
    description:
      'Nimbus Cloud is hiring a customer support associate to help enterprise customers get the most out of its monitoring platform.',
    responsibilities: [
      'Respond to customer support tickets via Zendesk',
      'Troubleshoot common product issues and escalate when needed',
      'Document recurring issues to help improve the product',
    ],
    requirements: [
      '0-2 years of customer-facing support experience',
      'Clear written and verbal communication skills',
      'Comfortable working with technical products',
    ],
    companyDescription: NIMBUS_CLOUD_DESCRIPTION,
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
    applicants: 132,
    description:
      'Bharat Retail Tech is hiring a sales development representative to build the pipeline for its retail point-of-sale platform.',
    responsibilities: [
      'Prospect and qualify leads for the sales team',
      'Manage outreach and follow-ups in the CRM',
      'Coordinate demos between prospects and account executives',
    ],
    requirements: [
      '1-3 years of B2B sales or SDR experience',
      'Comfortable with outbound calling and email outreach',
      'Familiarity with CRM tools',
    ],
    companyDescription: BHARAT_RETAIL_TECH_DESCRIPTION,
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
    applicants: 98,
    description:
      'Lumen Health is looking for a content writer to create patient education content and marketing copy for its telehealth platform.',
    responsibilities: [
      'Write clear, accurate health content reviewed by clinicians',
      'Produce SEO-optimized articles and landing page copy',
      'Collaborate with marketing on campaign content',
    ],
    requirements: [
      '1-3 years of content writing or copywriting experience',
      'Strong research and editing skills',
      'Experience with SEO best practices',
    ],
    companyDescription: LUMEN_HEALTH_DESCRIPTION,
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
    applicants: 87,
    description:
      'Vertex Robotics is hiring an engineering manager to lead its embedded and hardware QA teams as the company scales its industrial automation product.',
    responsibilities: [
      'Manage and grow a team of embedded and QA engineers',
      'Set technical direction across hardware and firmware projects',
      'Partner with product and manufacturing on delivery timelines',
    ],
    requirements: [
      '8+ years in engineering with prior people management experience',
      'Background in embedded systems or hardware QA',
      'Comfortable operating in a fast-moving startup environment',
    ],
    companyDescription: VERTEX_ROBOTICS_DESCRIPTION,
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
    applicants: 145,
    description:
      'Skyline Systems is hiring a DevOps engineer to build and maintain the cloud infrastructure behind its enterprise DevOps tooling.',
    responsibilities: [
      'Manage and scale infrastructure on AWS using Kubernetes',
      'Build CI/CD pipelines and improve deployment reliability',
      'Support on-call rotations for production infrastructure',
    ],
    requirements: [
      '4+ years of DevOps or infrastructure engineering experience',
      'Strong hands-on experience with AWS and Kubernetes',
      'Comfortable working in a fully remote engineering org',
    ],
    companyDescription: SKYLINE_SYSTEMS_DESCRIPTION,
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
    applicants: 61,
    description:
      'Sahaay Finance is hiring an HR coordinator to support recruiting and onboarding as the team grows.',
    responsibilities: [
      'Coordinate interview scheduling and candidate communication',
      'Own onboarding logistics for new hires',
      'Maintain HR records and support policy documentation',
    ],
    requirements: [
      '1-3 years of HR or recruiting coordination experience',
      'Strong organizational and communication skills',
      'Comfortable working across recruiting and people ops',
    ],
    companyDescription: SAHAAY_FINANCE_DESCRIPTION,
  },
]

export const TRENDING_SKILLS = [
  'Frontend Developer',
  'Backend Engineer',
  'Data Analyst',
  'Product Manager',
  'UI/UX Designer',
  'Customer Support',
  'Sales',
  'Content Writing',
  'Digital Marketing',
  'DevOps Engineer',
  'HR Coordinator',
  'Graphic Designer',
]
