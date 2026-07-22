import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi } from '../../lib/apiClient'
import { Button, Input } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'
import { AuthCard } from './shared/AuthCard'

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

/** Candidate-only for now (see LoginPage) — the backend endpoint itself is role-generic
 * (AuthService.requestPasswordReset takes a role), so wiring this up for CompanyLoginPage later
 * is just another page pointed at the same API, not a backend change. */
export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const localize = useLocalizedPath()
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setFormError(null)
    try {
      await authApi.forgotPassword({ email: values.email, role: 'candidate' })
      setSubmitted(true)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('errors.generic'))
    }
  }

  if (submitted) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">
            {t('forgotPassword.sentTitle')}
          </h1>
          <p className="mb-6 text-sm text-slate">{t('forgotPassword.sentBody')}</p>
          <Link
            to={localize(ROUTES.login)}
            className="text-[13.5px] font-bold text-primary no-underline"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">{t('forgotPassword.title')}</h1>
        <p className="text-sm text-slate">{t('forgotPassword.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-[18px]">
          <Input
            label={t('fields.email')}
            type="email"
            placeholder="rohan@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        {formError && <p className="mb-[18px] text-[13px] text-danger">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mb-[18px] w-full">
          {t('forgotPassword.submit')}
        </Button>
      </form>

      <p className="text-center text-[13.5px] text-slate">
        <Link to={localize(ROUTES.login)} className="font-bold text-primary no-underline">
          {t('forgotPassword.backToLogin')}
        </Link>
      </p>
    </AuthCard>
  )
}
