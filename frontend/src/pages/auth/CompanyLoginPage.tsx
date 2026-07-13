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

const companyLoginSchema = z.object({
  workEmail: z.string().min(1, 'Work email is required').email('Enter a valid work email'),
  password: z.string().min(1, 'Password is required'),
})

type CompanyLoginFormValues = z.infer<typeof companyLoginSchema>

export default function CompanyLoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const setSession = useAuthStore((state) => state.setSession)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyLoginFormValues>({
    resolver: zodResolver(companyLoginSchema),
    defaultValues: { workEmail: '', password: '' },
  })

  async function onSubmit(values: CompanyLoginFormValues) {
    setFormError(null)
    try {
      const response = await authApi.login({ email: values.workEmail, password: values.password })
      setSession(response.accessToken, response.user)
      navigate(localize(ROUTES.companyDashboard))
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('errors.generic'))
    }
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <span className="mb-4 inline-block rounded-full bg-primary-tint px-3 py-[5px] text-[12.5px] font-bold text-primary">
          {t('companyLogin.badge')}
        </span>
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">{t('companyLogin.title')}</h1>
        <p className="text-sm text-slate">{t('companyLogin.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <Input
            label={t('fields.workEmail')}
            type="email"
            placeholder="you@company.com"
            error={errors.workEmail?.message}
            {...register('workEmail')}
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

      <SocialAuthButtons />

      <p className="mb-2.5 text-center text-[13.5px] text-slate">
        {t('companyLogin.newEmployer')}{' '}
        <Link to={localize(ROUTES.companyRegister)} className="font-bold text-primary no-underline">
          {t('companyLogin.registerCompany')}
        </Link>
      </p>
      <p className="text-center text-[13px] text-fog">
        {t('companyLogin.lookingForJob')}{' '}
        <Link to={localize(ROUTES.login)} className="font-semibold text-primary no-underline">
          {t('companyLogin.candidateLogin')}
        </Link>
      </p>
    </AuthCard>
  )
}
