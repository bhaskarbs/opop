export function FlagBadge({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold text-[#8A5A0F]">
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8A5A0F"
        strokeWidth={2.5}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      {label}
    </span>
  )
}
