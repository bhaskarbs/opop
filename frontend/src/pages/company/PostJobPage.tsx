import { zodResolver } from '@hookform/resolvers/zod'
import { type KeyboardEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import {
  employmentTypeToBackend,
  experienceLevelToBackend,
  workModeToBackend,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  WORK_MODES,
  type EmploymentTypeLabel,
  type ExperienceLevelLabel,
  type WorkModeLabel,
} from '../../lib/jobEnums'
import { ApiError } from '../../lib/apiClient'
import { jobsApi, type JobRequestPayload } from '../../lib/jobsApi'
import { ROUTES } from '../../routes/paths'

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
  location: z.string().min(2, 'Enter a location'),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
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

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
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
    location: values.location,
    salaryMinLakhs: parseSalaryLakhs(values.salaryMin),
    salaryMaxLakhs: parseSalaryLakhs(values.salaryMax),
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
  const [newSkill, setNewSkill] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    getValues,
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
      deadline: '',
      aboutRole: '',
      responsibilities: '',
      requirements: '',
      skills: ['React', 'TypeScript', 'UI Systems'],
    },
  })

  async function onPublish(values: PostJobFormValues) {
    setFormError(null)
    try {
      // Companies can no longer publish straight to ACTIVE — this now goes into the Step 18
      // admin job-approval queue and only appears live once an admin approves it.
      await jobsApi.create(toJobRequest(values, 'PENDING_APPROVAL'))
      navigate(localize(ROUTES.companyDashboard))
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('postJob.errorGeneric'))
    }
  }

  async function onSaveDraft() {
    setFormError(null)
    const values = getValues()
    if (!values.title.trim()) {
      setFormError(t('postJob.errorTitleRequired'))
      return
    }
    try {
      await jobsApi.create(toJobRequest(values, 'DRAFT'))
      navigate(localize(ROUTES.companyDashboard))
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('postJob.errorGeneric'))
    }
  }

  return (
    <main className="mx-auto max-w-[840px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('postJob.title')}</h1>
      <p className="mb-6 text-sm text-slate">{t('postJob.subtitle')}</p>

      <form onSubmit={handleSubmit(onPublish)} noValidate>
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
            <Input
              label={t('postJob.fields.location')}
              placeholder="e.g. Bengaluru, India"
              error={errors.location?.message}
              {...register('location')}
            />
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
          <Button type="submit" disabled={isSubmitting}>
            {t('postJob.publish')}
          </Button>
        </div>
      </form>
    </main>
  )
}
