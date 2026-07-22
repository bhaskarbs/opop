import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, authApi } from '../../lib/apiClient'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
import { AuthCard } from './shared/AuthCard'

type VerifyState = 'verifying' | 'done' | 'error'

/** Landed on from the link in the verification email (see AuthService.verificationEmailMessage) —
 * public and token-only, works whether or not the candidate is logged in on this device/tab. If
 * they are (same browser, cookie still present), also refreshes the session so the in-memory
 * store picks up emailVerified=true without waiting for a page reload. */
export default function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const localize = useLocalizedPath()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const setSession = useAuthStore((state) => state.setSession)
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'error')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    authApi
      .verifyEmail({ token })
      .then(async () => {
        if (cancelled) return
        // Best-effort — only succeeds if this tab/browser still holds the refresh cookie for
        // the just-verified account; a failure here just means "log in" is shown instead of
        // "continue", not that verification itself failed.
        try {
          const response = await authApi.refresh()
          if (!cancelled) setSession(response.accessToken, response.user)
        } catch {
          // See comment above.
        }
        if (!cancelled) setState('done')
      })
      .catch((error) => {
        if (cancelled) return
        setErrorMessage(error instanceof ApiError ? error.message : t('errors.generic'))
        setState('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for this token
  }, [token])

  if (state === 'verifying') {
    return (
      <AuthCard>
        <div className="text-center">
          <p className="text-sm text-slate">{t('verifyEmail.verifying')}</p>
        </div>
      </AuthCard>
    )
  }

  if (state === 'error') {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">
            {t('verifyEmail.errorTitle')}
          </h1>
          <p className="text-sm text-slate">{errorMessage ?? t('verifyEmail.missingToken')}</p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <div className="text-center">
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">{t('verifyEmail.doneTitle')}</h1>
        <p className="mb-6 text-sm text-slate">{t('verifyEmail.doneBody')}</p>
        <Link
          to={localize(ROUTES.candidateDashboard)}
          className="text-[13.5px] font-bold text-primary no-underline"
        >
          {t('verifyEmail.continue')}
        </Link>
      </div>
    </AuthCard>
  )
}
