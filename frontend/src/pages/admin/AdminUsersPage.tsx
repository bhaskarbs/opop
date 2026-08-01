import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { LoadingState, Spinner } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ApiError } from '../../lib/apiClient'
import {
  adminApi,
  type AdminTeamMemberSummary,
  type AdminUserRole,
  type AdminUserSummary,
  type CreatableAdminLevel,
} from '../../lib/adminApi'
import { ROUTES } from '../../routes/paths'
import { useAuthStore } from '../../stores/authStore'

type Tab = 'candidates' | 'companies' | 'admins'

function isTab(value: string | null): value is Tab {
  return value === 'candidates' || value === 'companies' || value === 'admins'
}

const CREATABLE_ADMIN_LEVELS: CreatableAdminLevel[] = ['REVIEWER', 'ADMIN']

const AVATAR_COLOR_CLASSES = ['bg-primary', 'bg-teal', 'bg-amber']

function colorForName(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]
}

function formatJoinedLabel(locale: string, createdAt: string): string {
  return new Date(createdAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Underlying status literal, used for `statusClass()` color mapping and as the
 * `USER_STATUS_LABEL_KEYS` lookup key — not rendered directly (see that map for display text). */
function displayStatus(user: AdminUserSummary): string {
  if (user.accountStatus === 'SUSPENDED') return 'Suspended'
  if (user.role === 'COMPANY') {
    if (user.verificationStatus === 'VERIFIED') return 'Verified'
    if (user.verificationStatus === 'REJECTED') return 'Rejected'
    return 'Pending review'
  }
  return 'Active'
}

const USER_STATUS_LABEL_KEYS: Record<string, string> = {
  Suspended: 'users.status.suspended',
  Verified: 'users.status.verified',
  Rejected: 'users.status.rejected',
  'Pending review': 'users.status.pendingReview',
  Active: 'users.status.active',
}

function statusClass(status: string): string {
  if (status === 'Active' || status === 'Verified') return 'bg-teal-tint text-teal'
  if (status === 'Suspended' || status === 'Rejected') return 'bg-danger/10 text-danger'
  return 'bg-amber-tint text-amber'
}

const PAGE_SIZE = 10

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation('admin')
  const localize = useLocalizedPath()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const fromUrl = searchParams.get('tab')
    return isTab(fromUrl) ? fromUrl : 'candidates'
  })
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const currentUser = useAuthStore((state) => state.user)
  // Every admin tier reaches this page, but only admin/super_admin get an Admins tab at all —
  // reviewer's whole scope is candidates/companies (see RequireAdminLevel's route-level version
  // of this same rule).
  const canSeeTeamTab = currentUser?.adminLevel !== 'REVIEWER'
  const canManageTeam = currentUser?.adminLevel === 'SUPER_ADMIN'

  const [teamMembers, setTeamMembers] = useState<AdminTeamMemberSummary[]>([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [teamActioningId, setTeamActioningId] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newAdminLevel, setNewAdminLevel] = useState<CreatableAdminLevel>('REVIEWER')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const role: AdminUserRole = tab === 'companies' ? 'COMPANY' : 'CANDIDATE'

  useEffect(() => {
    if (tab === 'admins') return
    let cancelled = false
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
      setPage(1)
      adminApi
        .users({ role, q: query.trim() || undefined })
        .then((result) => {
          if (!cancelled) setUsers(result)
        })
        .catch((caught) => {
          if (!cancelled) {
            setError(caught instanceof ApiError ? caught.message : t('users.loadError'))
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [tab, role, query, t])

  useEffect(() => {
    if (tab !== 'admins') return
    let cancelled = false
    // Both the "start loading" and "run the fetch" steps happen inside this .then() (rather
    // than setTeamLoading/setTeamError synchronously in the effect body) purely to satisfy
    // react-hooks/set-state-in-effect — see JobSearchPage/IdeasBrowsePage for the same pattern.
    Promise.resolve()
      .then(() => {
        setTeamLoading(true)
        setTeamError(null)
        return adminApi.teamMembers()
      })
      .then((result) => {
        if (!cancelled) setTeamMembers(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setTeamError(caught instanceof ApiError ? caught.message : t('users.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setTeamLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, t])

  async function handleToggleStatus(user: AdminUserSummary) {
    if (user.accountStatus === 'ACTIVE') {
      if (!window.confirm(t('users.confirmSuspend', { name: user.fullName }))) return
    }
    setActioningId(user.id)
    try {
      const updated: AdminUserSummary =
        user.accountStatus === 'ACTIVE'
          ? await adminApi.suspendUser(user.id)
          : await adminApi.reactivateUser(user.id)
      setUsers((prev) => prev.map((existing) => (existing.id === user.id ? updated : existing)))
    } catch {
      // Best-effort — the row simply keeps its current status if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  async function handleCreateTeamMember(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const created = await adminApi.createTeamMember({
        email: newEmail,
        password: newPassword,
        fullName: newFullName,
        adminLevel: newAdminLevel,
      })
      setTeamMembers((prev) => [...prev, created])
      setNewEmail('')
      setNewPassword('')
      setNewFullName('')
      setNewAdminLevel('REVIEWER')
    } catch (caught) {
      setCreateError(caught instanceof ApiError ? caught.message : t('users.team.createError'))
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteTeamMember(member: AdminTeamMemberSummary) {
    if (!window.confirm(t('users.team.confirmDelete', { name: member.fullName }))) return
    setTeamActioningId(member.id)
    try {
      await adminApi.deleteTeamMember(member.id)
      setTeamMembers((prev) => prev.filter((existing) => existing.id !== member.id))
    } catch (caught) {
      setTeamError(caught instanceof ApiError ? caught.message : t('users.team.deleteError'))
    } finally {
      setTeamActioningId(null)
    }
  }

  function switchTab(next: Tab) {
    setTab(next)
    setQuery('')
    setSearchParams(next === 'candidates' ? {} : { tab: next })
  }

  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleUsers = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 pb-16">
      <div className="mb-5">
        <h1 className="mb-1 text-[22px] font-extrabold text-ink">{t('users.title')}</h1>
        <p className="text-sm text-slate">{t('users.subtitle')}</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchTab('candidates')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'candidates'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          {t('users.tabs.candidates')}
        </button>
        <button
          type="button"
          onClick={() => switchTab('companies')}
          className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
            tab === 'companies'
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-surface text-[#3A414D]'
          }`}
        >
          {t('users.tabs.companies')}
        </button>
        {canSeeTeamTab && (
          <button
            type="button"
            onClick={() => switchTab('admins')}
            className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
              tab === 'admins'
                ? 'border-ink bg-ink text-white'
                : 'border-border bg-surface text-[#3A414D]'
            }`}
          >
            {t('users.tabs.admins')}
          </button>
        )}
      </div>

      {tab !== 'admins' && (
        <div className="mb-4 flex flex-wrap gap-2.5 rounded-card border border-border bg-surface p-4">
          <div className="flex min-w-[220px] flex-[2] items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="shrink-0 text-fog"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="w-full text-[13.5px] text-ink outline-none"
            />
          </div>
        </div>
      )}

      {tab === 'admins' ? (
        <>
          {canManageTeam && (
            <form
              onSubmit={handleCreateTeamMember}
              className="mb-6 rounded-card border border-border bg-surface p-5"
            >
              <h2 className="mb-3 text-base font-bold text-ink">{t('users.team.addTitle')}</h2>
              {createError && (
                <p className="mb-3 text-[13px] font-semibold text-danger">{createError}</p>
              )}
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder={t('users.team.emailPlaceholder')}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog"
                />
                <input
                  value={newFullName}
                  onChange={(event) => setNewFullName(event.target.value)}
                  required
                  placeholder={t('users.team.fullNamePlaceholder')}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder={t('users.team.passwordPlaceholder')}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog"
                />
                <select
                  value={newAdminLevel}
                  onChange={(event) => setNewAdminLevel(event.target.value as CreatableAdminLevel)}
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                >
                  {CREATABLE_ADMIN_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t(`users.team.levels.${level}`)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 rounded-[9px] bg-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {creating && <Spinner className="h-4 w-4" />}
                {t('users.team.create')}
              </button>
            </form>
          )}

          {teamError && (
            <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
              {teamError}
            </div>
          )}

          {teamLoading ? (
            <div className="rounded-card border border-border bg-surface p-8">
              <LoadingState message={t('users.loading')} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${colorForName(member.fullName)}`}
                    >
                      {member.fullName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-bold text-ink">{member.fullName}</div>
                      <div className="text-[13px] text-slate">
                        {t('users.joinedMeta', {
                          email: member.email,
                          joined: formatJoinedLabel(i18n.language, member.createdAt),
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-neutral-tint px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-[#3A414D]">
                      {t(`users.team.levels.${member.adminLevel}`)}
                    </span>
                    {canManageTeam &&
                      member.adminLevel !== 'SUPER_ADMIN' &&
                      member.id !== currentUser?.id && (
                        <button
                          type="button"
                          disabled={teamActioningId === member.id}
                          onClick={() => handleDeleteTeamMember(member)}
                          className="flex items-center gap-1.5 rounded-md border border-[#FCA5A5] bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-danger disabled:opacity-60"
                        >
                          {teamActioningId === member.id && <Spinner className="h-3.5 w-3.5" />}
                          {t('users.team.remove')}
                        </button>
                      )}
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
                  {t('users.team.none')}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-card border border-border bg-surface p-8">
              <LoadingState message={t('users.loading')} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleUsers.map((user) => {
                const status = displayStatus(user)
                return (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface px-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${colorForName(user.fullName)}`}
                      >
                        {user.fullName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14.5px] font-bold text-ink">{user.fullName}</div>
                        <div className="text-[13px] text-slate">
                          {t('users.joinedMeta', {
                            email: user.email,
                            joined: formatJoinedLabel(i18n.language, user.createdAt),
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusClass(status)}`}
                      >
                        {t(USER_STATUS_LABEL_KEYS[status])}
                      </span>
                      <Link
                        to={localize(
                          tab === 'candidates'
                            ? ROUTES.adminCandidateDetail(user.id)
                            : ROUTES.adminCompanyDetail(user.id),
                        )}
                        className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink no-underline"
                      >
                        {t('users.moreDetails')}
                      </Link>
                      <button
                        type="button"
                        disabled={actioningId === user.id}
                        onClick={() => handleToggleStatus(user)}
                        className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                      >
                        {actioningId === user.id && <Spinner className="h-3.5 w-3.5" />}
                        {user.accountStatus === 'ACTIVE'
                          ? t('users.suspend')
                          : t('users.reactivate')}
                      </button>
                    </div>
                  </div>
                )
              })}
              {users.length === 0 && (
                <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
                  {tab === 'candidates' ? t('users.noneCandidates') : t('users.noneCompanies')}
                </div>
              )}
              {pageCount > 1 && (
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('users.previousPage')}
                  </button>
                  <span className="text-[13px] text-slate">
                    {t('users.pageLabel', { page: currentPage, total: pageCount })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                    disabled={currentPage === pageCount}
                    className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('users.nextPage')}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
