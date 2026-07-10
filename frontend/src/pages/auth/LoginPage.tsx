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

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      const response = await authApi.login(values)
      setSession(response.accessToken, response.user)
      navigate(ROUTES.candidateDashboard)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">Welcome back</h1>
        <p className="text-sm text-slate">
          Log in to see jobs, partnerships, and community roles matched to you.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <Input
            label="Email"
            type="email"
            placeholder="rohan@email.com"
            error={errors.email?.message}
            {...register('email')}
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

      <p className="text-center text-[13.5px] text-slate">
        New here?{' '}
        <Link to={ROUTES.register} className="font-bold text-primary no-underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}
