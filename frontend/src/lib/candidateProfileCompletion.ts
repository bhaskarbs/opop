import type { ChecklistKey } from '../mocks/candidateProfile'
import type { CandidateProfileResponse } from './candidateApi'

/** Shared by CandidateProfilePage, CandidateDashboardPage, and AddMissingDetailsPage so all
 * three agree on what "complete" means for a given section, instead of each page computing
 * its own answer from a different subset of fields. */
export function deriveCompletedSections(profile: CandidateProfileResponse): Record<ChecklistKey, boolean> {
  return {
    personal: Boolean(profile.location && profile.title),
    resume: Boolean(profile.resumeFileName),
    skills: profile.skills.length > 0,
    goals: Boolean(profile.lifeGoals || profile.workCulture),
    mobile: profile.mobileVerified,
    prefs: Boolean(profile.workModePreference && profile.openToPreference),
  }
}

export function profileCompletionPercent(completed: Record<ChecklistKey, boolean>): number {
  const values = Object.values(completed)
  return Math.round((values.filter(Boolean).length / values.length) * 100)
}
