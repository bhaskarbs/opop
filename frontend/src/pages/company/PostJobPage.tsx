import { zodResolver } from '@hookform/resolvers/zod'
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input, LoadingState, SkillsTagInput } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import {
  employmentTypeToBackend,
  employmentTypeFromBackend,
  experienceLevelToBackend,
  experienceLevelFromBackend,
  workModeToBackend,
  workModeFromBackend,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  WORK_MODES,
  type EmploymentTypeLabel,
  type ExperienceLevelLabel,
  type WorkModeLabel,
} from '../../lib/jobEnums'
import { apiErrorMessage, API_BASE_URL } from '../../lib/apiClient'
import { jobsApi, type JobRequestPayload } from '../../lib/jobsApi'
import { LOCATION_SUGGESTIONS } from '../../mocks/locations'
import { ROUTES } from '../../routes/paths'
import { useCompanyProfileStore } from '../../stores/companyProfileStore'

// Rendered text only — the underlying enum values stay as-is (see lib/jobEnums.ts). Experience
// level and work mode reuse the `public` namespace's filter labels rather than duplicating them.
const EMPLOYMENT_TYPE_KEYS: Record<EmploymentTypeLabel, string> = {
  'Full-time': 'postJob.employmentType.fullTime',
  'Part-time': 'postJob.employmentType.partTime',
  Contract: 'postJob.employmentType.contract',
  Internship: 'postJob.employmentType.internship',
}
const EXPERIENCE_LEVEL_KEYS: Record<ExperienceLevelLabel, string> = {
  'Entry level': 'public:filters.experienceLevel.entry',
  'Mid level': 'public:filters.experienceLevel.mid',
  Senior: 'public:filters.experienceLevel.senior',
  Leadership: 'public:filters.experienceLevel.leadership',
}
const WORK_MODE_KEYS: Record<WorkModeLabel, string> = {
  Remote: 'public:filters.workMode.remote',
  Hybrid: 'public:filters.workMode.hybrid',
  'On-site': 'public:filters.workMode.onSite',
}

const postJobSchema = z.object({
  title: z.string().min(2, 'Enter a job title'),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  workMode: z.enum(WORK_MODES),
  locationRows: z
    .array(
      z.object({
        location: z.string().min(1, 'Enter a location'),
        // Free-typed, comma-separated areas/neighborhoods within this one location — kept as a
        // single string per row (not a tag list) so it round-trips through a plain text input.
        areas: z.string(),
      }),
    )
    .min(1, 'Add at least one location'),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  experienceYearsMin: z.string().optional(),
  experienceYearsMax: z.string().optional(),
  deadline: z.string().optional(),
  aboutRole: z.string().min(10, 'Describe the role, team, and what success looks like'),
  responsibilities: z.string().min(2, 'List at least one responsibility'),
  requirements: z.string().min(2, 'List at least one requirement'),
  skills: z.array(z.string()).min(1, 'Add at least one required skill'),
})

type PostJobFormValues = z.infer<typeof postJobSchema>

function parseSalaryLakhs(value: string | undefined): number | null {
  if (!value) return null
  const match = value.match(/[\d.]+/)
  return match ? Number.parseFloat(match[0]) : null
}

function parseYears(value: string | undefined): number | null {
  if (!value) return null
  const match = value.match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : null
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

type LocationRow = { location: string; areas: string }

// The backend still only ever sees a flat locations: string[] (no schema change for areas) — an
// area is stored as "{location} - {area}" alongside the bare location entry. These two functions
// are the only place that encoding exists: one flattens the form's per-location rows into that
// flat array for submission, the other parses an existing job's flat array back into rows when
// loading it for editing.
function flattenLocationRows(rows: LocationRow[]): string[] {
  const flat: string[] = []
  for (const row of rows) {
    const location = row.location.trim()
    if (!location) continue
    flat.push(location)
    for (const area of row.areas
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)) {
      flat.push(`${location} - ${area}`)
    }
  }
  return flat
}
function toLocationRows(locations: string[]): LocationRow[] {
  const bareLocations = locations.filter((value) => !value.includes(' - '))
  return bareLocations.map((location) => {
    const prefix = `${location} - `
    const areas = locations
      .filter((value) => value.startsWith(prefix))
      .map((value) => value.slice(prefix.length))
    return { location, areas: areas.join(', ') }
  })
}

