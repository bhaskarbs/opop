import type { BackendGender, BackendMaritalStatus, BackendNoticePeriod } from './candidateApi'
import type { BackendEmploymentType, BackendExperienceLevel, BackendWorkMode } from './jobsApi'

export const EXPERIENCE_LEVELS = ['Entry level', 'Mid level', 'Senior', 'Leadership'] as const
export type ExperienceLevelLabel = (typeof EXPERIENCE_LEVELS)[number]

export const NOTICE_PERIODS = ['Immediate', '15 days', '1 month', '2 months', '3+ months'] as const
export type NoticePeriodLabel = (typeof NOTICE_PERIODS)[number]

export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const
export type GenderLabel = (typeof GENDERS)[number]

export const MARITAL_STATUSES = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
  'Prefer not to say',
] as const
export type MaritalStatusLabel = (typeof MARITAL_STATUSES)[number]

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

const NOTICE_PERIOD_TO_BACKEND: Record<NoticePeriodLabel, BackendNoticePeriod> = {
  Immediate: 'IMMEDIATE',
  '15 days': 'DAYS_15',
  '1 month': 'MONTH_1',
  '2 months': 'MONTH_2',
  '3+ months': 'MONTHS_3_PLUS',
}
const BACKEND_TO_NOTICE_PERIOD: Record<BackendNoticePeriod, NoticePeriodLabel> = {
  IMMEDIATE: 'Immediate',
  DAYS_15: '15 days',
  MONTH_1: '1 month',
  MONTH_2: '2 months',
  MONTHS_3_PLUS: '3+ months',
}

const GENDER_TO_BACKEND: Record<GenderLabel, BackendGender> = {
  Male: 'MALE',
  Female: 'FEMALE',
  Other: 'OTHER',
  'Prefer not to say': 'PREFER_NOT_TO_SAY',
}
const BACKEND_TO_GENDER: Record<BackendGender, GenderLabel> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
}

const MARITAL_STATUS_TO_BACKEND: Record<MaritalStatusLabel, BackendMaritalStatus> = {
  Single: 'SINGLE',
  Married: 'MARRIED',
  Divorced: 'DIVORCED',
  Widowed: 'WIDOWED',
  'Prefer not to say': 'PREFER_NOT_TO_SAY',
}
const BACKEND_TO_MARITAL_STATUS: Record<BackendMaritalStatus, MaritalStatusLabel> = {
  SINGLE: 'Single',
  MARRIED: 'Married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
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
export function noticePeriodToBackend(label: NoticePeriodLabel): BackendNoticePeriod {
  return NOTICE_PERIOD_TO_BACKEND[label]
}
export function noticePeriodFromBackend(value: BackendNoticePeriod): NoticePeriodLabel {
  return BACKEND_TO_NOTICE_PERIOD[value]
}
export function genderToBackend(label: GenderLabel): BackendGender {
  return GENDER_TO_BACKEND[label]
}
export function genderFromBackend(value: BackendGender): GenderLabel {
  return BACKEND_TO_GENDER[value]
}
export function maritalStatusToBackend(label: MaritalStatusLabel): BackendMaritalStatus {
  return MARITAL_STATUS_TO_BACKEND[label]
}
export function maritalStatusFromBackend(value: BackendMaritalStatus): MaritalStatusLabel {
  return BACKEND_TO_MARITAL_STATUS[value]
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
