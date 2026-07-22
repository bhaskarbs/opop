import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/apiClient'
import { adminApi } from '../../lib/adminApi'

/** Live platform feature toggles — currently just the one, but see PlatformSettingsService on
 * the backend for why this is its own admin page rather than folded into an existing one. */
export default function AdminSettingsPage() {
  const { t } = useTranslation('admin')
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi
      .getSettings()
      .then((settings) => {
        if (!cancelled) setEmailVerificationEnabled(settings.emailVerificationEnabled)
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(caught instanceof ApiError ? caught.message : t('settings.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  async function handleToggle() {
    const next = !emailVerificationEnabled
    setSaving(true)
    setSaveError(null)
    try {
      const settings = await adminApi.setEmailVerificationEnabled(next)
      setEmailVerificationEnabled(settings.emailVerificationEnabled)
    } catch (caught) {
      setSaveError(caught instanceof ApiError ? caught.message : t('settings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('settings.title')}</h1>
      <p className="mb-6 text-sm text-slate">{t('settings.subtitle')}</p>

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('settings.loading')}
        </div>
      ) : loadError ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-danger">
          {loadError}
        </div>
      ) : (
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[14.5px] font-bold text-ink">
                {t('settings.emailVerification.title')}
              </div>
              <p className="mt-1 max-w-[420px] text-[13px] text-slate">
                {t('settings.emailVerification.body')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailVerificationEnabled}
              aria-label={t('settings.emailVerification.title')}
              onClick={handleToggle}
              disabled={saving}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                emailVerificationEnabled ? 'bg-primary' : 'bg-neutral-tint'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  emailVerificationEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <p className="mt-3 text-[12.5px] font-semibold text-fog">
            {emailVerificationEnabled
              ? t('settings.emailVerification.statusOn')
              : t('settings.emailVerification.statusOff')}
          </p>
          {saveError && <p className="mt-2 text-[13px] text-danger">{saveError}</p>}
        </div>
      )}
    </main>
  )
}
