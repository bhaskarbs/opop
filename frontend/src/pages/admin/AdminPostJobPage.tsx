import { zodResolver } from '@hookform/resolvers/zod'
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input, LoadingState, Spinner } from '../../components/ui'
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
import { adminApi, type AdminUserSummary } from '../../lib/adminApi'
import { jobsApi, type BackendJobStatus, type JobRequestPayload } from '../../lib/jobsApi'
import { ROUTES } from '../../routes/paths'

const EMPLOYMENT_TYPE_KEYS: Record<EmploymentTypeLabel, string> = {
  'Full-time': 'company:postJob.employmentType.fullTime',
  'Part-time': 'company:postJob.employmentType.partTime',
  Contract: 'company:postJob.employmentType.contract',
  Internship: 'company:postJob.employmentType.internship',
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

// Every status a job can be in (kept in sync with BackendJobStatus for the schema/type below —
// see PostJobFormValues.status). PENDING_APPROVAL is deliberately excluded from
// SELECTABLE_STATUSES: a job an admin creates or edits directly never needs another admin's
// review — that queue exists for a company's own self-submissions (see JobService#adminCreate/
// #adminUpdate skipping requireClientSettableStatus). It stays in this full list purely so an
// already-pending job (edited via a direct link rather than AdminJobsPage's list, which only
// ever shows ACTIVE jobs) still round-trips through the form without a type error.
const JOB_STATUSES: BackendJobStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'ACTIVE',
  'REJECTED',
  'CLOSED',
]
const SELECTABLE_STATUSES = JOB_STATUSES.filter((status) => status !== 'PENDING_APPROVAL')
const STATUS_KEYS: Record<BackendJobStatus, string> = {
  DRAFT: 'jobs.status.draft',
  PENDING_APPROVAL: 'jobs.status.pendingApproval',
  ACTIVE: 'jobs.status.active',
  REJECTED: 'jobs.status.rejected',
  CLOSED: 'jobs.status.closed',
}

const postJobSchema = z.object({
  title: z.string().min(2, 'Enter a job title'),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  workMode: z.enum(WORK_MODES),
  location: z.string().min(2, 'Enter a location'),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  experienceYearsMin: z.string().optional(),
  experienceYearsMax: z.string().optional(),
  deadline: z.string().optional(),
  aboutRole: z.string().min(10, 'Describe the role, team, and what success looks like'),
  responsibilities: z.string().min(2, 'List at least one responsibility'),
  requirements: z.string().min(2, 'List at least one requirement'),
  skills: z.array(z.string()).min(1, 'Add at least one required skill'),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'CLOSED']),
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

function toJobRequest(values: PostJobFormValues): JobRequestPayload {
  return {
    title: values.title,
    employmentType: employmentTypeToBackend(values.employmentType),
    experienceLevel: experienceLevelToBackend(values.experienceLevel),
    workMode: workModeToBackend(values.workMode),
    location: values.location,
    salaryMinLakhs: parseSalaryLakhs(values.salaryMin),
    salaryMaxLakhs: parseSalaryLakhs(values.salaryMax),
    experienceYearsMin: parseYears(values.experienceYearsMin),
    experienceYearsMax: parseYears(values.experienceYearsMax),
    applicationDeadline: values.deadline || null,
    aboutRole: values.aboutRole,
    responsibilities: splitLines(values.responsibilities),
    requirements: splitLines(values.requirements),
    skills: values.skills,
    status: values.status,
  }
}

