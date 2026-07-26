import { useTranslation } from 'react-i18next'

// Stored mobile numbers are always a bare 10-digit number with no country code (see
// RegisterPage's `^\d{10}$` validation and PhoneInput's fixed "+91" prefix) — wa.me needs the
// country code inlined with no "+", spaces, or punctuation.
function whatsAppLink(contactNumber: string): string {
  return `https://wa.me/91${contactNumber.replace(/\D/g, '')}`
}

// tel: is fine with a leading "+" (unlike wa.me) — dials correctly regardless of the device's
// own locale/dialing convention.
function callLink(contactNumber: string): string {
  return `tel:+91${contactNumber.replace(/\D/g, '')}`
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.44.79 3.06 1.2 4.72 1.2h.01c5.46 0 9.9-4.45 9.9-9.91.01-2.65-1.02-5.14-2.9-7.01A9.87 9.87 0 0 0 12.04 2zm0 18.14h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.26-8.24a8.2 8.2 0 0 1 5.83 2.42 8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.7 8.22-8.25 8.22zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.76-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.25 3.74.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z" />
    </svg>
  )
}

function CallIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export interface ContactRevealControlProps {
  contactNumber: string | null
  revealing: boolean
  canContact: boolean
  onReveal: () => void
}

/** Renders a candidate's revealed contact number (with WhatsApp/Call icon links) in place of the
 * "View contact" button once revealed — shared by SearchCandidatesPage's card and
 * JobApplicantsPage, both of which drive the same underlying reveal (see
 * companyApi.revealCandidateContact / CandidateSearchService.revealContact). Callers own the
 * revealError message themselves (layout differs per page), this only renders the control. */
export function ContactRevealControl({
  contactNumber,
  revealing,
  canContact,
  onReveal,
}: ContactRevealControlProps) {
  const { t } = useTranslation('company')

  if (contactNumber) {
    // Replaces the button entirely, same spot — the number itself is the "already revealed"
    // state, kept that way by the backend across visits.
    return (
      <span className="flex items-center gap-2 rounded-lg bg-teal-tint px-3.5 py-2 text-[12.5px] font-bold text-teal">
        {contactNumber}
        <a
          href={whatsAppLink(contactNumber)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('searchCandidates.openWhatsApp')}
          className="flex h-5 w-5 items-center justify-center text-teal hover:text-teal/80"
        >
          <WhatsAppIcon />
        </a>
        <a
          href={callLink(contactNumber)}
          aria-label={t('searchCandidates.callCandidate')}
          className="flex h-5 w-5 items-center justify-center text-teal hover:text-teal/80"
        >
          <CallIcon />
        </a>
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={revealing || !canContact}
      onClick={onReveal}
      title={canContact ? undefined : t('searchCandidates.contactDisabledHint')}
      className="rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/50"
    >
      {revealing ? t('searchCandidates.revealingContact') : t('searchCandidates.viewContact')}
    </button>
  )
}
