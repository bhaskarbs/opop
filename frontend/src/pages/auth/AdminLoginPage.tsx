import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi } from '../../lib/apiClient'
import { Button, Input } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
import { AuthCard } from './shared/AuthCard'

const adminLoginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>

export default function AdminLoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const setSession = useAuthStore((state) => state.setSession)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: AdminLoginFormValues) {
    setFormError(null)
    try {
      const response = await authApi.login({ ...values, role: 'admin' })
      setSession(response.accessToken, response.user)
      navigate(localize(ROUTES.adminDashboard))
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('errors.generic'))
    }
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <span className="mb-4 inline-block rounded-full bg-neutral-tint px-3 py-[5px] text-[12.5px] font-bold text-slate">
          {t('adminLogin.badge')}
        </span>
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">{t('adminLogin.title')}</h1>
        <p className="text-sm text-slate">{t('adminLogin.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <Input
            label={t('fields.email')}
            type="email"
            placeholder="admin@openopportunity.com"
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
        </div>

        {formError && <p className="mb-[18px] text-[13px] text-danger">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {t('adminLogin.submit')}
        </Button>
      </form>
    </AuthCard>
  )
}
