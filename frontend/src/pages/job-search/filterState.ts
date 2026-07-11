import type { ExperienceLevelLabel, WorkModeLabel } from '../../lib/jobEnums'

export const MIN_SALARY_LAKHS = 3
export const MAX_SALARY_LAKHS = 40

export interface FilterState {
  levels: Set<ExperienceLevelLabel>
  modes: Set<WorkModeLabel>
  minSalaryLakhs: number
}

export function createDefaultFilterState(): FilterState {
  return { levels: new Set(), modes: new Set(), minSalaryLakhs: MIN_SALARY_LAKHS }
}

export function isFilterActive(filters: FilterState) {
  return (
    filters.levels.size > 0 || filters.modes.size > 0 || filters.minSalaryLakhs > MIN_SALARY_LAKHS
  )
}
