import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi } from '../../lib/apiClient'
import { AutocompleteInput, Button, Input } from '../../components/ui'
import { CERTIFICATE_LIMIT, companyApi } from '../../lib/companyApi'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { INDUSTRY_SUGGESTIONS } from '../../mocks/industries'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
import { PhoneInput } from './shared/PhoneInput'

const ENTITY_TYPES = [
  'Private Limited Company',
  'Limited Liability Partnership (LLP)',
  'Partnership Firm',
  'Sole Proprietorship',
  'Public Limited Company',
  'Company Not Yet Registered',
] as const

// Matches CompanyProfile.UNREGISTERED_ENTITY_TYPE on the backend — selecting this swaps
// CIN/GSTIN out for an Aadhaar number, since an unregistered company has neither yet.
const UNREGISTERED_ENTITY_TYPE = 'Company Not Yet Registered'

// Rendered text only — the literal values above stay as the actual form/backend enum values
// (see companyRegisterSchema below), same pattern as FilterSidebar's EXPERIENCE_LEVEL_KEYS.
const ENTITY_TYPE_KEYS: Record<(typeof ENTITY_TYPES)[number], string> = {
  'Private Limited Company': 'companyRegister.entityTypes.privateLimited',
  'Limited Liability Partnership (LLP)': 'companyRegister.entityTypes.llp',
  'Partnership Firm': 'companyRegister.entityTypes.partnershipFirm',
  'Sole Proprietorship': 'companyRegister.entityTypes.soleProprietorship',
  'Public Limited Company': 'companyRegister.entityTypes.publicLimited',
  'Company Not Yet Registered': 'companyRegister.entityTypes.notYetRegistered',
}

