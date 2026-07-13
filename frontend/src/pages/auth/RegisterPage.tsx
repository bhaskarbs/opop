import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi } from '../../lib/apiClient'
import { Button, Input } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
import { FileDropInput } from './shared/FileDropInput'
import { PhoneInput } from './shared/PhoneInput'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  skills: z.string().min(2, 'List at least one skill'),
  resume: z.instanceof(File).optional(),
  agreeTerms: z
    .boolean()
    .refine((val) => val === true, { message: 'You must agree to the terms to continue' }),
})

type RegisterFormValues = z.infer<typeof registerSchema>

const BENEFIT_KEYS = ['register.benefits.jobs', 'register.benefits.partnerships', 'register.benefits.community']

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const setSession = useAuthStore((state) => state.setSession)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      password: '',
      skills: '',
      agreeTerms: false,
    },
  })

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null)
    try {
      const response = await authApi.register({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        role: 'candidate',
        mobile: values.mobile,
        skills: values.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        resumeFileName: values.resume?.name,
      })
      setSession(response.accessToken, response.user)
      navigate(localize(ROUTES.candidateDashboard))
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('errors.generic'))
    }
  }

  return (
    <main className="mx-auto max-w-[960px] px-6 py-10 pb-16">
      <div className="auth:grid-cols-[minmax(0,1fr)_260px] grid grid-cols-1 gap-7">
        <div className="rounded-card border border-border bg-surface p-8">
          <h1 className="mb-1 text-[21px] font-extrabold text-ink">{t('register.title')}</h1>
          <p className="mb-[26px] text-sm text-slate">{t('register.subtitle')}</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Input
                label={t('fields.fullName')}
                placeholder="Rohan Mehta"
                error={errors.fullName?.message}
                {...register('fullName')}
              />
              <Input
                label={t('fields.email')}
                type="email"
                placeholder="rohan@email.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <PhoneInput
                label={t('fields.mobile')}
                error={errors.mobile?.message}
                {...register('mobile')}
              />
              <Input
                label={t('fields.password')}
                type="password"
                placeholder={t('register.passwordPlaceholder')}
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <div className="mb-3.5">
              <Input
                label={t('fields.skills')}
                placeholder={t('register.skillsPlaceholder')}
                error={errors.skills?.message}
                {...register('skills')}
              />
            </div>

            <div className="mb-5">
              <Controller
                name="resume"
                control={control}
                render={({ field }) => (
                  <FileDropInput
                    label={t('register.uploadResume')}
                    placeholder={t('register.resumeDropPlaceholder')}
                    hint={t('register.resumeHint')}
                    accept=".pdf,.doc,.docx"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <label className="mb-[22px] flex items-start gap-2.5 text-[13px] leading-[1.5] text-slate">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                {...register('agreeTerms')}
              />
              {t('register.agreeToThe')}{' '}
              <a
                href="#terms"
                onClick={(event) => event.preventDefault()}
                className="font-semibold no-underline"
              >
                {t('register.termsOfService')}
              </a>{' '}
              {t('register.and')}{' '}
              <a
                href="#privacy"
                onClick={(event) => event.preventDefault()}
                className="font-semibold no-underline"
              >
                {t('register.privacyPolicy')}
              </a>
              .
            </label>
            {errors.agreeTerms && (
              <p className="mb-4 -mt-3 text-[13px] text-danger">{errors.agreeTerms.message}</p>
            )}

            {formError && <p className="mb-4 text-[13px] text-danger">{formError}</p>}

            <Button type="submit" disabled={isSubmitting} className="mb-4 w-full">
              {t('register.submit')}
            </Button>
            <p className="text-center text-[13.5px] text-slate">
              {t('register.alreadyHaveAccount')}{' '}
              <Link to={localize(ROUTES.login)} className="font-bold text-primary no-underline">
                {t('login.submit')}
              </Link>
            </p>
          </form>
        </div>

        <aside className="auth:order-none order-first">
          <div className="rounded-card bg-primary-tint p-[22px]">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">
              {t('register.whyOneProfile')}
            </h3>
            {BENEFIT_KEYS.map((benefitKey) => (
              <div key={benefitKey} className="mb-3.5 flex gap-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="text-[13.5px] leading-[1.55] text-[#3A414D]">{t(benefitKey)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-card border border-border bg-surface p-[22px]">
            <div className="mb-1.5 text-[13.5px] font-bold text-ink">
              {t('register.hiringInstead')}
            </div>
            <Link
              to={localize(ROUTES.companyRegister)}
              className="text-[13.5px] font-bold text-primary no-underline"
            >
              {t('register.registerYourCompany')}
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
