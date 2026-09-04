import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
// Controller is only needed for the skills/resume fields — see the "commented out on request"
// block further down. Restore this import alongside that block if it comes back.
// import { Controller, useForm } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi } from '../../lib/apiClient'
import { candidateApi } from '../../lib/candidateApi'
import { Button, Input, PasswordInput } from '../../components/ui'
// import { SkillsTagInput } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
// import { SKILL_SUGGESTIONS } from '../../mocks/skills'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
// import { FileDropInput } from './shared/FileDropInput'
import { PhoneInput } from './shared/PhoneInput'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // Commented out on request alongside the skills/resume fields below — no longer collected (or
  // required) at registration time. skills stays in the schema/payload as an always-empty array
  // (the backend already treats it as an optional list) so this is a one-block revert later.
  skills: z.array(z.string()),
  resume: z.instanceof(File).optional(),
  agreeTerms: z
    .boolean()
    .refine((val) => val === true, { message: 'You must agree to the terms to continue' }),
})

type RegisterFormValues = z.infer<typeof registerSchema>

const BENEFIT_KEYS = [
  'register.benefits.jobs',
  'register.benefits.partnerships',
  'register.benefits.community',
]

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const setSession = useAuthStore((state) => state.setSession)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    // control, // only needed for the commented-out skills/resume Controller fields below
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      password: '',
      skills: [],
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
        skills: values.skills,
        resumeFileName: values.resume?.name,
      })
      setSession(response.accessToken, response.user)

      if (values.resume) {
        try {
          await candidateApi.uploadResume(values.resume)
        } catch {
          // Best-effort — the account is already created at this point, so a failed resume
          // upload shouldn't block the candidate from reaching their dashboard. They can
          // re-upload later from their profile.
        }
      }

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
                error={errors.fullName?.message}
                {...register('fullName')}
              />
              <Input
                label={t('fields.email')}
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <PhoneInput
                label={t('fields.mobile')}
                placeholder=""
                error={errors.mobile?.message}
                {...register('mobile')}
              />
              <PasswordInput
                label={t('fields.password')}
                error={errors.password?.message}
                showPasswordLabel={t('fields.showPassword')}
                hidePasswordLabel={t('fields.hidePassword')}
                {...register('password')}
              />
            </div>

            {/* Commented out on request (2026-09-04) — skills and resume upload are no longer
                collected at registration time. Restore alongside the Controller/SkillsTagInput/
                SKILL_SUGGESTIONS/FileDropInput imports and the `control` destructure above if
                this comes back.
            <div className="mb-3.5">
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <SkillsTagInput
                    label={t('fields.skills')}
                    placeholder={t('register.skillsPlaceholder')}
                    error={errors.skills?.message}
                    value={field.value}
                    onChange={field.onChange}
                    suggestions={SKILL_SUGGESTIONS}
                    removeSkillLabel={(skill) => t('register.removeSkill', { skill })}
                  />
                )}
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
            */}

            <label className="mb-[22px] flex items-start gap-2.5 text-[13px] leading-[1.5] text-slate">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                {...register('agreeTerms')}
              />
              {t('register.agreeToThe')}{' '}
              <Link
                to={localize(ROUTES.termsOfService)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold no-underline"
              >
                {t('register.termsOfService')}
              </Link>{' '}
              {t('register.and')}{' '}
              <Link
                to={localize(ROUTES.privacyPolicy)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold no-underline"
              >
                {t('register.privacyPolicy')}
              </Link>
              .
            </label>
            {errors.agreeTerms && (
              <p className="mb-4 -mt-3 text-[13px] text-danger">{errors.agreeTerms.message}</p>
            )}

            {formError && <p className="mb-4 text-[13px] text-danger">{formError}</p>}

            <Button type="submit" loading={isSubmitting} className="mb-4 w-full">
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
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">{t('register.whyOneProfile')}</h3>
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
