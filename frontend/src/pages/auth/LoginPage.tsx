import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi } from '../../lib/apiClient'
import { Button, Input } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
import { AuthCard } from './shared/AuthCard'
import { SocialAuthButtons } from './shared/SocialAuthButtons'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const setSession = useAuthStore((state) => state.setSession)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      const response = await authApi.login({ ...values, role: 'candidate' })
      setSession(response.accessToken, response.user)
      navigate(localize(ROUTES.candidateDashboard))
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('errors.generic'))
    }
  }

  async function onGoogleCredential(idToken: string) {
    setFormError(null)
    try {
      const response = await authApi.loginWithGoogle(idToken)
      setSession(response.accessToken, response.user)
      navigate(localize(ROUTES.candidateDashboard))
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('social.googleSignInFailed'))
    }
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">{t('login.title')}</h1>
        <p className="text-sm text-slate">{t('login.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <Input
            label={t('fields.email')}
            type="email"
            placeholder="rohan@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div className="mb-[18px]">
          <Input
            label={t('fields.password')}
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="mt-2 text-right">
            <a
              href="#forgot"
              onClick={(event) => event.preventDefault()}
              className="text-[13px] font-semibold text-primary no-underline"
            >
              {t('login.forgotPassword')}
            </a>
          </div>
        </div>

        {formError && <p className="mb-[18px] text-[13px] text-danger">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mb-[18px] w-full">
          {t('login.submit')}
        </Button>
      </form>

      <SocialAuthButtons onGoogleCredential={onGoogleCredential} />

      <p className="text-center text-[13.5px] text-slate">
        {t('login.newHere')}{' '}
        <Link to={localize(ROUTES.register)} className="font-bold text-primary no-underline">
          {t('login.createAccount')}
        </Link>
      </p>
    </AuthCard>
  )
}
