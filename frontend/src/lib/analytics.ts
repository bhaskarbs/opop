import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
// `||`, not `??` — a blank VITE_POSTHOG_HOST (the normal case: unset locally, and unset as a
// GitHub Actions repo variable in CI) comes through as an empty string, not undefined, so `??`
// never actually falls back and posthog.init() got api_host: "" — every request then resolved
// relative to the current page's own origin (openopportunity.in/array/.../config.js) instead of
// PostHog's servers, which the SPA's catch-all route serves index.html for, producing a
// "SyntaxError: Unexpected token '<'" console error and silently no-op analytics. Confirmed live,
// not assumed.
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com'

/** Only set when VITE_POSTHOG_KEY is configured — undefined in any environment that hasn't set
 * up a PostHog project, so main.tsx can render the app without a <PostHogProvider> at all rather
 * than initialize one against a blank token. `capture_pageview: 'history_change'` (instead of
 * the library's plain-`true` default, which only ever captures the initial hard page load) is
 * what makes PostHog see React Router navigations as pageviews — verified against posthog-js's
 * own source (posthog-core.js), not assumed from docs. */
export const posthogClient = POSTHOG_KEY
  ? posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: 'history_change',
      // Avoids creating a full person profile (and the associated data storage) for anonymous
      // visitors who never do anything identify()-worthy — cheaper and more privacy-conscious
      // than PostHog's own default of always creating one.
      person_profiles: 'identified_only',
    })
  : undefined
