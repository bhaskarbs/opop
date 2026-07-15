import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Input } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { companyApi, type CompanyProfileResponse } from '../../lib/companyApi'

const ENTITY_TYPES = [
  'Private Limited Company',
  'Limited Liability Partnership (LLP)',
  'Partnership Firm',
  'Sole Proprietorship',
  'Public Limited Company',
] as const

const ENTITY_TYPE_KEYS: Record<(typeof ENTITY_TYPES)[number], string> = {
  'Private Limited Company': 'profile.entityTypes.privateLimited',
  'Limited Liability Partnership (LLP)': 'profile.entityTypes.llp',
  'Partnership Firm': 'profile.entityTypes.partnershipFirm',
  'Sole Proprietorship': 'profile.entityTypes.soleProprietorship',
  'Public Limited Company': 'profile.entityTypes.publicLimited',
}

const profileSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  cin: z.string().min(15, 'Enter a valid CIN or LLPIN'),
  gstin: z.string().regex(/^[0-9A-Z]{15}$/, 'Enter a valid 15-character GSTIN'),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  industry: z.string().min(2, 'Enter your industry or sector'),
  address: z.string().min(10, 'Enter your registered office address'),
  signatoryName: z.string().min(2, "Enter the authorized signatory's name"),
})

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      entityType: ENTITY_TYPES[0],
      cin: '',
      gstin: '',
      pan: '',
      industry: '',
      address: '',
      signatoryName: '',
    },
  })

  useEffect(() => {
    let cancelled = false
    companyApi
      .getProfile()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        reset({
          entityType: (ENTITY_TYPES as readonly string[]).includes(data.entityType ?? '')
            ? (data.entityType as (typeof ENTITY_TYPES)[number])
            : ENTITY_TYPES[0],
          cin: data.cin ?? '',
          gstin: data.gstin ?? '',
          pan: data.pan ?? '',
          industry: data.industry ?? '',
          address: data.address ?? '',
          signatoryName: data.signatoryName ?? '',
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
  }, [reset, t])

  async function onSubmit(values: ProfileFormValues) {
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
              label={t('profile.fields.cin')}
              placeholder="U74999KA2021PTC145632"
              error={errors.cin?.message}
              {...register('cin')}
            />
          </div>

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label={t('profile.fields.gstin')}
              placeholder="29ABCDE1234F1Z5"
              error={errors.gstin?.message}
              {...register('gstin')}
            />
            <Input
              label={t('profile.fields.pan')}
              placeholder="ABCDE1234F"
              error={errors.pan?.message}
              {...register('pan')}
            />
          </div>

          <div className="mb-3.5">
            <Input
              label={t('profile.fields.industry')}
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

          <div className="mb-5">
            <Input
              label={t('profile.fields.signatoryName')}
              error={errors.signatoryName?.message}
              {...register('signatoryName')}
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
