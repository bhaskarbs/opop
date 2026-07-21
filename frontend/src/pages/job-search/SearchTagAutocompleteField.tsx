import { type KeyboardEvent, type ReactNode, useState } from 'react'

export interface SearchTagAutocompleteFieldProps {
  values: string[]
  onChange: (values: string[]) => void
  suggestions: string[]
  placeholder?: string
  icon: ReactNode
  containerClassName: string
  removeLabel?: (value: string) => string
}

const MAX_SUGGESTIONS = 8

/** Tag input with autocomplete suggestions — lets the candidate add several skills or cities
 * instead of typing one free-text term. Adding or removing a tag is the only thing that ever
 * reaches `onChange`; the in-progress draft text lives entirely in local state, so plain typing
 * never bubbles up (JobSearchPage's search effect depends on the committed tag arrays). */
export function SearchTagAutocompleteField({
  values,
  onChange,
  suggestions,
  placeholder,
  icon,
  containerClassName,
  removeLabel,
}: SearchTagAutocompleteFieldProps) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const trimmedDraft = draft.trim().toLowerCase()
  const filtered =
    trimmedDraft === ''
      ? []
      : suggestions
          .filter(
            (option) => !values.includes(option) && option.toLowerCase().includes(trimmedDraft),
          )
          .slice(0, MAX_SUGGESTIONS)
  const showSuggestions = focused && !dismissed && filtered.length > 0

  function addValue(next: string) {
    const trimmed = next.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setDraft('')
    setDismissed(true)
    setHighlightedIndex(-1)
  }

  function removeValue(value: string) {
    onChange(values.filter((existing) => existing !== value))
  }

  function handleDraftChange(next: string) {
    setDraft(next)
    setDismissed(false)
    setHighlightedIndex(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && showSuggestions) {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp' && showSuggestions) {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (showSuggestions && highlightedIndex >= 0) {
        addValue(filtered[highlightedIndex])
      } else if (draft.trim()) {
        addValue(draft)
      }
    } else if (event.key === 'Escape') {
      setDismissed(true)
    } else if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      removeValue(values[values.length - 1])
    }
  }

  return (
    <div className={`relative ${containerClassName}`}>
      <div className="flex flex-wrap items-center gap-2 rounded-control border border-border px-3.5 py-2.5">
        {icon}
        {values.map((value) => (
          <span
            key={value}
            className="flex items-center gap-1.5 rounded-full bg-neutral-tint px-2.5 py-1 text-[13px] font-semibold text-[#3A414D]"
          >
            {value}
            <button
              type="button"
              onClick={() => removeValue(value)}
              aria-label={removeLabel?.(value) ?? `Remove ${value}`}
              className="cursor-pointer text-fog"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(event) => handleDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true)
            setDismissed(false)
          }}
          onBlur={() => setFocused(false)}
          placeholder={values.length === 0 ? placeholder : undefined}
          className="min-w-[80px] flex-1 text-[14.5px] text-ink outline-none"
        />
      </div>
      {showSuggestions && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-control border border-border bg-surface py-1 shadow-md">
          {filtered.map((option, index) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => addValue(option)}
                className={`block w-full px-3.5 py-2 text-left text-sm text-ink ${
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
  )
}
