import { type KeyboardEvent, type ReactNode, useState } from 'react'

export interface SearchFieldProps {
  /** Short visible label above the input (e.g. "What" / "Where"). */
  label: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  icon: ReactNode
  containerClassName?: string
  inputId?: string
}

const MAX_SUGGESTIONS = 8

/** Single-value text input with a visible label and an autocomplete dropdown — the "What" /
 * "Where" fields of the job search bar. Unlike the tag-input variant
 * (SearchTagAutocompleteField, still used by JobAlertsPage/SearchCandidatesPage), the value
 * here is a plain string owned by the page: what the user sees in the box is exactly what gets
 * searched when they click the Search button (or press Enter, which submits the surrounding
 * form) — no hidden "commit as tag" step between typing and searching. */
export function SearchField({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  icon,
  containerClassName = '',
  inputId,
}: SearchFieldProps) {
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

  function selectSuggestion(option: string) {
    onChange(option)
    setDismissed(true)
    setHighlightedIndex(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && showSuggestions) {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp' && showSuggestions) {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, -1))
    } else if (event.key === 'Enter' && showSuggestions && highlightedIndex >= 0) {
      // Pick the highlighted suggestion instead of submitting the form.
      event.preventDefault()
      selectSuggestion(filtered[highlightedIndex])
    } else if (event.key === 'Escape') {
      setDismissed(true)
    }
  }

  return (
    <div className={`relative ${containerClassName}`}>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[11.5px] font-extrabold tracking-[0.06em] text-slate uppercase"
      >
        {label}
      </label>
      <div className="flex min-h-[46px] items-center gap-2.5 rounded-control border border-border bg-surface px-3.5 py-2.5 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        {icon}
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setDismissed(false)
            setHighlightedIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true)
            setDismissed(false)
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-fog"
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
                onClick={() => selectSuggestion(option)}
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
