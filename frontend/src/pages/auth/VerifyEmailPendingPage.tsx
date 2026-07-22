import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError, authApi } from '../../lib/apiClient'
import { Button } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
import { AuthCard } from './shared/AuthCard'

/** Where RequireAuth sends a logged-in-but-unverified candidate instead of any real candidate
 * route (see RequireAuth.tsx) — mirrors EmailVerificationFilter's server-side gate, so this page
 * is UX, not the actual security boundary. Reachable only by an authenticated candidate; anyone
 * else (logged out, already verified, or a different role) is bounced elsewhere below. */
export default function VerifyEmailPendingPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  if (status === 'checking') {
    return null
  }
  if (status !== 'authenticated' || user?.role !== 'CANDIDATE') {
    return <Navigate to={localize(ROUTES.login)} replace />
  }
  if (user.emailVerified) {
    return <Navigate to={localize(ROUTES.candidateDashboard)} replace />
  }

  async function handleResend() {
    setResendState('sending')
    try {
      await authApi.resendVerification()
      setResendState('sent')
    } catch {
      setResendState('error')
    }
  }

  async function handleCheckAgain() {
    setChecking(true)
    setCheckError(null)
    try {
      const response = await authApi.refresh()
      setSession(response.accessToken, response.user)
      if (response.user.emailVerified) {
        navigate(localize(ROUTES.candidateDashboard), { replace: true })
      } else {
        setCheckError(t('verifyEmailPending.stillUnverified'))
      }
    } catch (error) {
      setCheckError(error instanceof ApiError ? error.message : t('errors.generic'))
    } finally {
      setChecking(false)
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // Best-effort — the local session clears regardless.
    } finally {
      clearSession()
      navigate(localize(ROUTES.login))
    }
  }

  return (
    <AuthCard>
      <div className="text-center">
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">
          {t('verifyEmailPending.title')}
        </h1>
        <p className="mb-6 text-sm text-slate">
          {t('verifyEmailPending.body', { email: user?.email })}
        </p>

        {resendState === 'sent' && (
          <p className="mb-4 text-[13px] font-semibold text-teal">
            {t('verifyEmailPending.resendSuccess')}
          </p>
        )}
        {resendState === 'error' && (
          <p className="mb-4 text-[13px] text-danger">{t('verifyEmailPending.resendError')}</p>
        )}
        {checkError && <p className="mb-4 text-[13px] text-danger">{checkError}</p>}

        <Button onClick={handleCheckAgain} disabled={checking} className="mb-3 w-full">
          {checking ? t('verifyEmailPending.checking') : t('verifyEmailPending.checkAgain')}
        </Button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendState === 'sending'}
          className="mb-4 w-full rounded-[9px] border border-border py-[11px] text-sm font-bold text-ink disabled:opacity-60"
        >
          {resendState === 'sending'
            ? t('verifyEmailPending.resending')
            : t('verifyEmailPending.resend')}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="text-[13.5px] font-bold text-primary no-underline"
        >
          {t('verifyEmailPending.logout')}
        </button>
      </div>
    </AuthCard>
  )
}
