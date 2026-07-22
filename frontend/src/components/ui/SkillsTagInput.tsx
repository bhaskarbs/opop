import { type KeyboardEvent, useId, useState } from 'react'
import { cn } from '../../lib/cn'

export interface SkillsTagInputProps {
  value: string[]
  onChange: (skills: string[]) => void
  suggestions?: string[]
  label?: string
  placeholder?: string
  error?: string
  removeSkillLabel?: (skill: string) => string
}

const MAX_SUGGESTIONS = 8

/** Enter-to-add tag input (same interaction as CandidateProfilePage/PostJobPage's hand-rolled
 * skill tagging) plus a filtered suggestion dropdown fed by `suggestions` — click a suggestion,
 * or press Enter to add it. Arrow keys move a highlighted suggestion; Enter on a highlighted
 * option adds that one instead of the raw typed text. */
export function SkillsTagInput({
  value,
  onChange,
  suggestions = [],
  label,
  placeholder,
  error,
  removeSkillLabel,
}: SkillsTagInputProps) {
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const trimmedDraft = draft.trim().toLowerCase()
  const filteredSuggestions =
    trimmedDraft === '' || dismissed
      ? []
      : suggestions
          .filter((skill) => !value.includes(skill) && skill.toLowerCase().includes(trimmedDraft))
          .slice(0, MAX_SUGGESTIONS)

  function addSkill(skill: string) {
    const trimmed = skill.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setDraft('')
    setDismissed(true)
    setHighlightedIndex(-1)
  }

  function removeSkill(skill: string) {
    onChange(value.filter((existing) => existing !== skill))
  }

  function handleDraftChange(next: string) {
    setDraft(next)
    setDismissed(false)
    setHighlightedIndex(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const hasSuggestions = filteredSuggestions.length > 0
    if (event.key === 'ArrowDown' && hasSuggestions) {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1))
    } else if (event.key === 'ArrowUp' && hasSuggestions) {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (hasSuggestions && highlightedIndex >= 0) {
        addSkill(filteredSuggestions[highlightedIndex])
      } else {
        addSkill(draft)
      }
    } else if (event.key === 'Escape') {
      setDismissed(true)
    }
  }

  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 text-[13px] font-bold text-ink">
          {label}
        </label>
      )}
      {value.length > 0 && (
        <div className="mb-3.5 flex flex-wrap gap-2">
          {value.map((skill) => (
            <span
              key={skill}
              className="flex items-center gap-1.5 rounded-full bg-neutral-tint px-3.5 py-1.5 text-sm font-semibold text-[#3A414D]"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                aria-label={removeSkillLabel?.(skill) ?? `Remove ${skill}`}
                className="cursor-pointer text-fog"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          id={inputId}
          value={draft}
          onChange={(event) => handleDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
            error && 'border-danger focus:ring-danger',
          )}
          aria-invalid={Boolean(error)}
        />
        {filteredSuggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-control border border-border bg-surface py-1 shadow-md">
            {filteredSuggestions.map((skill, index) => (
              <li key={skill}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => addSkill(skill)}
                  className={`block w-full px-3 py-2 text-left text-sm text-ink ${
                    index === highlightedIndex ? 'bg-neutral-tint' : 'hover:bg-neutral-tint'
                  }`}
                >
                  {skill}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  )
}
