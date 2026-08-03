import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'

let initialized = false

/** The one place in the app that talks to posthog-js directly, so every call site goes through
 * the same no-op-when-unconfigured guard instead of each one checking VITE_POSTHOG_KEY itself.
 * Leave VITE_POSTHOG_KEY blank (the default — see .env.example) to disable analytics entirely;
 * no PostHog account is needed to build or run the app locally. Autocapture/session-recording
 * are left off — this only ever sends the pageviews and events explicitly captured below. */
function ensureInitialized(): boolean {
  if (!POSTHOG_KEY) return false
  if (!initialized) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      capture_pageview: false,
      person_profiles: 'identified_only',
    })
    initialized = true
  }
  return true
}

export const analytics = {
  pageview(pathname: string) {
    if (ensureInitialized()) posthog.capture('$pageview', { $current_url: pathname })
  },
  capture(event: string, properties?: Record<string, unknown>) {
    if (ensureInitialized()) posthog.capture(event, properties)
  },
  identify(userId: string, properties?: Record<string, unknown>) {
    if (ensureInitialized()) posthog.identify(userId, properties)
  },
  reset() {
    if (initialized) posthog.reset()
  },
}
