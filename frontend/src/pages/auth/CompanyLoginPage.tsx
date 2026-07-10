import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, authApi } from '../../lib/apiClient'
import { Button, Input } from '../../components/ui'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
import { AuthCard } from './shared/AuthCard'
import { SocialAuthButtons } from './shared/SocialAuthButtons'

const companyLoginSchema = z.object({
  workEmail: z.string().min(1, 'Work email is required').email('Enter a valid work email'),
  password: z.string().min(1, 'Password is required'),
})

type CompanyLoginFormValues = z.infer<typeof companyLoginSchema>

export default function CompanyLoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyLoginFormValues>({
    resolver: zodResolver(companyLoginSchema),
    defaultValues: { workEmail: '', password: '' },
  })

  async function onSubmit(values: CompanyLoginFormValues) {
    setFormError(null)
    try {
      const response = await authApi.login({ email: values.workEmail, password: values.password })
      setSession(response.accessToken, response.user)
      navigate(ROUTES.companyDashboard)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Try again.')
    }
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

        {formError && <p className="mb-[18px] text-[13px] text-danger">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mb-[18px] w-full">
          Log in
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
