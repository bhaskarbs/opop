import { useTranslation } from 'react-i18next'
import {
  EXPERIENCE_LEVELS,
  WORK_MODES,
  type ExperienceLevelLabel,
  type WorkModeLabel,
} from '../../lib/jobEnums'
import {
  createDefaultFilterState,
  MAX_SALARY_LAKHS,
  MIN_SALARY_LAKHS,
  type FilterState,
} from './filterState'

interface FilterSidebarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

// Rendered text only — the literal labels above stay as the actual filter values/backend-mapping
// keys (see lib/jobEnums.ts) so state and API payloads are unaffected by locale.
const EXPERIENCE_LEVEL_KEYS: Record<ExperienceLevelLabel, string> = {
  'Entry level': 'filters.experienceLevel.entry',
  'Mid level': 'filters.experienceLevel.mid',
  Senior: 'filters.experienceLevel.senior',
  Leadership: 'filters.experienceLevel.leadership',
}

const WORK_MODE_KEYS: Record<WorkModeLabel, string> = {
  Remote: 'filters.workMode.remote',
  Hybrid: 'filters.workMode.hybrid',
  'On-site': 'filters.workMode.onSite',
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

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const { t } = useTranslation('public')
  return (
    <div className="sticky top-[88px] rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[15px] font-bold text-ink">{t('filters.heading')}</span>
        <button
          type="button"
          onClick={() => onChange(createDefaultFilterState())}
          className="text-[13px] font-bold text-primary"
        >
          {t('filters.clearAll')}
        </button>
      </div>

      <div className="mb-5">
        <div className="mb-2.5 text-[13px] font-bold text-ink">
          {t('filters.experienceLevel.heading')}
        </div>
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
            {t(EXPERIENCE_LEVEL_KEYS[level])}
          </label>
        ))}
      </div>

      <div className="mb-5">
        <div className="mb-2.5 text-[13px] font-bold text-ink">{t('filters.workMode.heading')}</div>
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
            {t(WORK_MODE_KEYS[mode])}
          </label>
        ))}
      </div>

      <div>
        <div className="mb-2.5 text-[13px] font-bold text-ink">
          {t('filters.salaryRange.heading')}
        </div>
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
              ? t('filters.salaryRange.max')
              : t('filters.salaryRange.min', { value: filters.minSalaryLakhs })}
          </span>
        </div>
      </div>
    </div>
  )
}