const companyRegisterSchema = z
  .object({
    companyName: z.string().min(2, 'Enter the registered company name'),
    entityType: z.enum(ENTITY_TYPES),
    cin: z.string(),
    gstin: z.string(),
    aadhaarNumber: z.string(),
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)'),
    industry: z.string().min(2, 'Enter your industry or sector'),
    address: z.string().min(10, 'Enter your registered office address'),
    signatoryName: z.string().min(2, "Enter the authorized signatory's name"),
    contactNumber: z
      .string()
      .min(1, 'Contact number is required')
      .regex(/^\d{10}$/, 'Enter a valid 10-digit contact number'),
    workEmail: z.string().email('Enter a valid work email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
    certificates: z
      .array(z.instanceof(File))
      .max(CERTIFICATE_LIMIT, `You can upload up to ${CERTIFICATE_LIMIT} documents`),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(
    (values) =>
      values.entityType !== UNREGISTERED_ENTITY_TYPE ||
      /^\d{12}$/.test(values.aadhaarNumber.trim()),
    {
      message: 'Enter a valid 12-digit Aadhaar number',
      path: ['aadhaarNumber'],
    },
  )

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
      aadhaarNumber: '',
      pan: '',
      industry: '',
      address: '',
      signatoryName: '',
      contactNumber: '',
      workEmail: '',
      password: '',
      confirmPassword: '',
      certificates: [],
    },
  })
  const entityType = useWatch({ control, name: 'entityType' })
  const isUnregistered = entityType === UNREGISTERED_ENTITY_TYPE
  const certificateInputRef = useRef<HTMLInputElement>(null)

  async function onSubmit(values: CompanyRegisterFormValues) {
    setFormError(null)
    try {
      const response = await authApi.register({
        email: values.workEmail,
        password: values.password,
        fullName: values.companyName,
        role: 'company',
        entityType: values.entityType,
        cin: values.cin,
        gstin: values.gstin,
        aadhaarNumber: values.aadhaarNumber,
        pan: values.pan,
        industry: values.industry,
        address: values.address,
        signatoryName: values.signatoryName,
        contactNumber: values.contactNumber,
      })
      setSession(response.accessToken, response.user)

      // Best-effort — the account is already created at this point, so a failed document
      // upload shouldn't block the company from reaching their dashboard. They can re-upload
      // later from their profile (see CompanyProfilePage), which uses the same
      // POST /api/company/certificates endpoint for each document.
      for (const file of values.certificates) {
        try {
          await companyApi.uploadCertificate(file)
        } catch {
          // Continue with the remaining documents even if one fails.
        }
      }

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
            <Input
              label={t('companyRegister.fields.companyName')}
              placeholder="Vertex Robotics Pvt. Ltd."
              error={errors.companyName?.message}
              {...register('companyName')}
            />
          </div>

          {isUnregistered ? (
            <div className="mb-3.5">
              <Input
                label={t('companyRegister.fields.aadhaarNumber')}
                placeholder="XXXX XXXX XXXX"
                error={errors.aadhaarNumber?.message}
                {...register('aadhaarNumber')}
              />
            </div>
          ) : (
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
          )}

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('companyRegister.fields.pan')}
              placeholder="ABCDE1234F"
              error={errors.pan?.message}
              {...register('pan')}
            />
            <Controller
              name="industry"
              control={control}
              render={({ field }) => (
                <AutocompleteInput
                  label={t('companyRegister.fields.industry')}
                  placeholder="Deep Tech, Healthtech, Fintech…"
                  error={errors.industry?.message}
                  suggestions={INDUSTRY_SUGGESTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
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

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('companyRegister.fields.signatoryName')}
              placeholder={t('companyRegister.fullNamePlaceholder')}
              error={errors.signatoryName?.message}
              {...register('signatoryName')}
            />
            <PhoneInput
              label={t('companyRegister.fields.contactNumber')}
              error={errors.contactNumber?.message}
              {...register('contactNumber')}
            />
          </div>

          <div className="mb-5">
            <Input
              label={t('fields.workEmail')}
              type="email"
              placeholder="founder@company.com"
              error={errors.workEmail?.message}
              {...register('workEmail')}
            />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('fields.password')}
              type="password"
              placeholder={t('register.passwordPlaceholder')}
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label={t('fields.confirmPassword')}
              type="password"
              placeholder={t('register.confirmPasswordPlaceholder')}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          <div className="mb-[22px]">
            <Controller
              name="certificates"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-ink">
                    {t('companyRegister.certificate.label')}
                  </label>
                  <button
                    type="button"
                    onClick={() => certificateInputRef.current?.click()}
                    disabled={field.value.length >= CERTIFICATE_LIMIT}
                    className="w-full rounded-xl border-[1.5px] border-dashed border-[#C7CCD6] p-6 text-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8891A0"
                      strokeWidth={1.8}
                      className="mx-auto mb-2"
                    >
                      <path d="M12 3v12M7 8l5-5 5 5M5 21h14" />
                    </svg>
                    <div className="mb-0.5 text-[13.5px] font-semibold text-ink">
                      {t('companyRegister.certificate.placeholder')}
                    </div>
                    <div className="text-[12.5px] text-fog">
                      {t('companyRegister.certificate.hint', { limit: CERTIFICATE_LIMIT })}
                    </div>
                  </button>
                  <input
                    ref={certificateInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const picked = Array.from(event.target.files ?? [])
                      event.target.value = ''
                      field.onChange([...field.value, ...picked].slice(0, CERTIFICATE_LIMIT))
                    }}
                  />
                  {field.value.length > 0 && (
                    <ul className="mt-2.5 flex flex-col gap-1.5">
                      {field.value.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[13px] text-ink"
                        >
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              field.onChange(field.value.filter((_, i) => i !== index))
                            }
                            aria-label={t('companyRegister.certificate.remove', {
                              name: file.name,
                            })}
                            className="ml-2 shrink-0 text-fog"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {errors.certificates && (
                    <p className="mt-1.5 text-[13px] text-danger">{errors.certificates.message}</p>
                  )}
                </div>
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
