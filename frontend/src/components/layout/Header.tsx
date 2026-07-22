import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { DEFAULT_LANGUAGE, isSupportedLanguage, type SupportedLanguage } from '../../i18n'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { API_BASE_URL, authApi } from '../../lib/apiClient'
import { cn } from '../../lib/cn'
import { notificationsApi, type NotificationSummary } from '../../lib/notificationsApi'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'
import { AVATAR_BG_CLASS, DEFAULT_USER_NAME, NAV_BY_VARIANT, USER_MENU_BY_VARIANT } from './navData'
import { Logo } from './Logo'
import { RouteLink } from './RouteLink'

/** Toggles between /en and /hi on the current page, preserving the rest of the path. */
function LanguageSwitcher({ className }: { className: string }) {
  const { lang } = useParams()
  const location = useLocation()
  const activeLang = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE
  const otherLang: SupportedLanguage = activeLang === 'hi' ? 'en' : 'hi'
  const rest = location.pathname.replace(/^\/(en|hi)/, '')

  return (
    <Link
      to={`/${otherLang}${rest}${location.search}`}
      aria-label={otherLang === 'hi' ? 'हिन्दी में बदलें' : 'Switch to English'}
      className={className}
    >
      {otherLang === 'hi' ? 'हिं' : 'EN'}
    </Link>
  )
}

export type HeaderVariant = 'guest' | 'candidate' | 'company' | 'admin'

export interface HeaderProps {
  variant?: HeaderVariant
  /** Label of the currently active nav item, if any. */
  activeItem?: string
  userName?: string
  /** Candidate-only (see AuthenticatedLayout) — falls back to the initials avatar when absent. */
  userPhotoUrl?: string | null
  /** Cache-busting timestamp paired with userPhotoUrl — see authStore.setCandidatePhoto. */
  userPhotoVersion?: number
  /** Set to false to render inline instead of `position: sticky` (e.g. in a preview). */
  sticky?: boolean
  /** Hides the guest Log in/Register CTAs — e.g. on the company login page itself, where
   * generic candidate auth links are confusing rather than useful. Ignored for non-guest
   * variants. */
  showGuestAuthLinks?: boolean
}

