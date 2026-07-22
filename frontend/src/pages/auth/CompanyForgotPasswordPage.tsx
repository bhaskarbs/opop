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

const companyForgotPasswordSchema = z.object({
  workEmail: z.string().min(1, 'Work email is required').email('Enter a valid work email'),
})

type CompanyForgotPasswordFormValues = z.infer<typeof companyForgotPasswordSchema>

/** Company counterpart to ForgotPasswordPage — same backend endpoint (role-generic, see
 * AuthService.requestPasswordReset), just workEmail terminology and company login links to
 * match CompanyLoginPage. ResetPasswordPage itself needs no company-specific variant: the
 * emailed link carries `role` as a query param so it can point its own fallback links correctly
 * regardless of which forgot-password page sent the email. */
export default function CompanyForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const localize = useLocalizedPath()
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyForgotPasswordFormValues>({
    resolver: zodResolver(companyForgotPasswordSchema),
    defaultValues: { workEmail: '' },
  })

  async function onSubmit(values: CompanyForgotPasswordFormValues) {
    setFormError(null)
    try {
      await authApi.forgotPassword({ email: values.workEmail, role: 'company' })
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
            to={localize(ROUTES.companyLogin)}
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
            label={t('fields.workEmail')}
            type="email"
            placeholder="you@company.com"
            error={errors.workEmail?.message}
            {...register('workEmail')}
          />
        </div>

        {formError && <p className="mb-[18px] text-[13px] text-danger">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mb-[18px] w-full">
          {t('forgotPassword.submit')}
        </Button>
      </form>

      <p className="text-center text-[13.5px] text-slate">
        <Link to={localize(ROUTES.companyLogin)} className="font-bold text-primary no-underline">
          {t('forgotPassword.backToLogin')}
        </Link>
      </p>
    </AuthCard>
  )
}