export default function AdminPostJobPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const { jobId } = useParams()
  const editing = !!jobId
  const [newSkill, setNewSkill] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(editing)

  // Only meaningful when creating — adminUpdate never reassigns a job's owning company (see
  // JobService#adminUpdate), so the edit form has no company picker at all.
  const [companyQuery, setCompanyQuery] = useState('')
  const [companyResults, setCompanyResults] = useState<AdminUserSummary[]>([])
  const [searchingCompanies, setSearchingCompanies] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<AdminUserSummary | null>(null)
  const [existingCompanyName, setExistingCompanyName] = useState<string | null>(null)

  // Display branding override (edit mode only — see JobService#adminUpdateBranding/
  // #adminUploadLogo, which both require the job to already exist). displayCompanyName/logoUrl
  // are pre-filled from the job's already-resolved values (detail.companyName/companyLogoUrl
  // already reflect any existing override — see JobService#displayCompanyName/#companyLogoUrl —
  // so this doubles as "edit the current value" whether or not an override is actually set).
  const [displayCompanyName, setDisplayCompanyName] = useState('')
  const [initialDisplayCompanyName, setInitialDisplayCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

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
      location: '',
      salaryMin: '',
      salaryMax: '',
      experienceYearsMin: '',
      experienceYearsMax: '',
      deadline: '',
      aboutRole: '',
      responsibilities: '',
      requirements: '',
      skills: [],
      // Unlike PostJobPage (company-side), a new job posted here needs no approval step — it
      // goes live the moment an admin posts it, matching how adminCreate itself behaves.
      status: 'ACTIVE',
    },
  })

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    jobsApi
      .adminDetail(jobId)
      .then((detail) => {
        if (cancelled) return
        setExistingCompanyName(detail.companyName)
        setDisplayCompanyName(detail.companyName)
        setInitialDisplayCompanyName(detail.companyName)
        setLogoUrl(detail.companyLogoUrl)
        reset({
          title: detail.title,
          employmentType: employmentTypeFromBackend(detail.employmentType),
          experienceLevel: experienceLevelFromBackend(detail.experienceLevel),
          workMode: workModeFromBackend(detail.workMode),
          location: detail.location,
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
          status: detail.status,
        })
      })
      .catch((error) => {
        if (!cancelled) {
          setFormError(apiErrorMessage(error, t('jobs.postForm.errorGeneric')))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [jobId, reset, t])

  useEffect(() => {
    if (editing) return
    const trimmed = companyQuery.trim()
    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!trimmed) {
        setCompanyResults([])
        return
      }
      setSearchingCompanies(true)
      adminApi
        .users({ role: 'COMPANY', q: trimmed })
        .then((results) => {
          if (!cancelled) setCompanyResults(results)
        })
        .catch(() => {
          if (!cancelled) setCompanyResults([])
        })
        .finally(() => {
          if (!cancelled) setSearchingCompanies(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [companyQuery, editing])

  function goToAdminJobs() {
    navigate(localize(ROUTES.adminJobs))
  }

  // The display-name/logo overrides only exist on an already-created job (see
  // JobService#adminUpdateBranding/#adminUploadLogo) — a fresh create routes here afterward
  // instead of back to the list, so an admin can set them right away without a separate trip.
  function goToEditNewJob(id: string) {
    navigate(localize(ROUTES.adminJobEdit(id)), { replace: true })
  }

  // No-op (skipped) when the field wasn't touched — avoids an extra request on every save.
  async function syncBrandingIfChanged(id: string) {
    if (displayCompanyName.trim() === initialDisplayCompanyName.trim()) return
    await jobsApi.adminUpdateBranding(id, displayCompanyName.trim() || null)
    setInitialDisplayCompanyName(displayCompanyName.trim())
  }

  async function onSubmit(values: PostJobFormValues) {
    setFormError(null)
    if (!editing && !selectedCompany) {
      setFormError(t('jobs.postForm.errorCompanyRequired'))
      return
    }
    try {
      if (editing && jobId) {
        await jobsApi.adminUpdate(jobId, toJobRequest(values))
        await syncBrandingIfChanged(jobId)
        goToAdminJobs()
      } else if (selectedCompany) {
        const created = await jobsApi.adminCreate(selectedCompany.id, toJobRequest(values))
        goToEditNewJob(created.id)
      }
    } catch (error) {
      setFormError(apiErrorMessage(error, t('jobs.postForm.errorGeneric')))
    }
  }

  async function onSaveDraft() {
    setFormError(null)
    const values = getValues()
    // Mirrors JobRequest's actual @NotBlank fields on the backend (title/location/aboutRole —
    // see JobRequest.java) — a draft still has to satisfy these, so checking only the title
    // here let an admin "save" a draft that then 400'd with a generic "Validation failed" and
    // was never actually persisted (the job silently didn't exist afterward).
    if (!values.title.trim()) {
      setFormError(t('jobs.postForm.errorTitleRequired'))
      return
    }
    if (!values.location.trim()) {
      setFormError(t('jobs.postForm.errorLocationRequired'))
      return
    }
    if (!values.aboutRole.trim()) {
      setFormError(t('jobs.postForm.errorAboutRoleRequired'))
      return
    }
    if (!editing && !selectedCompany) {
      setFormError(t('jobs.postForm.errorCompanyRequired'))
      return
    }
    try {
      const draftValues = { ...values, status: 'DRAFT' as const }
      if (editing && jobId) {
        await jobsApi.adminUpdate(jobId, toJobRequest(draftValues))
        await syncBrandingIfChanged(jobId)
        goToAdminJobs()
      } else if (selectedCompany) {
        const created = await jobsApi.adminCreate(selectedCompany.id, toJobRequest(draftValues))
        goToEditNewJob(created.id)
      }
    } catch (error) {
      setFormError(apiErrorMessage(error, t('jobs.postForm.errorGeneric')))
    }
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !jobId) return
    setLogoError(null)
    setUploadingLogo(true)
    try {
      const detail = await jobsApi.adminUploadLogo(jobId, file)
      setLogoUrl(detail.companyLogoUrl)
    } catch (error) {
      setLogoError(apiErrorMessage(error, t('jobs.postForm.logoError')))
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleRemoveLogo() {
    if (!jobId) return
    setLogoError(null)
    setRemovingLogo(true)
    try {
      const detail = await jobsApi.adminRemoveLogo(jobId)
      setLogoUrl(detail.companyLogoUrl)
    } catch (error) {
      setLogoError(apiErrorMessage(error, t('jobs.postForm.logoError')))
    } finally {
      setRemovingLogo(false)
    }
  }

  if (loadingExisting) {
    return (
      <main className="mx-auto max-w-[840px] px-6 py-7 pb-16">
        <LoadingState message={t('jobs.postForm.loadingExisting')} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[840px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">
        {editing ? t('jobs.postForm.titleEdit') : t('jobs.postForm.title')}
      </h1>
      <p className="mb-6 text-sm text-slate">{t('jobs.postForm.subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">
            {t('jobs.postForm.company')}
          </h2>
          {editing ? (
            <>
              <p className="text-sm text-ink">{existingCompanyName}</p>
              <div className="mt-4">
                <label
                  htmlFor="displayCompanyName"
                  className="mb-1.5 block text-[13px] font-bold text-ink"
                >
                  {t('jobs.postForm.displayCompanyName')}
                </label>
                <p className="mb-1.5 text-[12.5px] text-fog">
                  {t('jobs.postForm.displayCompanyNameHint')}
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
                  {t('jobs.postForm.logo')}
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
                      {t('jobs.postForm.noLogo')}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => logoInputRef.current?.click()}
                    loading={uploadingLogo}
                  >
                    {t('jobs.postForm.uploadLogo')}
                  </Button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={removingLogo}
                      className="text-[12.5px] font-bold text-danger disabled:opacity-60"
                    >
                      {removingLogo
                        ? t('jobs.postForm.removingLogo')
                        : t('jobs.postForm.removeLogo')}
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
          ) : selectedCompany ? (
            <div className="flex items-center justify-between rounded-control border border-border px-3.5 py-2.5">
              <div>
                <p className="text-sm font-bold text-ink">{selectedCompany.fullName}</p>
                <p className="text-[12.5px] text-slate">{selectedCompany.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="text-[12.5px] font-bold text-primary"
              >
                {t('jobs.postForm.changeCompany')}
              </button>
            </div>
          ) : (
            <div>
              <input
                value={companyQuery}
                onChange={(event) => setCompanyQuery(event.target.value)}
                placeholder={t('jobs.postForm.companySearchPlaceholder')}
                className="w-full rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
              {searchingCompanies && (
                <div className="mt-2 flex items-center gap-2 text-[12.5px] text-slate">
                  <Spinner className="h-3.5 w-3.5" />
                  {t('jobs.postForm.searchingCompanies')}
                </div>
              )}
              {!searchingCompanies && companyResults.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {companyResults.map((company) => (
                    <li key={company.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompany(company)
                          setCompanyQuery('')
                          setCompanyResults([])
                        }}
                        className="w-full rounded-control border border-border px-3.5 py-2.5 text-left hover:bg-neutral-tint"
                      >
                        <p className="text-sm font-bold text-ink">{company.fullName}</p>
                        <p className="text-[12.5px] text-slate">{company.email}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!editing && (
            <p className="mt-3 text-[12.5px] text-fog">
              {t('jobs.postForm.brandingAfterCreateHint')}
            </p>
          )}
        </div>

        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">
            {t('company:postJob.roleDetails')}
          </h2>
          <div className="mb-3.5">
            <Input
              label={t('company:postJob.fields.jobTitle')}
              placeholder="e.g. Senior Frontend Developer"
              error={errors.title?.message}
              {...register('title')}
            />
          </div>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label htmlFor="employmentType" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('company:postJob.fields.employmentType')}
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
            <Input
              label={t('company:postJob.fields.location')}
              placeholder="e.g. Bengaluru, India"
              error={errors.location?.message}
              {...register('location')}
            />
          </div>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1.5 text-[13px] font-bold text-ink">
                {t('company:postJob.fields.salaryRange')}
              </label>
              <div className="flex gap-2">
                <input
                  placeholder={t('company:postJob.fields.salaryMinPlaceholder')}
                  className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  {...register('salaryMin')}
                />
                <input
                  placeholder={t('company:postJob.fields.salaryMaxPlaceholder')}
                  className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  {...register('salaryMax')}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label htmlFor="deadline" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('company:postJob.fields.deadline')}
              </label>
              <input
                id="deadline"
                type="date"
                className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                {...register('deadline')}
              />
            </div>
          </div>
          <div className="mb-3.5 flex flex-col">
            <label className="mb-1.5 text-[13px] font-bold text-ink">
              {t('company:postJob.fields.experienceYears')}
            </label>
            <div className="flex max-w-[calc(50%-0.4375rem)] gap-2">
              <input
                placeholder={t('company:postJob.fields.experienceYearsMinPlaceholder')}
                type="number"
                min={0}
                className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                {...register('experienceYearsMin')}
              />
              <input
                placeholder={t('company:postJob.fields.experienceYearsMaxPlaceholder')}
                type="number"
                min={0}
                className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                {...register('experienceYearsMax')}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label htmlFor="status" className="mb-1.5 text-[13px] font-bold text-ink">
              {t('jobs.postForm.status')}
            </label>
            <select
              id="status"
              className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
              {...register('status')}
            >
              {SELECTABLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(STATUS_KEYS[status])}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">
            {t('company:postJob.description')}
          </h2>
          <div className="mb-3.5">
            <label htmlFor="aboutRole" className="mb-1.5 block text-[13px] font-bold text-ink">
              {t('public:jobDetail.aboutRole')}
            </label>
            <textarea
              id="aboutRole"
              rows={4}
              placeholder={t('company:postJob.fields.aboutRolePlaceholder')}
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
              placeholder={t('company:postJob.fields.onePerLine')}
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
              placeholder={t('company:postJob.fields.onePerLine')}
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              {...register('requirements')}
            />
            {errors.requirements && (
              <p className="mt-1.5 text-[13px] text-danger">{errors.requirements.message}</p>
            )}
          </div>
        </div>

        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-1.5 text-[15.5px] font-bold text-ink">
            {t('company:postJob.requiredSkills')}
          </h2>
          <p className="mb-3.5 text-[13px] text-fog">{t('company:postJob.requiredSkillsBody')}</p>
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

        {formError && <p className="mb-4 text-right text-[13px] text-danger">{formError}</p>}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onSaveDraft}>
            {t('company:postJob.saveDraft')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? t('company:postJob.saveChanges') : t('jobs.postForm.publish')}
          </Button>
        </div>
      </form>
    </main>
  )
}
