import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// A lazy route chunk (see App.tsx's lazy()/Suspense split) is fetched by a content-hashed
// filename — if a new version has since been deployed, a tab left open from before that deploy
// requests a hash that no longer exists and the dynamic import() rejects. Reloading fetches the
// current index.html (and therefore the current hashes) and fixes it outright, so this is worth
// special-casing rather than falling through to the generic "Something went wrong" screen below.
const CHUNK_LOAD_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|dynamically imported module/i

// Guards against an infinite reload loop if the chunk is missing for a reason a reload can't
// fix (e.g. the asset is gone for good) — session-scoped, so a later real deploy (new tab/visit)
// gets a fresh attempt rather than being permanently stuck on the fallback screen.
const RELOAD_GUARD_KEY = 'oo_chunk_reload_attempted'

/** Catches any render-time error anywhere below it — without this, React unmounts the whole
 * tree on an uncaught error, leaving a blank white page with no way back in (see App.tsx's
 * single top-level <Suspense>, which has no error-handling of its own). Session-expiry doesn't
 * crash the render by itself (RequireAuth just redirects), but a session left open long enough
 * to expire has often also outlived the currently-deployed JS chunk hashes, and *that* throws
 * here — hence this being reported as "the page is blank after my session expired". */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (CHUNK_LOAD_ERROR_PATTERN.test(error.message)) {
      if (!sessionStorage.getItem(RELOAD_GUARD_KEY)) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, '1')
        window.location.reload()
        return
      }
    }
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-extrabold text-ink">Something went wrong</h1>
          <p className="max-w-sm text-sm text-slate">
            This page ran into an unexpected error. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-5 py-2.5 text-[13.5px] font-bold text-white"
          >
            Reload page
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
