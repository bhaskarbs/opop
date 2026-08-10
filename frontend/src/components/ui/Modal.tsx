import type { ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  closeLabel: string
  title: string
  children: ReactNode
}

// Extracted from the overlay+card+close-button chrome repeated (identically) across
// CommunityPage/IdeaDetailPage/etc.'s hand-rolled popups — worth sharing now that the candidate
// accomplishment sections add three more near-identical instances of it.
export function Modal({ open, onClose, closeLabel, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#14181F]/75 p-5">
      <div className="relative w-full max-w-[440px] rounded-2xl bg-surface p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-tint text-[15px]"
        >
          ×
        </button>
        <h3 className="mb-4 text-[17px] font-bold text-ink">{title}</h3>
        {children}
      </div>
    </div>
  )
}
