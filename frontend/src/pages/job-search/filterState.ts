import type { ExperienceLevel, Opportunity, WorkMode } from '../../mocks/jobs'

export const MIN_SALARY_LAKHS = 3
export const MAX_SALARY_LAKHS = 40

export interface FilterState {
  types: Set<Opportunity['type']>
  levels: Set<ExperienceLevel>
  modes: Set<WorkMode>
  minSalaryLakhs: number
}

export function createDefaultFilterState(): FilterState {
  return { types: new Set(), levels: new Set(), modes: new Set(), minSalaryLakhs: MIN_SALARY_LAKHS }
}

export function isFilterActive(filters: FilterState) {
  return (
    filters.types.size > 0 ||
    filters.levels.size > 0 ||
    filters.modes.size > 0 ||
    filters.minSalaryLakhs > MIN_SALARY_LAKHS
  )
}
