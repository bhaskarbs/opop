export type Decision = 'pending' | 'approved' | 'rejected'

interface DecisionActionsProps {
  status: Decision
  onApprove: () => void
  onReject: () => void
  approveLabel: string
  approvedText: string
  extraButtonLabel: string
}

export function DecisionActions({
  status,
  onApprove,
  onReject,
  approveLabel,
  approvedText,
  extraButtonLabel,
}: DecisionActionsProps) {
  if (status === 'approved') {
    return (
      <div className="flex items-center gap-1.5 text-sm font-semibold text-teal">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F8A6B"
          strokeWidth={2.5}
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {approvedText}
      </div>
    )
  }
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-1.5 text-sm font-semibold text-danger">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#DC2626"
          strokeWidth={2.5}
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        Rejected — company has been notified
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={onApprove}
        className="flex items-center gap-1.5 rounded-lg bg-teal px-5 py-2.5 text-[13.5px] font-bold text-white"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={3}
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {approveLabel}
      </button>
      <button
        type="button"
        onClick={onReject}
        className="rounded-lg border border-[#FCA5A5] bg-surface px-5 py-2.5 text-[13.5px] font-bold text-danger"
      >
        Reject
      </button>
      <button
        type="button"
        className="rounded-lg border border-border bg-surface px-5 py-2.5 text-[13.5px] font-bold text-ink"
      >
        {extraButtonLabel}
      </button>
    </div>
  )
}