function toJobRequest(
  values: PostJobFormValues,
  status: 'PENDING_APPROVAL' | 'DRAFT',
): JobRequestPayload {
  return {
    title: values.title,
    employmentType: employmentTypeToBackend(values.employmentType),
    experienceLevel: experienceLevelToBackend(values.experienceLevel),
    workMode: workModeToBackend(values.workMode),
    locations: flattenLocationRows(values.locationRows),
    salaryMinLakhs: parseSalaryLakhs(values.salaryMin),
    salaryMaxLakhs: parseSalaryLakhs(values.salaryMax),
    experienceYearsMin: parseYears(values.experienceYearsMin),
    experienceYearsMax: parseYears(values.experienceYearsMax),
    applicationDeadline: values.deadline || null,
    aboutRole: values.aboutRole,
    responsibilities: splitLines(values.responsibilities),
    requirements: splitLines(values.requirements),
    skills: values.skills,
    status,
  }
}

export default function PostJobPage() {
  const { t } = useTranslation('company')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const { jobId } = useParams()
  const editing = !!jobId
  const [newSkill, setNewSkill] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  // Mirrors JobService.requireEligibleToPostJobs on the backend — checked here too so a
  // not-yet-eligible company sees why instead of filling out the whole form only to hit a 403.
  // Only gates *creating* a new posting — JobService#update has no such check (a company can
  // always edit a job it already owns, regardless of its current profile/verification status),
  // so this stays permanently true when editing rather than blocking access to an existing job.
  const [eligible, setEligible] = useState<boolean | null>(editing ? true : null)
  const [loadingExisting, setLoadingExisting] = useState(editing)

  // Display branding override (edit mode only — see JobService#updateBranding/#uploadLogo,
  // which both require the job to already exist). displayCompanyName/logoUrl are pre-filled
  // from the job's already-resolved values (detail.companyName/companyLogoUrl already reflect
  // any existing override), so this doubles as "edit the current value" whether or not an
  // override is actually set — same pattern as AdminPostJobPage.
  const [displayCompanyName, setDisplayCompanyName] = useState('')
  const [initialDisplayCompanyName, setInitialDisplayCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // See the eligible state's own comment — editing an existing job never depends on this.
    if (editing) return
    let cancelled = false
    useCompanyProfileStore
      .getState()
      .fetchProfile()
      .then((profile) => {
        if (!cancelled)
          setEligible(profile.profileComplete && profile.verificationStatus === 'VERIFIED')
      })
      .catch(() => {
        if (!cancelled) setEligible(false)
      })
    return () => {
      cancelled = true
    }
  }, [editing])

  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PostJobFormValues>({
    resolver: zodResolver(postJobSchema),
    defaultValues: {
      title: '',
      employmentType: EMPLOYMENT_TYPES[0],
      experienceLevel: EXPERIENCE_LEVELS[0],
      workMode: WORK_MODES[0],
      locationRows: [],
      salaryMin: '',
      salaryMax: '',
      experienceYearsMin: '',
      experienceYearsMax: '',
      deadline: '',
      aboutRole: '',
      responsibilities: '',
      requirements: '',
      skills: [],
    },
  })

  const {
    fields: locationRows,
    append: appendLocationRow,
    remove: removeLocationRow,
  } = useFieldArray({ control, name: 'locationRows' })

  // Owner-only visibility on GET /api/jobs/{id} (see JobService.get) means this loads
  // regardless of the existing posting's status (DRAFT/PENDING_APPROVAL/ACTIVE/...), unlike the
  // public job detail page which only ever sees ACTIVE jobs.
  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    jobsApi
      .detail(jobId)
      .then((detail) => {
        if (cancelled) return
        setDisplayCompanyName(detail.companyName)
        setInitialDisplayCompanyName(detail.companyName)
        setLogoUrl(detail.companyLogoUrl)
        reset({
          title: detail.title,
          employmentType: employmentTypeFromBackend(detail.employmentType),
          experienceLevel: experienceLevelFromBackend(detail.experienceLevel),
          workMode: workModeFromBackend(detail.workMode),
          locationRows: toLocationRows(detail.locations),
          salaryMin: detail.salaryMinLakhs != null ? String(detail.salaryMinLakhs) : '',
          salaryMax: detail.salaryMaxLakhs != null ? String(detail.salaryMaxLakhs) : '',
          experienceYearsMin:
            detail.experienceYearsMin != null ? String(detail.experienceYearsMin) : '',
          experienceYearsMax:
            detail.experienceYearsMax != null ? String(detail.experienceYearsMax) : '',
          deadline: detail.applicationDeadline ?? '',
          aboutRole: detail.aboutRole,
          responsibilities: detail.responsibilities.join('\n'),
          requirements: detail.requirements.join('\n'),
          skills: detail.skills,
        })
      })
      .catch((error) => {
        if (!cancelled) {
          setFormError(apiErrorMessage(error, t('postJob.errorGeneric')))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [jobId, reset, t])

  function goToMyJobPostings() {
    navigate(localize(ROUTES.companyJobPostings))
  }

  // The display-name/logo overrides only exist on an already-created job (see
  // JobService#updateBranding/#uploadLogo) — a fresh create routes here afterward instead of
  // the dashboard, so a company can set them right away without a separate trip.
  function goToEditNewJob(id: string) {
    navigate(localize(ROUTES.companyJobEdit(id)), { replace: true })
  }

  // No-op (skipped) when the field wasn't touched — avoids an extra request on every save.
  async function syncBrandingIfChanged(id: string) {
    if (displayCompanyName.trim() === initialDisplayCompanyName.trim()) return
    await jobsApi.updateBranding(id, displayCompanyName.trim() || null)
    setInitialDisplayCompanyName(displayCompanyName.trim())
  }

  async function onPublish(values: PostJobFormValues) {
    setFormError(null)
    try {
      // Companies can no longer publish straight to ACTIVE — this now goes into the Step 18
      // admin job-approval queue and only appears live once an admin approves it. Editing an
      // already-ACTIVE job the same way sends it back for re-approval rather than leaving it
      // live with unreviewed changes.
      if (editing && jobId) {
        await jobsApi.update(jobId, toJobRequest(values, 'PENDING_APPROVAL'))
        await syncBrandingIfChanged(jobId)
        goToMyJobPostings()
      } else {
        const created = await jobsApi.create(toJobRequest(values, 'PENDING_APPROVAL'))
        goToEditNewJob(created.id)
      }
    } catch (error) {
      setFormError(apiErrorMessage(error, t('postJob.errorGeneric')))
    }
  }

  async function onSaveDraft() {
    setFormError(null)
    const values = getValues()
    // Mirrors JobRequest's actual @NotBlank/@NotEmpty fields on the backend (title/locations/
    // aboutRole — see JobRequest.java) — a draft still has to satisfy these, so checking only
    // the title here let a save-as-draft 400 with a generic "Validation failed" that was easy
    // to miss, leaving the company thinking their draft saved when it was never actually
    // persisted.
    if (!values.title.trim()) {
      setFormError(t('postJob.errorTitleRequired'))
      return
    }
    if (values.locationRows.length === 0) {
      setFormError(t('postJob.errorLocationRequired'))
      return
    }
    if (!values.aboutRole.trim()) {
      setFormError(t('postJob.errorAboutRoleRequired'))
      return
    }
    try {
      if (editing && jobId) {
        await jobsApi.update(jobId, toJobRequest(values, 'DRAFT'))
        await syncBrandingIfChanged(jobId)
        goToMyJobPostings()
      } else {
        const created = await jobsApi.create(toJobRequest(values, 'DRAFT'))
        goToEditNewJob(created.id)
      }
    } catch (error) {
      setFormError(apiErrorMessage(error, t('postJob.errorGeneric')))
    }
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !jobId) return
    setLogoError(null)
    setUploadingLogo(true)
    try {
      const detail = await jobsApi.uploadLogo(jobId, file)
      setLogoUrl(detail.companyLogoUrl)
    } catch (error) {
      setLogoError(apiErrorMessage(error, t('postJob.logoError')))
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleRemoveLogo() {
    if (!jobId) return
    setLogoError(null)
    setRemovingLogo(true)
    try {
      const detail = await jobsApi.removeLogo(jobId)
      setLogoUrl(detail.companyLogoUrl)
    } catch (error) {
      setLogoError(apiErrorMessage(error, t('postJob.logoError')))
    } finally {
      setRemovingLogo(false)
    }
  }

  if (eligible === null || loadingExisting) {
    return (
      <main className="mx-auto max-w-[840px] px-6 py-7 pb-16">
        <LoadingState
          message={
            loadingExisting ? t('postJob.loadingExisting') : t('postJob.checkingEligibility')
          }
        />
      </main>
    )
  }

  if (!eligible) {
    return (
      <main className="mx-auto max-w-[840px] px-6 py-7 pb-16">
        <div className="rounded-card border border-[#FCE3B8] bg-amber-tint p-8 text-center">
          <h1 className="mb-2 text-lg font-bold text-[#8A5A0F]">{t('postJob.notEligibleTitle')}</h1>
          <p className="mb-5 text-sm text-[#8A5A0F]">{t('postJob.notEligibleBody')}</p>
          <Link
            to={localize(ROUTES.companyProfile)}
            className="inline-block rounded-lg bg-primary px-5 py-2.5 text-[13.5px] font-bold text-white no-underline"
          >
            {t('dashboard.completeProfileCta')}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[840px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">
        {editing ? t('postJob.titleEdit') : t('postJob.title')}
      </h1>
      <p className="mb-6 text-sm text-slate">{t('postJob.subtitle')}</p>

      <form onSubmit={handleSubmit(onPublish)} noValidate>
        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">{t('postJob.branding')}</h2>
          {editing ? (
            <>
              <div>
                <label
                  htmlFor="displayCompanyName"
                  className="mb-1.5 block text-[13px] font-bold text-ink"
                >
                  {t('postJob.displayCompanyName')}
                </label>
                <p className="mb-1.5 text-[12.5px] text-fog">
                  {t('postJob.displayCompanyNameHint')}
                </p>
                <input
                  id="displayCompanyName"
                  value={displayCompanyName}
                  onChange={(event) => setDisplayCompanyName(event.target.value)}
                  className="w-full rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-[13px] font-bold text-ink">
                  {t('postJob.logo')}
                </label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={`${API_BASE_URL}${logoUrl}`}
                      alt=""
                      className="h-12 w-12 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-neutral-tint text-[11px] text-fog">
                      {t('postJob.noLogo')}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => logoInputRef.current?.click()}
                    loading={uploadingLogo}
                  >
                    {t('postJob.uploadLogo')}
                  </Button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={removingLogo}
                      className="text-[12.5px] font-bold text-danger disabled:opacity-60"
                    >
                      {removingLogo ? t('postJob.removingLogo') : t('postJob.removeLogo')}
                    </button>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                {logoError && <p className="mt-1.5 text-[13px] text-danger">{logoError}</p>}
              </div>
            </>
          ) : (
            <p className="text-[12.5px] text-fog">{t('postJob.brandingAfterCreateHint')}</p>
          )}
        </div>

        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">{t('postJob.roleDetails')}</h2>
          <div className="mb-3.5">
            <Input
              label={t('postJob.fields.jobTitle')}
              placeholder="e.g. Senior Frontend Developer"
              error={errors.title?.message}
              {...register('title')}
            />
          </div>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label htmlFor="employmentType" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('postJob.fields.employmentType')}
              </label>
              <select
                id="employmentType"
                className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                {...register('employmentType')}
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(EMPLOYMENT_TYPE_KEYS[type])}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="experienceLevel" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('public:filters.experienceLevel.heading')}
              </label>
              <select
                id="experienceLevel"
                className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                {...register('experienceLevel')}
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {t(EXPERIENCE_LEVEL_KEYS[level])}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label htmlFor="workMode" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('public:filters.workMode.heading')}
              </label>
              <select
                id="workMode"
                className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                {...register('workMode')}
              >
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(WORK_MODE_KEYS[mode])}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              {/* Purely an "add a location" control, not a value display — value is always []
                  so SkillsTagInput never renders its own chips here; each add becomes a new
                  row below instead of a chip in this input's own list. */}
              <SkillsTagInput
                label={t('postJob.fields.location')}
                value={[]}
                onChange={(next) => {
                  const added = next[0]?.trim()
                  if (added) appendLocationRow({ location: added, areas: '' })
                }}
                suggestions={LOCATION_SUGGESTIONS}
                placeholder={t('postJob.fields.locationPlaceholder')}
                error={errors.locationRows?.message}
                removeSkillLabel={(location) =>
                  t('candidate:profile.removeSkill', { skill: location })
                }
              />
              {locationRows.length > 0 && (
                <div className="flex flex-col gap-2">
                  {locationRows.map((row, index) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-tint px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap text-[#3A414D]">
                        {row.location}
                        <button
                          type="button"
                          onClick={() => removeLocationRow(index)}
                          aria-label={t('candidate:profile.removeSkill', { skill: row.location })}
                          className="cursor-pointer text-fog"
                        >
                          ×
                        </button>
                      </span>
                      <input
                        {...register(`locationRows.${index}.areas`)}
                        placeholder={t('postJob.fields.areaPlaceholder')}
                        className="min-w-0 flex-1 rounded-control border border-border px-3 py-2 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1.5 text-[13px] font-bold text-ink">
                {t('postJob.fields.salaryRange')}
              </label>
              <div className="flex gap-2">
                <input
                  placeholder={t('postJob.fields.salaryMinPlaceholder')}
                  className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  {...register('salaryMin')}
                />
                <input
                  placeholder={t('postJob.fields.salaryMaxPlaceholder')}
                  className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  {...register('salaryMax')}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label htmlFor="deadline" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('postJob.fields.deadline')}
              </label>
              <input
                id="deadline"
                type="date"
                className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                {...register('deadline')}
              />
            </div>
          </div>
          <div className="mt-3.5 flex flex-col">
            <label className="mb-1.5 text-[13px] font-bold text-ink">
              {t('postJob.fields.experienceYears')}
            </label>
            <div className="flex max-w-[calc(50%-0.4375rem)] gap-2">
              <input
                placeholder={t('postJob.fields.experienceYearsMinPlaceholder')}
                type="number"
                min={0}
                className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                {...register('experienceYearsMin')}
              />
              <input
                placeholder={t('postJob.fields.experienceYearsMaxPlaceholder')}
                type="number"
                min={0}
                className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                {...register('experienceYearsMax')}
              />
            </div>
          </div>
        </div>

        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">{t('postJob.description')}</h2>
          <div className="mb-3.5">
            <label htmlFor="aboutRole" className="mb-1.5 block text-[13px] font-bold text-ink">
              {t('public:jobDetail.aboutRole')}
            </label>
            <textarea
              id="aboutRole"
              rows={4}
              placeholder={t('postJob.fields.aboutRolePlaceholder')}
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              {...register('aboutRole')}
            />
            {errors.aboutRole && (
              <p className="mt-1.5 text-[13px] text-danger">{errors.aboutRole.message}</p>
            )}
          </div>
          <div className="mb-3.5">
            <label
              htmlFor="responsibilities"
              className="mb-1.5 block text-[13px] font-bold text-ink"
            >
              {t('public:jobDetail.responsibilities')}
            </label>
            <textarea
              id="responsibilities"
              rows={3}
              placeholder={t('postJob.fields.onePerLine')}
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              {...register('responsibilities')}
            />
            {errors.responsibilities && (
              <p className="mt-1.5 text-[13px] text-danger">{errors.responsibilities.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="requirements" className="mb-1.5 block text-[13px] font-bold text-ink">
              {t('public:jobDetail.requirements')}
            </label>
            <textarea
              id="requirements"
              rows={3}
              placeholder={t('postJob.fields.onePerLine')}
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              {...register('requirements')}
            />
            {errors.requirements && (
              <p className="mt-1.5 text-[13px] text-danger">{errors.requirements.message}</p>
            )}
          </div>
        </div>

        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-1.5 text-[15.5px] font-bold text-ink">{t('postJob.requiredSkills')}</h2>
          <p className="mb-3.5 text-[13px] text-fog">{t('postJob.requiredSkillsBody')}</p>
          <Controller
            name="skills"
            control={control}
            render={({ field }) => {
              function addSkill(event: KeyboardEvent<HTMLInputElement>) {
                if (event.key !== 'Enter') return
                event.preventDefault()
                const trimmed = newSkill.trim()
                if (trimmed && !field.value.includes(trimmed)) {
                  field.onChange([...field.value, trimmed])
                }
                setNewSkill('')
              }
              return (
                <>
                  <div className="mb-3.5 flex flex-wrap gap-2">
                    {field.value.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center gap-1.5 rounded-full bg-neutral-tint px-3.5 py-1.5 text-sm font-semibold text-[#3A414D]"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => field.onChange(field.value.filter((s) => s !== skill))}
                          aria-label={t('candidate:profile.removeSkill', { skill })}
                          className="cursor-pointer text-fog"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    value={newSkill}
                    onChange={(event) => setNewSkill(event.target.value)}
                    onKeyDown={addSkill}
                    placeholder={t('candidate:profile.addSkillPlaceholder')}
                    className="w-full rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  />
                </>
              )
            }}
          />
          {errors.skills && (
            <p className="mt-1.5 text-[13px] text-danger">{errors.skills.message}</p>
          )}
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-card bg-primary-tint px-[22px] py-[18px]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2451D6"
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="text-[13px] leading-[1.55] text-primary">{t('postJob.matchNotice')}</div>
        </div>

        {formError && <p className="mb-4 text-right text-[13px] text-danger">{formError}</p>}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onSaveDraft}>
            {t('postJob.saveDraft')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? t('postJob.saveChanges') : t('postJob.publish')}
          </Button>
        </div>
      </form>
    </main>
  )
}
