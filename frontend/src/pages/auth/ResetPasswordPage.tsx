import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi } from '../../lib/apiClient'
import { Button, PasswordInput } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'
import { AuthCard } from './shared/AuthCard'

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const localize = useLocalizedPath()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return
    setFormError(null)
    try {
      await authApi.resetPassword({ token, newPassword: values.newPassword })
      setDone(true)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('errors.generic'))
    }
  }

  if (!token) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">
            {t('resetPassword.invalidTitle')}
          </h1>
          <p className="mb-6 text-sm text-slate">{t('resetPassword.invalidBody')}</p>
          <Link
            to={localize(ROUTES.forgotPassword)}
            className="text-[13.5px] font-bold text-primary no-underline"
          >
            {t('resetPassword.requestNewLink')}
          </Link>
        </div>
      </AuthCard>
    )
  }

  if (done) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">
            {t('resetPassword.doneTitle')}
          </h1>
          <p className="mb-6 text-sm text-slate">{t('resetPassword.doneBody')}</p>
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
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">{t('resetPassword.title')}</h1>
        <p className="text-sm text-slate">{t('resetPassword.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <PasswordInput
            label={t('resetPassword.newPassword')}
            placeholder="••••••••"
            error={errors.newPassword?.message}
            showPasswordLabel={t('fields.showPassword')}
            hidePasswordLabel={t('fields.hidePassword')}
            {...register('newPassword')}
          />
        </div>

        <div className="mb-[18px]">
          <PasswordInput
            label={t('resetPassword.confirmPassword')}
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            showPasswordLabel={t('fields.showPassword')}
            hidePasswordLabel={t('fields.hidePassword')}
            {...register('confirmPassword')}
          />
        </div>

        {formError && <p className="mb-[18px] text-[13px] text-danger">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {t('resetPassword.submit')}
        </Button>
      </form>
    </AuthCard>
  )
}
