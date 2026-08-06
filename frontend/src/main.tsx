import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { PostHogProvider } from '@posthog/react'
import './index.css'
import './i18n'
import App from './App.tsx'
import { posthogClient } from './lib/analytics.ts'
import { queryClient } from './lib/queryClient.ts'
import { onSessionCleared } from './stores/authStore.ts'
import { useApplicationsStore } from './stores/applicationsStore.ts'
import { useCandidateProfileStore } from './stores/candidateProfileStore.ts'
import { useCompanyProfileStore } from './stores/companyProfileStore.ts'
import { useSavedJobsStore } from './stores/savedJobsStore.ts'

// Registered once here (rather than each store registering itself, or authStore importing
// these directly) so authStore.ts stays free of a circular import back through apiClient.ts —
// see authStore's onSessionCleared for why.
onSessionCleared(() => useCandidateProfileStore.getState().clear())
onSessionCleared(() => useCompanyProfileStore.getState().clear())
onSessionCleared(() => useApplicationsStore.getState().clear())
onSessionCleared(() => useSavedJobsStore.getState().clear())

const app = (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {posthogClient ? <PostHogProvider client={posthogClient}>{app}</PostHogProvider> : app}
  </StrictMode>,
)
