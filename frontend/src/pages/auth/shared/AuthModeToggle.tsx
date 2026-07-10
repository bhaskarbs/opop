export type AuthMode = 'password' | 'otp'

interface AuthModeToggleProps {
  mode: AuthMode
  onChange: (mode: AuthMode) => void
}

const OPTIONS: Array<{ key: AuthMode; label: string }> = [
  { key: 'password', label: 'Password' },
  { key: 'otp', label: 'OTP' },
]

export function AuthModeToggle({ mode, onChange }: AuthModeToggleProps) {
  return (
    <div className="mb-[22px] flex rounded-control bg-neutral-tint p-1">
      {OPTIONS.map((option) => {
        const active = option.key === mode
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`flex-1 rounded-lg py-2.5 text-[13.5px] font-bold ${
              active ? 'bg-surface text-ink' : 'bg-transparent text-slate'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
