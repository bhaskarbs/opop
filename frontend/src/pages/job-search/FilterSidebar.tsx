import type { ExperienceLevel, Opportunity, WorkMode } from '../../mocks/jobs'
import {
  createDefaultFilterState,
  MAX_SALARY_LAKHS,
  MIN_SALARY_LAKHS,
  type FilterState,
} from './filterState'

const TYPE_OPTIONS: Array<{ type: Opportunity['type']; label: string }> = [
  { type: 'job', label: 'Jobs' },
  { type: 'partnership', label: 'Startup partnerships' },
  { type: 'community', label: 'Community opportunities' },
]

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['Entry level', 'Mid level', 'Senior', 'Leadership']
const WORK_MODES: WorkMode[] = ['Remote', 'Hybrid', 'On-site']

interface FilterSidebarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  typeCounts: Record<Opportunity['type'], number>
}

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}

export function FilterSidebar({ filters, onChange, typeCounts }: FilterSidebarProps) {
  return (
    <div className="sticky top-[88px] rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[15px] font-bold text-ink">Filters</span>
        <button
          type="button"
          onClick={() => onChange(createDefaultFilterState())}
          className="text-[13px] font-bold text-primary"
        >
          Clear all
        </button>
      </div>

      <div className="mb-5">
        <div className="mb-2.5 text-[13px] font-bold text-ink">Opportunity type</div>
        {TYPE_OPTIONS.map((option) => (
          <label
            key={option.type}
            className="mb-2.5 flex cursor-pointer items-center gap-2.5 text-sm text-[#3A414D]"
          >
            <input
              type="checkbox"
              checked={filters.types.has(option.type)}
              onChange={() =>
                onChange({ ...filters, types: toggleInSet(filters.types, option.type) })
              }
              className="h-4 w-4 accent-primary"
            />
            {option.label}{' '}
            <span className="text-[12.5px] text-fog">({typeCounts[option.type]})</span>
          </label>
        ))}
      </div>

      <div className="mb-5">
        <div className="mb-2.5 text-[13px] font-bold text-ink">Experience level</div>
        {EXPERIENCE_LEVELS.map((level) => (
          <label
            key={level}
            className="mb-2.5 flex cursor-pointer items-center gap-2.5 text-sm text-[#3A414D]"
          >
            <input
              type="checkbox"
              checked={filters.levels.has(level)}
              onChange={() => onChange({ ...filters, levels: toggleInSet(filters.levels, level) })}
              className="h-4 w-4 accent-primary"
            />
            {level}
          </label>
        ))}
      </div>

      <div className="mb-5">
        <div className="mb-2.5 text-[13px] font-bold text-ink">Work mode</div>
        {WORK_MODES.map((mode) => (
          <label
            key={mode}
            className="mb-2.5 flex cursor-pointer items-center gap-2.5 text-sm text-[#3A414D]"
          >
            <input
              type="checkbox"
              checked={filters.modes.has(mode)}
              onChange={() => onChange({ ...filters, modes: toggleInSet(filters.modes, mode) })}
              className="h-4 w-4 accent-primary"
            />
            {mode}
          </label>
        ))}
      </div>

      <div>
        <div className="mb-2.5 text-[13px] font-bold text-ink">Salary range (₹/yr)</div>
        <input
          type="range"
          min={MIN_SALARY_LAKHS}
          max={MAX_SALARY_LAKHS}
          value={filters.minSalaryLakhs}
          onChange={(event) => onChange({ ...filters, minSalaryLakhs: Number(event.target.value) })}
          className="w-full accent-primary"
        />
        <div className="mt-1 flex justify-between text-[12.5px] text-fog">
          <span>₹3L</span>
          <span>
            {filters.minSalaryLakhs >= MAX_SALARY_LAKHS
              ? '₹40L+'
              : `Min ₹${filters.minSalaryLakhs}L`}
          </span>
        </div>
      </div>
    </div>
  )
}
