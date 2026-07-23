import type { BackendEmploymentType, BackendExperienceLevel, BackendWorkMode } from './jobsApi'

export const EXPERIENCE_LEVELS = ['Entry level', 'Mid level', 'Senior', 'Leadership'] as const
export type ExperienceLevelLabel = (typeof EXPERIENCE_LEVELS)[number]

export const WORK_MODES = ['Remote', 'Hybrid', 'On-site'] as const
export type WorkModeLabel = (typeof WORK_MODES)[number]

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const
export type EmploymentTypeLabel = (typeof EMPLOYMENT_TYPES)[number]

const EXPERIENCE_LEVEL_TO_BACKEND: Record<ExperienceLevelLabel, BackendExperienceLevel> = {
  'Entry level': 'ENTRY_LEVEL',
  'Mid level': 'MID_LEVEL',
  Senior: 'SENIOR',
  Leadership: 'LEADERSHIP',
}
const BACKEND_TO_EXPERIENCE_LEVEL: Record<BackendExperienceLevel, ExperienceLevelLabel> = {
  ENTRY_LEVEL: 'Entry level',
  MID_LEVEL: 'Mid level',
  SENIOR: 'Senior',
  LEADERSHIP: 'Leadership',
}

const WORK_MODE_TO_BACKEND: Record<WorkModeLabel, BackendWorkMode> = {
  Remote: 'REMOTE',
  Hybrid: 'HYBRID',
  'On-site': 'ON_SITE',
}
const BACKEND_TO_WORK_MODE: Record<BackendWorkMode, WorkModeLabel> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ON_SITE: 'On-site',
}

const EMPLOYMENT_TYPE_TO_BACKEND: Record<EmploymentTypeLabel, BackendEmploymentType> = {
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  Contract: 'CONTRACT',
  Internship: 'INTERNSHIP',
}
const BACKEND_TO_EMPLOYMENT_TYPE: Record<BackendEmploymentType, EmploymentTypeLabel> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
}

export function experienceLevelToBackend(label: ExperienceLevelLabel): BackendExperienceLevel {
  return EXPERIENCE_LEVEL_TO_BACKEND[label]
}
export function experienceLevelFromBackend(value: BackendExperienceLevel): ExperienceLevelLabel {
  return BACKEND_TO_EXPERIENCE_LEVEL[value]
}
export function workModeToBackend(label: WorkModeLabel): BackendWorkMode {
  return WORK_MODE_TO_BACKEND[label]
}
export function workModeFromBackend(value: BackendWorkMode): WorkModeLabel {
  return BACKEND_TO_WORK_MODE[value]
}
export function employmentTypeToBackend(label: EmploymentTypeLabel): BackendEmploymentType {
  return EMPLOYMENT_TYPE_TO_BACKEND[label]
}
export function employmentTypeFromBackend(value: BackendEmploymentType): EmploymentTypeLabel {
  return BACKEND_TO_EMPLOYMENT_TYPE[value]
}
