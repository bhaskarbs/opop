import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input } from '../../components/ui'
import { ROUTES } from '../../routes/paths'
import { AuthCard } from './shared/AuthCard'
import { AuthModeToggle, type AuthMode } from './shared/AuthModeToggle'
import { PhoneInput } from './shared/PhoneInput'
import { SocialAuthButtons } from './shared/SocialAuthButtons'

const companyLoginSchema = z
  .object({
    mode: z.enum(['password', 'otp']),
    workEmail: z.string().min(1, 'Work email is required').email('Enter a valid work email'),
    password: z.string().optional(),
    mobile: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'password' && (!data.password || data.password.length < 6)) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password must be at least 6 characters',
      })
    }
    if (data.mode === 'otp' && (!data.mobile || !/^\d{10}$/.test(data.mobile))) {
      ctx.addIssue({
        code: 'custom',
        path: ['mobile'],
        message: 'Enter a valid 10-digit mobile number',
      })
    }
  })

type CompanyLoginFormValues = z.infer<typeof companyLoginSchema>

export default function CompanyLoginPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompanyLoginFormValues>({
    resolver: zodResolver(companyLoginSchema),
    defaultValues: { mode: 'password', workEmail: '', password: '', mobile: '' },
  })

  const mode = watch('mode')

  function onSubmit(values: CompanyLoginFormValues) {
    console.log('Company login submitted:', values)
    navigate(ROUTES.companyDashboard)
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <span className="mb-4 inline-block rounded-full bg-primary-tint px-3 py-[5px] text-[12.5px] font-bold text-primary">
          For Employers
        </span>
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">Company login</h1>
        <p className="text-sm text-slate">Post jobs, offer partnerships, and search candidates.</p>
      </div>

      <AuthModeToggle mode={mode} onChange={(next: AuthMode) => setValue('mode', next)} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <Input
            label="Work email"
            type="email"
            placeholder="you@company.com"
            error={errors.workEmail?.message}
            {...register('workEmail')}
          />
        </div>

        {mode === 'password' ? (
          <div className="mb-[18px]">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="mt-2 text-right">
              <a
                href="#forgot"
                onClick={(event) => event.preventDefault()}
                className="text-[13px] font-semibold text-primary no-underline"
              >
                Forgot password?
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <PhoneInput
                label="Registered mobile number"
                error={errors.mobile?.message}
                {...register('mobile')}
              />
            </div>
            <button
              type="button"
              className="mb-[18px] w-full rounded-control border border-border bg-surface py-2.5 text-sm font-bold text-primary"
            >
              Send OTP
            </button>
          </>
        )}

        <Button type="submit" disabled={isSubmitting} className="mb-[18px] w-full">
          {mode === 'password' ? 'Log in' : 'Verify OTP & log in'}
        </Button>
      </form>

      <SocialAuthButtons />

      <p className="mb-2.5 text-center text-[13.5px] text-slate">
        New employer?{' '}
        <Link to={ROUTES.companyRegister} className="font-bold text-primary no-underline">
          Register your company
        </Link>
      </p>
      <p className="text-center text-[13px] text-fog">
        Looking for a job instead?{' '}
        <Link to={ROUTES.login} className="font-semibold text-primary no-underline">
          Candidate login
        </Link>
      </p>
    </AuthCard>
  )
}
