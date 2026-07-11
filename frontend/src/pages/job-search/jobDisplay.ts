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
  tags: string[]
  salary: string
  postedLabel: string
  source: string
  sourceColorClass: string
  applicants: number
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
    location: job.location,
    mode: workModeFromBackend(job.workMode),
    level: experienceLevelFromBackend(job.experienceLevel),
    initial: job.companyName.charAt(0).toUpperCase(),
    avatarColorClass: colorForCompany(job.companyName),
    tags: job.skills,
    salary: formatSalary(job.salaryMinLakhs, job.salaryMaxLakhs),
    postedLabel: formatPostedLabel(job.createdAt),
    source: 'OpenOpportunity',
    sourceColorClass: 'text-slate',
    applicants: job.applicantCount,
  }
}
