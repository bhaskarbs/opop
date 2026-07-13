import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi } from '../../lib/apiClient'
import { Button, Input } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
import { FileDropInput } from './shared/FileDropInput'

const ENTITY_TYPES = [
  'Private Limited Company',
  'Limited Liability Partnership (LLP)',
  'Partnership Firm',
  'Sole Proprietorship',
  'Public Limited Company',
] as const

// Rendered text only — the literal values above stay as the actual form/backend enum values
// (see companyRegisterSchema below), same pattern as FilterSidebar's EXPERIENCE_LEVEL_KEYS.
const ENTITY_TYPE_KEYS: Record<(typeof ENTITY_TYPES)[number], string> = {
  'Private Limited Company': 'companyRegister.entityTypes.privateLimited',
  'Limited Liability Partnership (LLP)': 'companyRegister.entityTypes.llp',
  'Partnership Firm': 'companyRegister.entityTypes.partnershipFirm',
  'Sole Proprietorship': 'companyRegister.entityTypes.soleProprietorship',
  'Public Limited Company': 'companyRegister.entityTypes.publicLimited',
}

const companyRegisterSchema = z.object({
  companyName: z.string().min(2, 'Enter the registered company name'),
  entityType: z.enum(ENTITY_TYPES),
  cin: z.string().min(15, 'Enter a valid CIN or LLPIN'),
  gstin: z.string().regex(/^[0-9A-Z]{15}$/, 'Enter a valid 15-character GSTIN'),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  industry: z.string().min(2, 'Enter your industry or sector'),
  address: z.string().min(10, 'Enter your registered office address'),
  signatoryName: z.string().min(2, "Enter the authorized signatory's name"),
  workEmail: z.string().email('Enter a valid work email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  certificate: z.instanceof(File).optional(),
})

type CompanyRegisterFormValues = z.infer<typeof companyRegisterSchema>

const STEPS = [
  { labelKey: 'companyRegister.steps.companyDetails', active: true },
  { labelKey: 'companyRegister.steps.documentUpload', active: false },
  { labelKey: 'companyRegister.steps.verification', active: false },
]

export default function CompanyRegisterPage() {
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
  } = useForm<CompanyRegisterFormValues>({
    resolver: zodResolver(companyRegisterSchema),
    defaultValues: {
      companyName: '',
      entityType: ENTITY_TYPES[0],
      cin: '',
      gstin: '',
      pan: '',
      industry: '',
      address: '',
      signatoryName: '',
      workEmail: '',
      password: '',
    },
  })

  async function onSubmit(values: CompanyRegisterFormValues) {
    setFormError(null)
    try {
      // certificate (the uploaded PDF) has nowhere to go yet — file upload/storage is a
      // separate, not-yet-built service — but the rest of these fields now feed the Step 18
      // admin company-approval queue, so they're sent for real.
      const response = await authApi.register({
        email: values.workEmail,
        password: values.password,
        fullName: values.companyName,
        role: 'company',
        entityType: values.entityType,
        cin: values.cin,
        gstin: values.gstin,
        pan: values.pan,
        industry: values.industry,
        address: values.address,
        signatoryName: values.signatoryName,
      })
      setSession(response.accessToken, response.user)
      navigate(localize(ROUTES.companyDashboard))
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('errors.generic'))
    }
  }

  return (
    <main className="mx-auto max-w-[760px] px-6 py-10 pb-16">
      <div className="mb-6 text-center">
        <span className="rounded-full bg-primary-tint px-3 py-[5px] text-[12.5px] font-bold text-primary">
          {t('companyLogin.badge')}
        </span>
        <h1 className="mt-3.5 mb-1.5 text-[23px] font-extrabold text-ink">
          {t('companyRegister.title')}
        </h1>
        <p className="text-sm text-slate">{t('companyRegister.subtitle')}</p>
      </div>

      <div className="mb-7 flex gap-2">
        {STEPS.map((step) => (
          <div key={step.labelKey} className="flex-1 text-center">
            <div
              className={`mb-2 h-[5px] rounded-full ${step.active ? 'bg-primary' : 'bg-border'}`}
            />
            <div className={`text-xs font-semibold ${step.active ? 'text-ink' : 'text-fog'}`}>
              {t(step.labelKey)}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-border bg-surface p-8">
        <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">
          {t('companyRegister.steps.companyDetails')}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('companyRegister.fields.companyName')}
              placeholder="Vertex Robotics Pvt. Ltd."
              error={errors.companyName?.message}
              {...register('companyName')}
            />
            <div className="flex flex-col">
              <label htmlFor="entity-type" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('companyRegister.fields.entityType')}
              </label>
              <select
                id="entity-type"
                className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                {...register('entityType')}
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(ENTITY_TYPE_KEYS[type])}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('companyRegister.fields.cin')}
              placeholder="U74999KA2021PTC145632"
              error={errors.cin?.message}
              {...register('cin')}
            />
            <Input
              label={t('companyRegister.fields.gstin')}
              placeholder="29ABCDE1234F1Z5"
              error={errors.gstin?.message}
              {...register('gstin')}
            />
          </div>

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('companyRegister.fields.pan')}
              placeholder="ABCDE1234F"
              error={errors.pan?.message}
              {...register('pan')}
            />
            <Input
              label={t('companyRegister.fields.industry')}
              placeholder="Deep Tech, Healthtech, Fintech…"
              error={errors.industry?.message}
              {...register('industry')}
            />
          </div>

          <div className="mb-3.5">
            <label
              htmlFor="company-address"
              className="mb-1.5 block text-[13px] font-bold text-ink"
            >
              {t('companyRegister.fields.address')}
            </label>
            <textarea
              id="company-address"
              rows={2}
              placeholder={t('companyRegister.addressPlaceholder')}
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              {...register('address')}
            />
            {errors.address && (
              <p className="mt-1.5 text-[13px] text-danger">{errors.address.message}</p>
            )}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('companyRegister.fields.signatoryName')}
              placeholder={t('companyRegister.fullNamePlaceholder')}
              error={errors.signatoryName?.message}
              {...register('signatoryName')}
            />
            <Input
              label={t('fields.workEmail')}
              type="email"
              placeholder="founder@company.com"
              error={errors.workEmail?.message}
              {...register('workEmail')}
            />
          </div>

          <div className="mb-5">
            <Input
              label={t('fields.password')}
              type="password"
              placeholder={t('register.passwordPlaceholder')}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <div className="mb-[22px]">
            <Controller
              name="certificate"
              control={control}
              render={({ field }) => (
                <FileDropInput
                  label={t('companyRegister.certificate.label')}
                  placeholder={t('companyRegister.certificate.placeholder')}
                  hint={t('companyRegister.certificate.hint')}
                  accept=".pdf"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="mb-[22px] rounded-lg border border-[#FCE3B8] bg-amber-tint px-4 py-3.5 text-[13px] leading-[1.55] text-[#8A5A0F]">
            {t('companyRegister.mcaNotice')}
          </div>

          {formError && <p className="mb-4 text-[13px] text-danger">{formError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {t('companyRegister.submit')}
          </Button>
        </form>
      </div>
    </main>
  )
}
