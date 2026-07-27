import { zodResolver } from '@hookform/resolvers/zod'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { AutocompleteInput, Button, Input } from '../../components/ui'
import { ApiError, API_BASE_URL } from '../../lib/apiClient'
import { companyApi, type CompanyProfileResponse } from '../../lib/companyApi'
import { INDUSTRY_SUGGESTIONS } from '../../mocks/industries'
import { useAuthStore } from '../../stores/authStore'
import { PhoneInput } from '../auth/shared/PhoneInput'

const ENTITY_TYPES = [
  'Private Limited Company',
  'Limited Liability Partnership (LLP)',
  'Partnership Firm',
  'Sole Proprietorship',
  'Public Limited Company',
  'Company Not Yet Registered',
] as const

// Matches CompanyProfile.UNREGISTERED_ENTITY_TYPE on the backend — selecting this swaps
// CIN/GSTIN out for an Aadhaar number, since an unregistered company has neither yet. Same
// pattern as CompanyRegisterPage.
const UNREGISTERED_ENTITY_TYPE = 'Company Not Yet Registered'

const ENTITY_TYPE_KEYS: Record<(typeof ENTITY_TYPES)[number], string> = {
  'Private Limited Company': 'profile.entityTypes.privateLimited',
  'Limited Liability Partnership (LLP)': 'profile.entityTypes.llp',
  'Partnership Firm': 'profile.entityTypes.partnershipFirm',
  'Sole Proprietorship': 'profile.entityTypes.soleProprietorship',
  'Public Limited Company': 'profile.entityTypes.publicLimited',
  'Company Not Yet Registered': 'profile.entityTypes.notYetRegistered',
}

const profileSchema = z
  .object({
    companyName: z.string().min(2, 'Enter the company name'),
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
  })
  .refine(
    (values) =>
      values.entityType === UNREGISTERED_ENTITY_TYPE ||
      (values.cin.trim().length >= 15 && /^[0-9A-Z]{15}$/.test(values.gstin.trim())),
    {
      message: 'Enter a valid CIN or LLPIN, and a valid 15-character GSTIN',
      path: ['cin'],
    },
  )
  .refine(
    (values) =>
      values.entityType !== UNREGISTERED_ENTITY_TYPE ||
      /^\d{12}$/.test(values.aadhaarNumber.trim()),
    {
      message: 'Enter a valid 12-digit Aadhaar number',
      path: ['aadhaarNumber'],
    },
  )

type ProfileFormValues = z.infer<typeof profileSchema>

const BANNER_KEY_BY_STATE: Record<'incomplete' | 'PENDING' | 'VERIFIED' | 'REJECTED', string> = {
  incomplete: 'profile.completeBanner',
  PENDING: 'profile.pendingBanner',
  VERIFIED: 'profile.verifiedBanner',
  REJECTED: 'profile.rejectedBanner',
}

const BANNER_CLASS_BY_STATE: Record<'incomplete' | 'PENDING' | 'VERIFIED' | 'REJECTED', string> = {
  incomplete: 'border-[#FCE3B8] bg-amber-tint text-[#8A5A0F]',
  PENDING: 'border-[#FCE3B8] bg-amber-tint text-[#8A5A0F]',
  VERIFIED: 'border-teal/30 bg-teal-tint text-teal',
  REJECTED: 'border-danger/30 bg-danger/10 text-danger',
}

