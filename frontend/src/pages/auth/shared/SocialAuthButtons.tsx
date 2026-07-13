import { useTranslation } from 'react-i18next'

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

function LinkedInIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#0A66C2">
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <path
        fill="#FFFFFF"
        d="M7.3 9.7h2.7v8.3H7.3zM8.65 8.4a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1zM12.1 9.7h2.6v1.14c.37-.6 1.15-1.34 2.5-1.34 2.7 0 3.2 1.78 3.2 4.1v4.4h-2.7v-3.9c0-.93-.02-2.1-1.3-2.1-1.3 0-1.5 1-1.5 2.05v3.95h-2.8z"
      />
    </svg>
  )
}

export function SocialAuthButtons() {
  const { t } = useTranslation('auth')
  return (
    <>
      <div className="mb-[18px] flex items-center gap-2.5">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[12.5px] text-fog">{t('social.orContinueWith')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mb-[22px] flex flex-col gap-2.5">
        <button
          type="button"
          className="flex items-center justify-center gap-2.5 rounded-control border border-border bg-surface py-2.5 text-sm font-semibold text-ink"
        >
          <GoogleIcon />
          {t('social.continueWithGoogle')}
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2.5 rounded-control border border-border bg-surface py-2.5 text-sm font-semibold text-ink"
        >
          <LinkedInIcon />
          {t('social.continueWithLinkedIn')}
        </button>
      </div>
    </>
  )
}
