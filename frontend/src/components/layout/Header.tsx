import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { Logo } from './Logo'

export type HeaderVariant = 'guest' | 'candidate' | 'company' | 'admin'

interface NavItem {
  label: string
  href: string
}

const NAV_BY_VARIANT: Record<HeaderVariant, NavItem[]> = {
  guest: [
    { label: 'Find Jobs', href: '#jobs' },
    { label: 'Startup Partnerships', href: '#partnerships' },
    { label: 'Community', href: '#community' },
    { label: 'For Employers', href: '#employers' },
  ],
  candidate: [
    { label: 'Find Jobs', href: '#jobs' },
    { label: 'Startup Partnerships', href: '#partnerships' },
    { label: 'Community', href: '#community' },
    { label: 'Dashboard', href: '#dashboard' },
  ],
  company: [
    { label: 'Post a Job', href: '#post-job' },
    { label: 'Search Candidates', href: '#search-candidates' },
    { label: 'Partnership Applicants', href: '#applicants' },
    { label: 'Seminars & Meetups', href: '#seminars' },
  ],
  admin: [
    { label: 'Dashboard', href: '#dashboard' },
    { label: 'Reports', href: '#reports' },
    { label: 'Users', href: '#users' },
    { label: 'Jobs', href: '#jobs' },
  ],
}

const USER_MENU_BY_VARIANT: Partial<Record<HeaderVariant, NavItem[]>> = {
  candidate: [
    { label: 'My Profile', href: '#profile' },
    { label: 'My Applications', href: '#applications' },
    { label: 'Mock Interviews', href: '#interviews' },
    { label: 'Log out', href: '#logout' },
  ],
  company: [
    { label: 'Company Profile', href: '#profile' },
    { label: 'Job Postings', href: '#postings' },
    { label: 'Billing', href: '#billing' },
    { label: 'Log out', href: '#logout' },
  ],
  admin: [
    { label: 'Admin Settings', href: '#settings' },
    { label: 'Log out', href: '#logout' },
  ],
}

const DEFAULT_USER_NAME: Partial<Record<HeaderVariant, string>> = {
  candidate: 'Rohan Mehta',
  company: 'Acme Startup',
  admin: 'Admin',
}

const AVATAR_BG_CLASS: Partial<Record<HeaderVariant, string>> = {
  candidate: 'bg-primary',
  company: 'bg-teal',
  admin: 'bg-ink',
}

export interface HeaderProps {
  variant?: HeaderVariant
  /** Label of the currently active nav item, if any. */
  activeItem?: string
  userName?: string
  /** Set to false to render inline instead of `position: sticky` (e.g. in a preview). */
  sticky?: boolean
}

export function Header({ variant = 'guest', activeItem, userName, sticky = true }: HeaderProps) {
  const isGuest = variant === 'guest'
  const navItems = NAV_BY_VARIANT[variant]
  const userMenuItems = USER_MENU_BY_VARIANT[variant] ?? USER_MENU_BY_VARIANT.candidate!
  const resolvedUserName = userName ?? DEFAULT_USER_NAME[variant] ?? 'Rohan Mehta'
  const userInitial = resolvedUserName.charAt(0).toUpperCase()
  const avatarBgClass = AVATAR_BG_CLASS[variant] ?? 'bg-primary'

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  return (
    <header className={cn('z-50 border-b border-border bg-surface', sticky && 'sticky top-0')}>
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-8">
          <a href="#" className="flex shrink-0 items-center gap-2.5 no-underline">
            <Logo context="header" />
          </a>
          <nav className="header:flex hidden items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.label === activeItem
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center rounded-lg px-3.5 py-2 text-[14.5px] font-semibold no-underline',
                    isActive ? 'bg-primary-tint text-primary' : 'text-ink',
                  )}
                >
                  {item.label}
                </a>
              )
            })}
          </nav>
        </div>

        <div className="header:flex hidden shrink-0 items-center gap-3">
          {isGuest ? (
            <>
              <a
                href="#"
                className="rounded-lg px-4 py-2.5 text-[14.5px] font-semibold text-ink no-underline"
              >
                Log in
              </a>
              <a
                href="#"
                className="rounded-lg bg-primary px-[18px] py-2.5 text-[14.5px] font-bold text-white no-underline"
              >
                Register
              </a>
            </>
          ) : (
            <>
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-[38px] w-[38px] items-center justify-center rounded-control border border-border bg-surface"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-slate"
                >
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="absolute top-2 right-2 h-[7px] w-[7px] rounded-full bg-danger" />
              </button>

              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-control border border-border bg-surface py-[5px] pr-2.5 pl-[5px]"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] font-bold text-white',
                      avatarBgClass,
                    )}
                  >
                    {userInitial}
                  </span>
                  <span className="text-sm font-semibold text-ink">{resolvedUserName}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="text-fog"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute top-[46px] right-0 min-w-[200px] rounded-[10px] border border-border bg-surface p-1.5 text-left shadow-elevated">
                    {userMenuItems.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        className="block rounded-md px-3 py-2.5 text-sm font-medium text-ink no-underline"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label="Menu"
          className="header:hidden flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-border bg-surface"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-ink"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>

      {mobileNavOpen && (
        <div className="header:hidden border-t border-border px-5 pt-3 pb-[18px]">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="block border-b border-[#F0F1F3] px-1.5 py-[11px] text-[15px] font-semibold text-ink no-underline"
            >
              {item.label}
            </a>
          ))}
          {isGuest && (
            <div className="mt-3.5 flex gap-2.5">
              <a
                href="#"
                className="flex-1 rounded-lg border border-border px-2.5 py-2.5 text-center text-[14.5px] font-semibold text-ink no-underline"
              >
                Log in
              </a>
              <a
                href="#"
                className="flex-1 rounded-lg bg-primary px-2.5 py-2.5 text-center text-[14.5px] font-bold text-white no-underline"
              >
                Register
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
