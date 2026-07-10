import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input } from '../../components/ui'
import { ROUTES } from '../../routes/paths'
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

const BENEFITS = [
  'Apply to jobs directly and via listings we aggregate from other job boards.',
  'Not landing offers yet? Same profile applies you to startup partnerships.',
  'Build soft skills through community roles while you keep searching.',
]

export default function RegisterPage() {
  const navigate = useNavigate()
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

  function onSubmit(values: RegisterFormValues) {
    console.log('Candidate registration submitted:', values)
    navigate(ROUTES.candidateDashboard)
  }

  return (
    <main className="mx-auto max-w-[960px] px-6 py-10 pb-16">
      <div className="auth:grid-cols-[minmax(0,1fr)_260px] grid grid-cols-1 gap-7">
        <div className="rounded-card border border-border bg-surface p-8">
          <h1 className="mb-1 text-[21px] font-extrabold text-ink">
            Create your candidate profile
          </h1>
          <p className="mb-[26px] text-sm text-slate">
            One profile — works across jobs, startup partnerships, and community opportunities.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Input
                label="Full name"
                placeholder="Rohan Mehta"
                error={errors.fullName?.message}
                {...register('fullName')}
              />
              <Input
                label="Email"
                type="email"
                placeholder="rohan@email.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <PhoneInput
                label="Mobile number"
                error={errors.mobile?.message}
                {...register('mobile')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Create a password"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <div className="mb-3.5">
              <Input
                label="Skills (technical or soft — used to match jobs, partnerships & community roles)"
                placeholder="e.g. React, Communication, Sales, Data Analysis"
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
                    label="Upload resume"
                    placeholder="Drag & drop your resume, or click to browse"
                    hint="PDF or DOCX, up to 5MB"
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
              I agree to the{' '}
              <a
                href="#terms"
                onClick={(event) => event.preventDefault()}
                className="font-semibold no-underline"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="#privacy"
                onClick={(event) => event.preventDefault()}
                className="font-semibold no-underline"
              >
                Privacy Policy
              </a>
              .
            </label>
            {errors.agreeTerms && (
              <p className="mb-4 -mt-3 text-[13px] text-danger">{errors.agreeTerms.message}</p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mb-4 w-full">
              Create account
            </Button>
            <p className="text-center text-[13.5px] text-slate">
              Already have an account?{' '}
              <Link to={ROUTES.login} className="font-bold text-primary no-underline">
                Log in
              </Link>
            </p>
          </form>
        </div>

        <aside className="auth:order-none order-first">
          <div className="rounded-card bg-primary-tint p-[22px]">
            <h3 className="mb-3 text-[14.5px] font-bold text-ink">
              Why one profile works everywhere
            </h3>
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="mb-3.5 flex gap-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="text-[13.5px] leading-[1.55] text-[#3A414D]">{benefit}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-card border border-border bg-surface p-[22px]">
            <div className="mb-1.5 text-[13.5px] font-bold text-ink">Are you hiring instead?</div>
            <Link
              to={ROUTES.companyRegister}
              className="text-[13.5px] font-bold text-primary no-underline"
            >
              Register your company →
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
