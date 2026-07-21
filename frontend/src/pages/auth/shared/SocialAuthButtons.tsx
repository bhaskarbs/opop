import { useTranslation } from 'react-i18next'
import { GoogleSignInButton } from './GoogleSignInButton'

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.67-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
      />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88z" />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

export function SocialAuthButtons({
  onGoogleCredential,
}: {
  /** When provided, renders Google's live Sign-In button wired to this callback instead of
   * the inert placeholder — see GoogleSignInButton. Omit on pages where Google sign-in isn't
   * wired up yet (e.g. company auth). */
  onGoogleCredential?: (idToken: string) => void
}) {
  const { t } = useTranslation('auth')
  return (
    <>
      <div className="mb-[18px] flex items-center gap-2.5">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[12.5px] text-fog">{t('social.orContinueWith')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mb-[22px] flex flex-col gap-2.5">
        {onGoogleCredential ? (
          <GoogleSignInButton onCredential={onGoogleCredential} />
        ) : (
          <button
            type="button"
            className="flex items-center justify-center gap-2.5 rounded-control border border-border bg-surface py-2.5 text-sm font-semibold text-ink"
          >
            <GoogleIcon />
            {t('social.continueWithGoogle')}
          </button>
        )}
      </div>
    </>
  )
}