export default function CompanyProfilePage() {
  const { t } = useTranslation('company')
  const [profile, setProfile] = useState<CompanyProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  // Kept in authStore (not page-local state) so the header's logo and this page's logo always
  // show the same image without needing a page reload — see authStore.setCompanyLogo and
  // AuthenticatedLayout/PublicLayout.
  const logoUrl = useAuthStore((state) => state.companyLogoUrl)
  const logoVersion = useAuthStore((state) => state.companyLogoVersion)
  const setCompanyLogo = useAuthStore((state) => state.setCompanyLogo)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
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
    },
  })
  const entityType = useWatch({ control, name: 'entityType' })
  const isUnregistered = entityType === UNREGISTERED_ENTITY_TYPE

  useEffect(() => {
    let cancelled = false
    companyApi
      .getProfile()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setCompanyLogo(data.logoUrl)
        reset({
          companyName: data.companyName,
          entityType: (ENTITY_TYPES as readonly string[]).includes(data.entityType ?? '')
            ? (data.entityType as (typeof ENTITY_TYPES)[number])
            : ENTITY_TYPES[0],
          cin: data.cin ?? '',
          gstin: data.gstin ?? '',
          aadhaarNumber: data.aadhaarNumber ?? '',
          pan: data.pan ?? '',
          industry: data.industry ?? '',
          address: data.address ?? '',
          signatoryName: data.signatoryName ?? '',
          contactNumber: data.contactNumber ?? '',
        })
      })
      .catch((error) => {
        setLoadError(error instanceof ApiError ? error.message : t('profile.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reset, t, setCompanyLogo])

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLogoError(null)
    setUploadingLogo(true)
    try {
      const uploaded = await companyApi.uploadLogo(file)
      setCompanyLogo(uploaded.logoUrl)
    } catch (error) {
      setLogoError(error instanceof ApiError ? error.message : t('profile.logoError'))
    } finally {
      setUploadingLogo(false)
    }
  }

  async function onSubmit(values: ProfileFormValues) {
    if (!window.confirm(t('profile.confirmResubmit'))) return
    setFormError(null)
    setSaveSuccess(false)
    try {
      const updated = await companyApi.updateProfile(values)
      setProfile(updated)
      setSaveSuccess(true)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('profile.saveError'))
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-10 pb-16 text-center text-sm text-slate">
        {t('profile.loading')}
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-10 pb-16 text-center text-sm text-danger">
        {loadError ?? t('profile.loadError')}
      </main>
    )
  }

  const bannerState = !profile.profileComplete ? 'incomplete' : profile.verificationStatus

  return (
    <main className="mx-auto max-w-[760px] px-6 py-10 pb-16">
      <div className="mb-6">
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">{t('profile.title')}</h1>
        <p className="text-sm text-slate">{t('profile.subtitle')}</p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          {logoUrl ? (
            <img
              src={`${API_BASE_URL}${logoUrl}?v=${logoVersion}`}
              alt={profile.companyName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-[22px] font-bold text-white">
              {profile.companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            aria-label={t('profile.changeLogo')}
            className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-white disabled:opacity-60"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
        <div>
          <div className="text-base font-bold text-ink">{profile.companyName}</div>
          {logoError && <p className="mt-1 text-[12.5px] text-danger">{logoError}</p>}
        </div>
      </div>

      <div
        className={`mb-6 rounded-lg border px-4 py-3.5 text-[13px] leading-[1.55] ${BANNER_CLASS_BY_STATE[bannerState]}`}
      >
        {t(BANNER_KEY_BY_STATE[bannerState])}
      </div>

      <div className="rounded-card border border-border bg-surface p-8">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label htmlFor="entity-type" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('profile.fields.entityType')}
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
              label={t('profile.fields.companyName')}
              error={errors.companyName?.message}
              {...register('companyName')}
            />
          </div>

          {isUnregistered ? (
            <div className="mb-3.5">
              <Input
                label={t('profile.fields.aadhaarNumber')}
                placeholder="XXXX XXXX XXXX"
                error={errors.aadhaarNumber?.message}
                {...register('aadhaarNumber')}
              />
            </div>
          ) : (
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Input
                label={t('profile.fields.cin')}
                placeholder="U74999KA2021PTC145632"
                error={errors.cin?.message}
                {...register('cin')}
              />
              <Input
                label={t('profile.fields.gstin')}
                placeholder="29ABCDE1234F1Z5"
                error={errors.gstin?.message}
                {...register('gstin')}
              />
            </div>
          )}

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('profile.fields.pan')}
              placeholder="ABCDE1234F"
              error={errors.pan?.message}
              {...register('pan')}
            />
            <Controller
              name="industry"
              control={control}
              render={({ field }) => (
                <AutocompleteInput
                  label={t('profile.fields.industry')}
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
              {t('profile.fields.address')}
            </label>
            <textarea
              id="company-address"
              rows={2}
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              {...register('address')}
            />
            {errors.address && (
              <p className="mt-1.5 text-[13px] text-danger">{errors.address.message}</p>
            )}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('profile.fields.signatoryName')}
              error={errors.signatoryName?.message}
              {...register('signatoryName')}
            />
            <PhoneInput
              label={t('profile.fields.contactNumber')}
              error={errors.contactNumber?.message}
              {...register('contactNumber')}
            />
          </div>

          {formError && <p className="mb-4 text-[13px] text-danger">{formError}</p>}
          {saveSuccess && <p className="mb-4 text-[13px] text-teal">{t('profile.saveSuccess')}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {t('profile.submit')}
          </Button>
        </form>
      </div>
    </main>
  )
}
