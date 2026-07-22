import { type KeyboardEvent, type ReactNode, useState } from 'react'
import { cn } from '../../lib/cn'

export interface SearchAutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  icon: ReactNode
  containerClassName?: string
  labelClassName: string
  inputClassName?: string
}

const MAX_SUGGESTIONS = 8

/** Single-value search field with a filtered suggestion dropdown — picking a suggestion (click,
 * or Enter on a highlighted option) just fills the field, it doesn't submit anything. The label
 * wraps `icon` + the input itself so callers can match their own search-bar chrome (border,
 * divider, padding) via `labelClassName` while this component owns the suggestion behavior. */
export function SearchAutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  icon,
  containerClassName,
  labelClassName,
  inputClassName,
}: SearchAutocompleteInputProps) {
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
    <div className={cn('relative', containerClassName)}>
      <label className={labelClassName}>
        {icon}
        <input
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
          className={inputClassName ?? 'w-full text-[15px] text-ink outline-none'}
        />
      </label>
      {showSuggestions && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-control border border-border bg-surface py-1 shadow-md">
          {filtered.map((option, index) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectOption(option)}
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
