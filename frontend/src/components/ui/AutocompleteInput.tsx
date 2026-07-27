import { type KeyboardEvent, useId, useState } from 'react'
import { cn } from '../../lib/cn'

export interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  label?: string
  placeholder?: string
  error?: string
}

const MAX_SUGGESTIONS = 8

/** Single-value free-text input with a filtered suggestion dropdown, styled to match Input —
 * label above, bordered field, error message below. Picking a suggestion (click, or Enter on a
 * highlighted option) just fills the field; typing anything not listed still works, same as
 * SearchAutocompleteInput/SkillsTagInput. */
export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  label,
  placeholder,
  error,
}: AutocompleteInputProps) {
  const inputId = useId()
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const trimmed = value.trim().toLowerCase()
  const filtered =
    trimmed === ''
      ? []
      : suggestions
          .filter(
            (option) => option.toLowerCase() !== trimmed && option.toLowerCase().includes(trimmed),
          )
          .slice(0, MAX_SUGGESTIONS)
  const showSuggestions = focused && !dismissed && filtered.length > 0

  function selectOption(option: string) {
    onChange(option)
    setDismissed(true)
    setHighlightedIndex(-1)
  }

  function handleChange(next: string) {
    onChange(next)
    setDismissed(false)
    setHighlightedIndex(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, -1))
    } else if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault()
      selectOption(filtered[highlightedIndex])
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
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true)
            setDismissed(false)
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-fog',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
            error && 'border-danger focus:ring-danger',
          )}
          aria-invalid={Boolean(error)}
        />
        {showSuggestions && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-control border border-border bg-surface py-1 shadow-md">
            {filtered.map((option, index) => (
              <li key={option}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                  className={`block w-full px-3 py-2 text-left text-sm text-ink ${
                    index === highlightedIndex ? 'bg-neutral-tint' : 'hover:bg-neutral-tint'
                  }`}
                >
                  {option}
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
