import type { ReactNode } from 'react'
import { ROUTES } from '../../routes/paths'
import { Logo } from './Logo'
import { RouteLink } from './RouteLink'

interface FooterLink {
  label: string
  /** Real route path. Omit for links that don't have a page yet — they render inert. */
  to?: string
}

const CANDIDATE_LINKS: FooterLink[] = [
  { label: 'Find Jobs', to: ROUTES.jobs },
  { label: 'Startup Partnerships', to: ROUTES.partnerships },
  { label: 'Community Opportunities', to: ROUTES.community },
  { label: 'Mock Interviews', to: ROUTES.candidateMockInterview },
  { label: 'Register / Upload Resume', to: ROUTES.register },
]

const EMPLOYER_LINKS: FooterLink[] = [
  { label: 'Post a Job', to: ROUTES.companyPostJob },
  { label: 'Search Candidates', to: ROUTES.companySearchCandidates },
  { label: 'Offer a Partnership', to: ROUTES.partnerships },
  { label: 'Company Registration', to: ROUTES.companyRegister },
]

const LEGAL_LINKS: FooterLink[] = [
  { label: 'Privacy Policy' },
  { label: 'Terms of Service' },
  { label: 'Grievance Redressal' },
]

const SOCIAL_LINKS: Array<{ label: string; href: string; icon: ReactNode }> = [
  {
    label: 'LinkedIn',
    href: '#',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="8" y1="11" x2="8" y2="16" />
        <line x1="8" y1="8" x2="8" y2="8" />
        <line x1="12" y1="16" x2="12" y2="11" />
        <path d="M12 13c0-1.5 1.5-2 3-2s3 .5 3 2v3" />
      </>
    ),
  },
  { label: 'X', href: '#', icon: <path d="M4 4l16 16M20 4L4 20" /> },
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" />
      </>
    ),
  },
  {
    label: 'Facebook',
    href: '#',
    icon: <path d="M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  },
]

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 text-[13px] font-bold tracking-[0.04em] text-white uppercase">
      {children}
    </div>
  )
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <FooterHeading>{title}</FooterHeading>
      {links.map((link) => (
        <RouteLink
          key={link.label}
          to={link.to}
          className="mb-3 block text-sm text-[#B4BAC6] no-underline"
        >
          {link.label}
        </RouteLink>
      ))}
    </div>
  )
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-footer text-[#C7CCD6]">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-10 px-6 pt-14 pb-8">
        <div>
          <RouteLink to={ROUTES.home} className="mb-3.5 flex items-center gap-2.5 no-underline">
            <Logo context="footer" />
          </RouteLink>
          <p className="mb-5 max-w-[320px] text-sm leading-[1.6] text-[#9AA1AF]">
            More than a job board — apply for roles, partner with startups, and grow through
            community-based opportunities that count toward the career you actually want.
          </p>
          <div className="flex gap-2.5">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[#2A3040] no-underline"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C7CCD6"
                  strokeWidth={2}
                >
                  {social.icon}
                </svg>
              </a>
            ))}
          </div>
        </div>

        <FooterColumn title="For Candidates" links={CANDIDATE_LINKS} />
        <FooterColumn title="For Employers" links={EMPLOYER_LINKS} />

        <div>
          <FooterHeading>Contact Us</FooterHeading>
          <a
            href="mailto:hello@openopportunity.com"
            className="mb-3 block text-sm text-[#B4BAC6] no-underline"
          >
            hello@openopportunity.com
          </a>
          <a href="tel:+911234567890" className="mb-3 block text-sm text-[#B4BAC6] no-underline">
            +91 12345 67890
          </a>
          <div className="text-sm leading-[1.6] text-[#B4BAC6]">
            Bengaluru, Karnataka
            <br />
            India
          </div>
        </div>
      </div>

      <div className="border-t border-[#232838]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div className="text-[13px] text-fog">
            © {year} OpenOpportunity Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex flex-wrap gap-5">
            {LEGAL_LINKS.map((link) => (
              <RouteLink
                key={link.label}
                to={link.to}
                className="text-[13px] text-fog no-underline"
              >
                {link.label}
              </RouteLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
