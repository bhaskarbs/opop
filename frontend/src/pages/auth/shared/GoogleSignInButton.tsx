import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { waitForGoogleIdentity } from '../../../lib/googleIdentity'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

/** Renders Google's own "Continue with Google" button (required by Google's branding terms —
 * a custom-styled button can't trigger the credential flow on its own) and hands the ID token
 * credential back to the caller on success. Renders nothing if VITE_GOOGLE_CLIENT_ID isn't
 * configured, so the rest of the auth page is unaffected in environments that haven't set up
 * Google sign-in yet. */
export function GoogleSignInButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const { t } = useTranslation('auth')
  const containerRef = useRef<HTMLDivElement>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return
    let cancelled = false
    waitForGoogleIdentity()
      .then((google) => {
        if (cancelled || !containerRef.current) return
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        })
        google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: containerRef.current.offsetWidth || 320,
          text: 'continue_with',
        })
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [onCredential])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div>
      <div ref={containerRef} className="flex w-full justify-center [&>div]:w-full" />
      {loadFailed && <p className="mt-1.5 text-center text-[12.5px] text-danger">{t('social.googleSignInFailed')}</p>}
    </div>
  )
}
