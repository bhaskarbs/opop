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
