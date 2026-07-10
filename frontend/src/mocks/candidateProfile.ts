export type ChecklistKey = 'personal' | 'resume' | 'skills' | 'goals' | 'mobile' | 'prefs'

export interface ChecklistItem {
  key: ChecklistKey
  label: string
}

export const PROFILE_CHECKLIST: ChecklistItem[] = [
  { key: 'personal', label: 'Personal details' },
  { key: 'resume', label: 'Resume' },
  { key: 'skills', label: 'Skills' },
  { key: 'goals', label: 'Life goals & values' },
  { key: 'mobile', label: 'Mobile verification' },
  { key: 'prefs', label: 'Work preferences' },
]

export interface CandidateProfileData {
  name: string
  initial: string
  title: string
  location: string
  email: string
  mobile: string
  resumeFileName: string
  resumeUploadedLabel: string
  resumeSizeLabel: string
  skills: string[]
  completedSections: Record<ChecklistKey, boolean>
}

export const candidateProfile: CandidateProfileData = {
  name: 'Rohan Mehta',
  initial: 'R',
  title: 'Frontend Developer',
  location: 'Bengaluru, India',
  email: 'rohan@email.com',
  mobile: '98765 43210',
  resumeFileName: 'Rohan_Mehta_Resume.pdf',
  resumeUploadedLabel: 'Jun 30, 2026',
  resumeSizeLabel: '412 KB',
  skills: ['React', 'TypeScript', 'UI Systems', 'Communication', 'Mentoring', 'Figma'],
  completedSections: {
    personal: true,
    resume: true,
    skills: true,
    goals: false,
    mobile: false,
    prefs: false,
  },
}

export function profileCompletionPercent(completedSections: Record<ChecklistKey, boolean>): number {
  const total = PROFILE_CHECKLIST.length
  const done = PROFILE_CHECKLIST.filter((item) => completedSections[item.key]).length
  return Math.round((done / total) * 100)
}
