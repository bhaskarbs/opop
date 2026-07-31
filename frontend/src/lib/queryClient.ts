import { QueryClient } from '@tanstack/react-query'

// Scoped intentionally to just the two read-heavy, rarely-changing endpoints that actually
// benefit from client-side caching (job search results, job detail — see jobsApi.ts's
// jobQueryKeys) rather than a blanket cache-everything policy, since most of this app's data
// (applications, saved jobs, notifications, billing/admin state) is per-user and mutated
// constantly, where a stale cache would just show wrong data. 60s staleTime means navigating
// back to a search you just ran (or a job you just viewed) doesn't re-hit the backend, while
// still picking up newly-posted jobs within a minute.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})
