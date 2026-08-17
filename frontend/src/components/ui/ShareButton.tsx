import { useState } from 'react'
import { cn } from '../../lib/cn'

export interface ShareButtonProps {
  url: string
  label: string
  copiedLabel: string
  // 'icon' — a small circular icon button (search result cards, tight spaces). 'text' — a plain
  // text button matching whatever className the caller supplies (detail pages, list rows).
  variant?: 'icon' | 'text'
  className?: string
}

/** Copies `url` to the clipboard and swaps to `copiedLabel` for 2 seconds before reverting —
 * same copy-link pattern MockInterviewPage uses for share links, pulled out here since job
 * sharing needs it in several different visual contexts (candidate search cards, job detail,
 * company/admin job list rows). */
export function ShareButton({
  url,
  label,
  copiedLabel,
  variant = 'text',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Best-effort — clipboard access can fail (permissions, insecure context); there's no
      // fallback UI here for manually selecting the link text.
    }
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={copied ? copiedLabel : label}
        title={copied ? copiedLabel : label}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-fog hover:bg-neutral-tint hover:text-ink',
          className,
        )}
      >
        {copied ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-teal"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
            <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
          </svg>
        )}
      </button>
    )
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {copied ? copiedLabel : label}
    </button>
  )
}
