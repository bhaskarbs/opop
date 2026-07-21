import { type InputHTMLAttributes, forwardRef, useId, useState } from 'react'
import { cn } from '../../lib/cn'

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  showPasswordLabel?: string
  hidePasswordLabel?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      error,
      id,
      className,
      showPasswordLabel = 'Show password',
      hidePasswordLabel = 'Hide password',
      ...props
    },
    ref,
  ) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const [visible, setVisible] = useState(false)

    return (
      <div className="flex flex-col">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 text-[13px] font-bold text-ink">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            className={cn(
              'w-full rounded-control border border-border bg-surface px-3 py-2.5 pr-10 text-sm text-ink placeholder:text-fog',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              error && 'border-danger focus:ring-danger',
              className,
            )}
            aria-invalid={Boolean(error)}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((prev) => !prev)}
            aria-label={visible ? hidePasswordLabel : showPasswordLabel}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-fog hover:text-slate"
          >
            {visible ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <path d="M1 1l22 22" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'