export function Header({
  variant = 'guest',
  activeItem,
  userName,
  userPhotoUrl,
  userPhotoVersion,
  sticky = true,
  showGuestAuthLinks = true,
}: HeaderProps) {
  const isGuest = variant === 'guest'
  const navItems = NAV_BY_VARIANT[variant]
  const userMenuItems = USER_MENU_BY_VARIANT[variant] ?? USER_MENU_BY_VARIANT.candidate!
  const resolvedUserName = userName ?? DEFAULT_USER_NAME[variant] ?? 'Rohan Mehta'
  const userInitial = resolvedUserName.charAt(0).toUpperCase()
  const avatarBgClass = AVATAR_BG_CLASS[variant] ?? 'bg-primary'

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationSummary[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const clearSession = useAuthStore((state) => state.clearSession)
  const navigate = useNavigate()
  const localize = useLocalizedPath()
  const { t } = useTranslation('layout')

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // Best-effort — the local session clears regardless, so the UI never gets stuck
      // "logged in" just because the network call failed.
    } finally {
      clearSession()
      navigate(localize(ROUTES.home))
    }
  }

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

  useEffect(() => {
    if (!notifOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notifOpen])

  // Badge only — the full list loads lazily when the dropdown is opened (see
  // toggleNotifications), so this stays a single lightweight call per page load.
  useEffect(() => {
    if (isGuest) return
    let cancelled = false
    notificationsApi
      .unreadCount()
      .then((result) => {
        if (!cancelled) setUnreadCount(result.count)
      })
      .catch(() => {
        // Best-effort — the badge just stays hidden if this fails.
      })
    return () => {
      cancelled = true
    }
  }, [isGuest])

  function toggleNotifications() {
    const next = !notifOpen
    setNotifOpen(next)
    if (next) {
      setNotifLoading(true)
      notificationsApi
        .mine()
        .then(setNotifications)
        .catch(() => {
          // Best-effort — the dropdown just stays empty if this fails.
        })
        .finally(() => setNotifLoading(false))
    }
  }

  function handleNotificationClick(notification: NotificationSummary) {
    setNotifOpen(false)
    if (!notification.read) {
      notificationsApi.markRead(notification.id).catch(() => {
        // Best-effort — the item just stays marked unread locally if this fails.
      })
      setNotifications((prev) =>
        prev.map((existing) =>
          existing.id === notification.id ? { ...existing, read: true } : existing,
        ),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    if (notification.link) {
      navigate(localize(notification.link))
    }
  }

  function handleMarkAllRead() {
    notificationsApi.markAllRead().catch(() => {
      // Best-effort — the badge/list just stay as-is if this fails.
    })
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
    setUnreadCount(0)
  }

  return (
    <header className={cn('z-50 border-b border-border bg-surface', sticky && 'sticky top-0')}>
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            to={localize(ROUTES.home)}
            className="flex shrink-0 items-center gap-2.5 no-underline"
          >
            <Logo context="header" />
          </Link>
          <nav className="header:flex hidden items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.label === activeItem
              return (
                <RouteLink
                  key={item.label}
                  to={item.to}
                  className={cn(
                    'inline-flex items-center rounded-lg px-3.5 py-2 text-[14.5px] font-semibold no-underline',
                    isActive ? 'bg-primary-tint text-primary' : 'text-ink',
                  )}
                >
                  {t(item.label)}
                </RouteLink>
              )
            })}
          </nav>
        </div>

        <div className="header:flex hidden shrink-0 items-center gap-3">
          <LanguageSwitcher className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-ink no-underline" />
          {isGuest ? (
            showGuestAuthLinks && (
              <>
                <Link
                  to={localize(ROUTES.login)}
                  className="rounded-lg px-4 py-2.5 text-[14.5px] font-semibold text-ink no-underline"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to={localize(ROUTES.register)}
                  className="rounded-lg bg-primary px-[18px] py-2.5 text-[14.5px] font-bold text-white no-underline"
                >
                  {t('nav.register')}
                </Link>
              </>
            )
          ) : (
            <>
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={toggleNotifications}
                  aria-label={t('aria.notifications')}
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
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-[7px] w-[7px] rounded-full bg-danger" />
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute top-[46px] right-0 max-h-[420px] w-[340px] overflow-y-auto rounded-[10px] border border-border bg-surface p-1.5 text-left shadow-elevated">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-[13px] font-bold text-ink">
                        {t('notifications.title')}
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[12px] font-bold text-primary"
                        >
                          {t('notifications.markAllRead')}
                        </button>
                      )}
                    </div>
                    {notifLoading ? (
                      <div className="px-2 py-4 text-center text-[13px] text-slate">
                        {t('notifications.loading')}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-2 py-4 text-center text-[13px] text-slate">
                        {t('notifications.empty')}
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            'block w-full rounded-md px-2.5 py-2.5 text-left',
                            !notification.read && 'bg-primary-tint/40',
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {!notification.read && (
                              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                            <div className="min-w-0">
                              <div className="text-[13px] leading-[1.4] text-ink">
                                {notification.message}
                              </div>
                              <div className="mt-0.5 text-[11.5px] text-fog">
                                {new Date(notification.createdAt).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-control border border-border bg-surface py-[5px] pr-2.5 pl-[5px]"
                >
                  {userPhotoUrl ? (
                    <img
                      src={`${API_BASE_URL}${userPhotoUrl}?v=${userPhotoVersion}`}
                      alt={resolvedUserName}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] font-bold text-white',
                        avatarBgClass,
                      )}
                    >
                      {userInitial}
                    </span>
                  )}
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
                    {userMenuItems.map((item) =>
                      item.label === 'nav.logout' ? (
                        <button
                          key={item.label}
                          type="button"
                          onClick={handleLogout}
                          className="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-ink"
                        >
                          {t(item.label)}
                        </button>
                      ) : (
                        <RouteLink
                          key={item.label}
                          to={item.to}
                          className="block rounded-md px-3 py-2.5 text-sm font-medium text-ink no-underline"
                        >
                          {t(item.label)}
                        </RouteLink>
                      ),
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={t('aria.menu')}
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
            <RouteLink
              key={item.label}
              to={item.to}
              className="block border-b border-[#F0F1F3] px-1.5 py-[11px] text-[15px] font-semibold text-ink no-underline"
            >
              {t(item.label)}
            </RouteLink>
          ))}
          <LanguageSwitcher className="mt-3.5 block w-full rounded-lg border border-border px-2.5 py-2.5 text-center text-[14.5px] font-semibold text-ink no-underline" />
          {isGuest ? (
            showGuestAuthLinks && (
              <div className="mt-3.5 flex gap-2.5">
                <Link
                  to={localize(ROUTES.login)}
                  className="flex-1 rounded-lg border border-border px-2.5 py-2.5 text-center text-[14.5px] font-semibold text-ink no-underline"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to={localize(ROUTES.register)}
                  className="flex-1 rounded-lg bg-primary px-2.5 py-2.5 text-center text-[14.5px] font-bold text-white no-underline"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3.5 w-full rounded-lg border border-border px-2.5 py-2.5 text-center text-[14.5px] font-semibold text-ink"
            >
              {t('nav.logout')}
            </button>
          )}
        </div>
      )}
    </header>
  )
}
