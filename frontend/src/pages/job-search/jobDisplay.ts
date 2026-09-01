import type { JobSummary } from '../../lib/jobsApi'
import {
  experienceLevelFromBackend,
  workModeFromBackend,
  type ExperienceLevelLabel,
  type WorkModeLabel,
} from '../../lib/jobEnums'

/** Search-result view-model — presentation details (avatar color, "posted N days ago", the
 * "OpenOpportunity" source badge) that the real Job Service deliberately doesn't return. */
export interface DisplayJob {
  id: string
  title: string
  company: string
  location: string
  mode: WorkModeLabel
  level: ExperienceLevelLabel
  initial: string
  avatarColorClass: string
  // Raw relative path (e.g. "/api/companies/{id}/logo"), null if the company hasn't uploaded
  // one — callers prefix it with API_BASE_URL themselves, same convention as Header.tsx.
  companyLogoUrl: string | null
  tags: string[]
  salary: string
  // Whether salary carries an actual figure — lets a caller decide whether a "/ yr" (or similar)
  // suffix makes sense next to it ("Salary not disclosed / yr" reads as a mistake).
  salaryDisclosed: boolean
  // Distinct from level (the coarse ExperienceLevel tier) — the granular "N-M years" range, when
  // the job posting set one. Null when neither bound was set.
  experienceYears: string | null
  postedLabel: string
  source: string
  sourceColorClass: string
  applicants: number
  isPromoted: boolean
  isFeatured: boolean
}

const AVATAR_COLOR_CLASSES = ['bg-primary', 'bg-teal', 'bg-amber']

function colorForCompany(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]
}

function formatSalary(minLakhs: number | null, maxLakhs: number | null): string {
  if (minLakhs == null && maxLakhs == null) return 'Salary not disclosed'
  if (minLakhs != null && maxLakhs != null) return `₹${minLakhs}L–${maxLakhs}L`
  return `₹${minLakhs ?? maxLakhs}L`
}

function formatExperienceYears(minYears: number | null, maxYears: number | null): string | null {
  if (minYears != null && maxYears != null) return `${minYears}-${maxYears} years`
  if (minYears != null) return `${minYears}+ years`
  if (maxYears != null) return `Up to ${maxYears} years`
  return null
}

function formatPostedLabel(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
}

export function toDisplayJob(job: JobSummary): DisplayJob {
  return {
    id: job.id,
    title: job.title,
    company: job.companyName,
    location: job.locations.join(', '),
    mode: workModeFromBackend(job.workMode),
    level: experienceLevelFromBackend(job.experienceLevel),
    initial: job.companyName.charAt(0).toUpperCase(),
    avatarColorClass: colorForCompany(job.companyName),
    companyLogoUrl: job.companyLogoUrl,
    tags: job.skills,
    salary: formatSalary(job.salaryMinLakhs, job.salaryMaxLakhs),
    salaryDisclosed: job.salaryMinLakhs != null || job.salaryMaxLakhs != null,
    experienceYears: formatExperienceYears(job.experienceYearsMin, job.experienceYearsMax),
    postedLabel: formatPostedLabel(job.createdAt),
    source: 'OpenOpportunity',
    sourceColorClass: 'text-slate',
    applicants: job.applicantCount,
    isPromoted: job.isPromoted,
    isFeatured: job.isFeatured,
  }
}
