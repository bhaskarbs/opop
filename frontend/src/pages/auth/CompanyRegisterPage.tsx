import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input } from '../../components/ui'
import { ROUTES } from '../../routes/paths'
import { FileDropInput } from './shared/FileDropInput'

const ENTITY_TYPES = [
  'Private Limited Company',
  'Limited Liability Partnership (LLP)',
  'Partnership Firm',
  'Sole Proprietorship',
  'Public Limited Company',
] as const

const companyRegisterSchema = z.object({
  companyName: z.string().min(2, 'Enter the registered company name'),
  entityType: z.enum(ENTITY_TYPES),
  cin: z.string().min(15, 'Enter a valid CIN or LLPIN'),
  gstin: z.string().regex(/^[0-9A-Z]{15}$/, 'Enter a valid 15-character GSTIN'),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  industry: z.string().min(2, 'Enter your industry or sector'),
  address: z.string().min(10, 'Enter your registered office address'),
  signatoryName: z.string().min(2, "Enter the authorized signatory's name"),
  workEmail: z.string().email('Enter a valid work email'),
  certificate: z.instanceof(File).optional(),
})

type CompanyRegisterFormValues = z.infer<typeof companyRegisterSchema>

const STEPS = [
  { label: 'Company details', active: true },
  { label: 'Document upload', active: false },
  { label: 'Verification', active: false },
]

export default function CompanyRegisterPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CompanyRegisterFormValues>({
    resolver: zodResolver(companyRegisterSchema),
    defaultValues: {
      companyName: '',
      entityType: ENTITY_TYPES[0],
      cin: '',
      gstin: '',
      pan: '',
      industry: '',
      address: '',
      signatoryName: '',
      workEmail: '',
    },
  })

  function onSubmit(values: CompanyRegisterFormValues) {
    console.log('Company registration submitted:', values)
    navigate(ROUTES.companyDashboard)
  }

  return (
    <main className="mx-auto max-w-[760px] px-6 py-10 pb-16">
      <div className="mb-6 text-center">
        <span className="rounded-full bg-primary-tint px-3 py-[5px] text-[12.5px] font-bold text-primary">
          For Employers
        </span>
        <h1 className="mt-3.5 mb-1.5 text-[23px] font-extrabold text-ink">Register your company</h1>
        <p className="text-sm text-slate">
          Verified as per Indian company law before you can post jobs or offer partnerships.
        </p>
      </div>

      <div className="mb-7 flex gap-2">
        {STEPS.map((step) => (
          <div key={step.label} className="flex-1 text-center">
            <div
              className={`mb-2 h-[5px] rounded-full ${step.active ? 'bg-primary' : 'bg-border'}`}
            />
            <div className={`text-xs font-semibold ${step.active ? 'text-ink' : 'text-fog'}`}>
              {step.label}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-border bg-surface p-8">
        <h2 className="mb-[18px] text-[15.5px] font-bold text-ink">Company details</h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label="Registered company name"
              placeholder="Vertex Robotics Pvt. Ltd."
              error={errors.companyName?.message}
              {...register('companyName')}
            />
            <div className="flex flex-col">
              <label htmlFor="entity-type" className="mb-1.5 text-[13px] font-bold text-ink">
                Entity type
              </label>
              <select
                id="entity-type"
                className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                {...register('entityType')}
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label="CIN / LLPIN"
              placeholder="U74999KA2021PTC145632"
              error={errors.cin?.message}
              {...register('cin')}
            />
            <Input
              label="GSTIN"
              placeholder="29ABCDE1234F1Z5"
              error={errors.gstin?.message}
              {...register('gstin')}
            />
          </div>

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label="PAN"
              placeholder="ABCDE1234F"
              error={errors.pan?.message}
              {...register('pan')}
            />
            <Input
              label="Industry / sector"
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
              Registered office address
            </label>
            <textarea
              id="company-address"
              rows={2}
              placeholder="Street, city, state, PIN code"
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              {...register('address')}
            />
            {errors.address && (
              <p className="mt-1.5 text-[13px] text-danger">{errors.address.message}</p>
            )}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Input
              label="Authorized signatory name"
              placeholder="Full name"
              error={errors.signatoryName?.message}
              {...register('signatoryName')}
            />
            <Input
              label="Work email"
              type="email"
              placeholder="founder@company.com"
              error={errors.workEmail?.message}
              {...register('workEmail')}
            />
          </div>

          <div className="mb-[22px]">
            <Controller
              name="certificate"
              control={control}
              render={({ field }) => (
                <FileDropInput
                  label="Certificate of incorporation"
                  placeholder="Upload PDF for verification"
                  hint="Reviewed by our compliance team within 24–48 hours"
                  accept=".pdf"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="mb-[22px] rounded-lg border border-[#FCE3B8] bg-amber-tint px-4 py-3.5 text-[13px] leading-[1.55] text-[#8A5A0F]">
            All company data is verified against MCA (Ministry of Corporate Affairs) records before
            job or partnership postings go live, in accordance with Indian company law.
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            Submit for verification
          </Button>
        </form>
      </div>
    </main>
  )
}
