import type { ExperienceLevelLabel, WorkModeLabel } from '../../lib/jobEnums'

export interface FilterState {
  levels: Set<ExperienceLevelLabel>
  modes: Set<WorkModeLabel>
}

export function createDefaultFilterState(): FilterState {
  return { levels: new Set(), modes: new Set() }
}

export function isFilterActive(filters: FilterState) {
  return filters.levels.size > 0 || filters.modes.size > 0
}
