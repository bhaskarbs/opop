import { zodResolver } from '@hookform/resolvers/zod'
import { type KeyboardEvent, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input } from '../../components/ui'
import {
  employmentTypeToBackend,
  experienceLevelToBackend,
  workModeToBackend,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  WORK_MODES,
} from '../../lib/jobEnums'
import { ApiError } from '../../lib/apiClient'
import { jobsApi, type JobRequestPayload } from '../../lib/jobsApi'
import { ROUTES } from '../../routes/paths'

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

function toJobRequest(values: PostJobFormValues, status: 'ACTIVE' | 'DRAFT'): JobRequestPayload {
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
  const navigate = useNavigate()
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
      await jobsApi.create(toJobRequest(values, 'ACTIVE'))
      navigate(ROUTES.companyDashboard)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Try again.')
    }
  }

  async function onSaveDraft() {
    setFormError(null)
    const values = getValues()
    if (!values.title.trim()) {
      setFormError('Enter a job title before saving a draft.')
      return
    }
    try {
      await jobsApi.create(toJobRequest(values, 'DRAFT'))
      navigate(ROUTES.companyDashboard)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <main className="mx-auto max-w-[840px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">Post a job</h1>
      <p className="mb-6 text-sm text-slate">
        Reach candidates directly — and surface your listing to skill-matched partnership and
        community applicants too.
      </p>

      <form onSubmit={handleSubmit(onPublish)} noValidate>
        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">Role details</h2>
          <div className="mb-3.5">
            <Input
              label="Job title"
              placeholder="e.g. Senior Frontend Developer"
              error={errors.title?.message}
              {...register('title')}
            />
          </div>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label htmlFor="employmentType" className="mb-1.5 text-[13px] font-bold text-ink">
                Employment type
              </label>
              <select
                id="employmentType"
                className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                {...register('employmentType')}
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="experienceLevel" className="mb-1.5 text-[13px] font-bold text-ink">
                Experience level
              </label>
              <select
                id="experienceLevel"
                className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                {...register('experienceLevel')}
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label htmlFor="workMode" className="mb-1.5 text-[13px] font-bold text-ink">
                Work mode
              </label>
              <select
                id="workMode"
                className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                {...register('workMode')}
              >
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Location"
              placeholder="e.g. Bengaluru, India"
              error={errors.location?.message}
              {...register('location')}
            />
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1.5 text-[13px] font-bold text-ink">Salary range (₹/yr)</label>
              <div className="flex gap-2">
                <input
                  placeholder="Min e.g. 12L"
                  className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  {...register('salaryMin')}
                />
                <input
                  placeholder="Max e.g. 18L"
                  className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  {...register('salaryMax')}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label htmlFor="deadline" className="mb-1.5 text-[13px] font-bold text-ink">
                Application deadline
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
          <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">Description</h2>
          <div className="mb-3.5">
            <label htmlFor="aboutRole" className="mb-1.5 block text-[13px] font-bold text-ink">
              About the role
            </label>
            <textarea
              id="aboutRole"
              rows={4}
              placeholder="Describe the role, team, and what success looks like..."
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
              Responsibilities
            </label>
            <textarea
              id="responsibilities"
              rows={3}
              placeholder="One per line"
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              {...register('responsibilities')}
            />
            {errors.responsibilities && (
              <p className="mt-1.5 text-[13px] text-danger">{errors.responsibilities.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="requirements" className="mb-1.5 block text-[13px] font-bold text-ink">
              Requirements
            </label>
            <textarea
              id="requirements"
              rows={3}
              placeholder="One per line"
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              {...register('requirements')}
            />
            {errors.requirements && (
              <p className="mt-1.5 text-[13px] text-danger">{errors.requirements.message}</p>
            )}
          </div>
        </div>

        <div className="mb-[18px] rounded-card border border-border bg-surface p-8">
          <h2 className="mb-1.5 text-[15.5px] font-bold text-ink">Required skills</h2>
          <p className="mb-3.5 text-[13px] text-fog">
            Technical or soft — used to match this role to relevant candidates, and to surface it to
            skilled partnership/community applicants.
          </p>
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
                          aria-label={`Remove ${skill}`}
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
                    placeholder="Add a skill and press enter"
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
          <div className="text-[13px] leading-[1.55] text-primary">
            Candidates who match these skills but haven't landed similar roles will also see this
            listing alongside relevant startup partnerships and community opportunities.
          </div>
        </div>

        {formError && <p className="mb-4 text-right text-[13px] text-danger">{formError}</p>}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onSaveDraft}>
            Save as draft
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Publish job
          </Button>
        </div>
      </form>
    </main>
  )
}
