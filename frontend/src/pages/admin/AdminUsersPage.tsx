import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/apiClient'
import { adminApi, type AdminUserRole, type AdminUserSummary } from '../../lib/adminApi'

type Tab = 'candidates' | 'companies'

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

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation('admin')
  const [tab, setTab] = useState<Tab>('candidates')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const role: AdminUserRole = tab === 'candidates' ? 'CANDIDATE' : 'COMPANY'

  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError(null)
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
  }, [role, query, t])

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

  function switchTab(next: Tab) {
    setTab(next)
    setQuery('')
  }

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
      </div>

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

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-slate">
          {t('users.loading')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => {
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
                  <button
                    type="button"
                    disabled={actioningId === user.id}
                    onClick={() => handleToggleStatus(user)}
                    className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-bold text-ink disabled:opacity-60"
                  >
                    {user.accountStatus === 'ACTIVE' ? t('users.suspend') : t('users.reactivate')}
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
        </div>
      )}
    </main>
  )
}
