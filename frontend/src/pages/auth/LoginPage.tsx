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

const loginSchema = z
  .object({
    mode: z.enum(['password', 'otp']),
    mobile: z
      .string()
      .min(1, 'Mobile number is required')
      .regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
    password: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'password' && (!data.password || data.password.length < 6)) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password must be at least 6 characters',
      })
    }
  })

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mode: 'password', mobile: '', password: '' },
  })

  const mode = watch('mode')

  function onSubmit(values: LoginFormValues) {
    console.log('Candidate login submitted:', values)
    navigate(ROUTES.candidateDashboard)
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">Welcome back</h1>
        <p className="text-sm text-slate">
          Log in to see jobs, partnerships, and community roles matched to you.
        </p>
      </div>

      <AuthModeToggle mode={mode} onChange={(next: AuthMode) => setValue('mode', next)} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <PhoneInput
            label="Mobile number"
            error={errors.mobile?.message}
            {...register('mobile')}
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
          <button
            type="button"
            className="mb-[18px] w-full rounded-control border border-border bg-surface py-2.5 text-sm font-bold text-primary"
          >
            Send OTP
          </button>
        )}

        <Button type="submit" disabled={isSubmitting} className="mb-[18px] w-full">
          {mode === 'password' ? 'Log in' : 'Verify OTP & log in'}
        </Button>
      </form>

      <SocialAuthButtons />

      <p className="text-center text-[13.5px] text-slate">
        New here?{' '}
        <Link to={ROUTES.register} className="font-bold text-primary no-underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}
