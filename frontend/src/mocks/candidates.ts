export type CandidateIntent = 'Open to jobs' | 'Open to partnership' | 'Open to community roles'

export interface Candidate {
  id: string
  name: string
  initial: string
  avatarColorClass: string
  title: string
  location: string
  years: number
  skills: string[]
  intent: CandidateIntent
}

export const candidates: Candidate[] = [
  {
    id: 'candidate-1',
    name: 'Rohan Mehta',
    initial: 'R',
    avatarColorClass: 'bg-primary',
    title: 'Frontend Developer',
    location: 'Bengaluru',
    years: 5,
    skills: ['React', 'TypeScript', 'UI Systems'],
    intent: 'Open to partnership',
  },
  {
    id: 'candidate-2',
    name: 'Anita Sharma',
    initial: 'A',
    avatarColorClass: 'bg-teal',
    title: 'QA Engineer',
    location: 'Pune',
    years: 3,
    skills: ['Embedded', 'QA Automation'],
    intent: 'Open to jobs',
  },
  {
    id: 'candidate-3',
    name: 'Karan Patel',
    initial: 'K',
    avatarColorClass: 'bg-amber',
    title: 'Customer Success',
    location: 'Remote',
    years: 4,
    skills: ['CS', 'Onboarding'],
    intent: 'Open to jobs',
  },
  {
    id: 'candidate-4',
    name: 'Meera Iyer',
    initial: 'M',
    avatarColorClass: 'bg-primary',
    title: 'UI/UX Designer',
    location: 'Hyderabad',
    years: 6,
    skills: ['Figma', 'Design Systems'],
    intent: 'Open to community roles',
  },
  {
    id: 'candidate-5',
    name: 'Vikram Rao',
    initial: 'V',
    avatarColorClass: 'bg-teal',
    title: 'Frontend Developer',
    location: 'Chennai',
    years: 2,
    skills: ['Vue', 'JavaScript'],
    intent: 'Open to partnership',
  },
  {
    id: 'candidate-6',
    name: 'Divya Nair',
    initial: 'D',
    avatarColorClass: 'bg-amber',
    title: 'Backend Engineer',
    location: 'Bengaluru',
    years: 7,
    skills: ['Node.js', 'PostgreSQL'],
    intent: 'Open to jobs',
  },
  {
    id: 'candidate-7',
    name: 'Arjun Verma',
    initial: 'A',
    avatarColorClass: 'bg-primary',
    title: 'Data Analyst',
    location: 'Mumbai',
    years: 1,
    skills: ['SQL', 'Excel'],
    intent: 'Open to jobs',
  },
  {
    id: 'candidate-8',
    name: 'Sneha Kulkarni',
    initial: 'S',
    avatarColorClass: 'bg-teal',
    title: 'Growth Marketer',
    location: 'Remote',
    years: 4,
    skills: ['Marketing', 'Community Outreach'],
    intent: 'Open to partnership',
  },
]
