const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

declare global {
  interface Window {
    dataLayer: unknown[]
  }
}

let initialized = false

function gtag(...args: unknown[]) {
  window.dataLayer.push(args)
}

/** The one place in the app that talks to gtag.js directly, so every call site goes through the
 * same no-op-when-unconfigured guard instead of each one checking VITE_GA_MEASUREMENT_ID itself.
 * Leave VITE_GA_MEASUREMENT_ID blank (the default — see .env.example) to disable analytics
 * entirely; no GA4 property is needed to build or run the app locally. send_page_view is off —
 * this only ever sends the pageviews and events explicitly captured below (GA4's own automatic
 * pageview only fires once on script load, which doesn't work for an SPA's route changes). */
function ensureInitialized(): boolean {
  if (!GA_MEASUREMENT_ID) return false
  if (!initialized) {
    window.dataLayer = window.dataLayer || []
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    document.head.appendChild(script)
    gtag('js', new Date())
    gtag('config', GA_MEASUREMENT_ID, { send_page_view: false })
    initialized = true
  }
  return true
}

export const analytics = {
  pageview(pathname: string) {
    if (ensureInitialized()) {
      gtag('event', 'page_view', { page_location: window.location.href, page_path: pathname })
    }
  },
  capture(event: string, properties?: Record<string, unknown>) {
    if (ensureInitialized()) gtag('event', event, properties)
  },
  identify(userId: string, properties?: Record<string, unknown>) {
    if (ensureInitialized()) {
      gtag('set', { user_id: userId })
      if (properties) gtag('set', 'user_properties', properties)
    }
  },
  reset() {
    if (initialized) gtag('set', { user_id: undefined })
  },
}
