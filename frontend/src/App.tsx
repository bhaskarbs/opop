import { lazy, Suspense, useEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'
import { authApi } from './lib/apiClient'
import { useAuthStore } from './stores/authStore'
import { RequireAdminLevel } from './routes/RequireAdminLevel'
import { RequireAuth } from './routes/RequireAuth'
import { ScrollToTop } from './routes/ScrollToTop'
import i18n, { DEFAULT_LANGUAGE, isSupportedLanguage } from './i18n'
import { LoadingState } from './components/ui'

// Every page (and the two layouts below) is lazy — each becomes its own chunk, so a candidate
// never downloads company/admin page code and vice versa. Route changes suspend on the single
// <Suspense> in App() below, which shows a centered spinner rather than a blank screen while
// the chunk for the destination route loads.
const PublicLayout = lazy(() => import('./layouts/PublicLayout'))
const AuthenticatedLayout = lazy(() => import('./layouts/AuthenticatedLayout'))

const StyleGuidePage = lazy(() => import('./pages/dev/StyleGuidePage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const JobSearchPage = lazy(() => import('./pages/job-search/JobSearchPage'))
const JobDetailPage = lazy(() => import('./pages/JobDetailPage'))
const PartnershipsPage = lazy(() => import('./pages/PartnershipsPage'))
const CommunityPage = lazy(() => import('./pages/CommunityPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'))
const IdeasBrowsePage = lazy(() => import('./pages/IdeasBrowsePage'))
const IdeaDetailPage = lazy(() => import('./pages/IdeaDetailPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const CompanyForgotPasswordPage = lazy(() => import('./pages/auth/CompanyForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const CompanyLoginPage = lazy(() => import('./pages/auth/CompanyLoginPage'))
const CompanyRegisterPage = lazy(() => import('./pages/auth/CompanyRegisterPage'))
const AdminLoginPage = lazy(() => import('./pages/auth/AdminLoginPage'))
const CandidateDashboardPage = lazy(() => import('./pages/candidate/CandidateDashboardPage'))
const CandidateProfilePage = lazy(() => import('./pages/candidate/CandidateProfilePage'))
const AddMissingDetailsPage = lazy(() => import('./pages/candidate/AddMissingDetailsPage'))
const ApplicationsPage = lazy(() => import('./pages/candidate/ApplicationsPage'))
const SavedJobsPage = lazy(() => import('./pages/candidate/SavedJobsPage'))
const JobAlertsPage = lazy(() => import('./pages/candidate/JobAlertsPage'))
const MockInterviewPage = lazy(() => import('./pages/candidate/MockInterviewPage'))
const MyIdeasPage = lazy(() => import('./pages/candidate/MyIdeasPage'))
const IdeaSubmitPage = lazy(() => import('./pages/candidate/IdeaSubmitPage'))
const CandidateBillingPage = lazy(() => import('./pages/candidate/CandidateBillingPage'))
const CompanyDashboardPage = lazy(() => import('./pages/company/CompanyDashboardPage'))
const CompanyProfilePage = lazy(() => import('./pages/company/CompanyProfilePage'))
const CompanyPartnershipsPage = lazy(() => import('./pages/company/CompanyPartnershipsPage'))
const PostJobPage = lazy(() => import('./pages/company/PostJobPage'))
const MyJobPostingsPage = lazy(() => import('./pages/company/MyJobPostingsPage'))
const JobApplicantsPage = lazy(() => import('./pages/company/JobApplicantsPage'))
const SearchCandidatesPage = lazy(() => import('./pages/company/SearchCandidatesPage'))
const CandidateProfileViewPage = lazy(() => import('./pages/company/CandidateProfileViewPage'))
const SeminarSchedulerPage = lazy(() => import('./pages/company/SeminarSchedulerPage'))
const CompanyBillingPage = lazy(() => import('./pages/company/CompanyBillingPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminApprovalsPage = lazy(() => import('./pages/admin/AdminApprovalsPage'))
const AdminJobApprovalsPage = lazy(() => import('./pages/admin/AdminJobApprovalsPage'))
const AdminCompanyApprovalsPage = lazy(() => import('./pages/admin/AdminCompanyApprovalsPage'))
const AdminIdeaApprovalsPage = lazy(() => import('./pages/admin/AdminIdeaApprovalsPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminCandidateDetailPage = lazy(() => import('./pages/admin/AdminCandidateDetailPage'))
const AdminCompanyDetailPage = lazy(() => import('./pages/admin/AdminCompanyDetailPage'))
const AdminMockInterviewQuestionsPage = lazy(
  () => import('./pages/admin/AdminMockInterviewQuestionsPage'),
)
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'))
const AdminBillingPage = lazy(() => import('./pages/admin/AdminBillingPage'))
const AdminJobsPage = lazy(() => import('./pages/admin/AdminJobsPage'))
const AdminIdeasPage = lazy(() => import('./pages/admin/AdminIdeasPage'))

/** Every route lives under a `/:lang` prefix (see docs/DEVELOPMENT_ROADMAP.md Step 23). An
 * unrecognized or missing lang segment is treated as a path with no locale at all — e.g.
 * `/jobs` or `/` — so the redirect re-prepends the default locale onto the real path
 * (`location.pathname`) rather than the router's parsed `:lang` param, which would otherwise
 * discard the rest of the URL whenever the first segment isn't a real locale. */
function LocaleRoot() {
  const { lang } = useParams()
  const location = useLocation()

  useEffect(() => {
    if (isSupportedLanguage(lang)) {
      i18n.changeLanguage(lang)
      document.documentElement.lang = lang
    }
  }, [lang])

  if (!isSupportedLanguage(lang)) {
    return <Navigate to={`/${DEFAULT_LANGUAGE}${location.pathname}`} replace />
  }

  return <Outlet />
}

function App() {
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)

  useEffect(() => {
    // Silently try to re-establish a session from the httpOnly refresh cookie on load —
    // the access token itself is never persisted (see authStore), so this is the only
    // way a session survives a hard page reload.
    //
    // This call is already in flight the moment /login mounts. If the user submits the login
    // form and it resolves *faster* than this one does, setSession() from the login flow runs
    // first (status -> 'authenticated', dashboard renders) — but this call was fired before
    // any cookie existed, so it then resolves as a failure and its clearSession() would
    // immediately wipe out the freshly-established session, bouncing RequireAuth back to
    // /login. That's exactly the "dashboard doesn't load after login, but a refresh fixes it"
    // bug: a hard reload re-runs this same bootstrap with no stale call left to race against.
    // Guarding on status still being 'checking' means this stale response is simply ignored
    // once something else (login/logout) has already settled the auth state.
    authApi
      .refresh()
      .then((response) => {
        if (useAuthStore.getState().status === 'checking') {
          setSession(response.accessToken, response.user)
        }
      })
      .catch(() => {
        if (useAuthStore.getState().status === 'checking') {
          // clearSession() cascades to every per-domain cache store via authStore's
          // onSessionCleared listeners (registered in main.tsx).
          clearSession()
        }
      })
  }, [setSession, clearSession])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/" element={<Navigate to={`/${DEFAULT_LANGUAGE}`} replace />} />

          <Route path="/:lang" element={<LocaleRoot />}>
            <Route element={<PublicLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="jobs" element={<JobSearchPage />} />
              <Route path="jobs/:jobId" element={<JobDetailPage />} />
              <Route path="partnerships" element={<PartnershipsPage />} />
              <Route path="partnerships/ideas" element={<IdeasBrowsePage />} />
              <Route path="partnerships/ideas/:ideaId" element={<IdeaDetailPage />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="terms-of-service" element={<TermsOfServicePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="company/login" element={<CompanyLoginPage />} />
              <Route path="company/register" element={<CompanyRegisterPage />} />
              <Route path="company/forgot-password" element={<CompanyForgotPasswordPage />} />
              <Route path="admin/login" element={<AdminLoginPage />} />
            </Route>

            <Route element={<RequireAuth role="CANDIDATE" />}>
              <Route element={<AuthenticatedLayout headerVariant="candidate" />}>
                <Route path="candidate/dashboard" element={<CandidateDashboardPage />} />
                <Route path="candidate/profile" element={<CandidateProfilePage />} />
                <Route path="candidate/profile/add-details" element={<AddMissingDetailsPage />} />
                <Route path="candidate/applications" element={<ApplicationsPage />} />
                <Route path="candidate/saved-jobs" element={<SavedJobsPage />} />
                <Route path="candidate/job-alerts" element={<JobAlertsPage />} />
                <Route path="candidate/mock-interview" element={<MockInterviewPage />} />
                <Route path="candidate/ideas" element={<MyIdeasPage />} />
                <Route path="candidate/ideas/submit" element={<IdeaSubmitPage />} />
                <Route path="candidate/ideas/:ideaId/edit" element={<IdeaSubmitPage />} />
                <Route path="candidate/billing" element={<CandidateBillingPage />} />
              </Route>
            </Route>

            <Route element={<RequireAuth role="COMPANY" />}>
              <Route element={<AuthenticatedLayout headerVariant="company" />}>
                <Route path="company/dashboard" element={<CompanyDashboardPage />} />
                <Route path="company/profile" element={<CompanyProfilePage />} />
                <Route path="company/partnerships" element={<CompanyPartnershipsPage />} />
                <Route path="company/post-job" element={<PostJobPage />} />
                <Route path="company/job-postings" element={<MyJobPostingsPage />} />
                <Route path="company/job-postings/:jobId/edit" element={<PostJobPage />} />
                <Route
                  path="company/job-postings/:jobId/applicants"
                  element={<JobApplicantsPage />}
                />
                <Route path="company/search-candidates" element={<SearchCandidatesPage />} />
                <Route path="company/candidates/:userId" element={<CandidateProfileViewPage />} />
                <Route path="company/seminars" element={<SeminarSchedulerPage />} />
                <Route path="company/ideas" element={<MyIdeasPage />} />
                <Route path="company/ideas/submit" element={<IdeaSubmitPage />} />
                <Route path="company/ideas/:ideaId/edit" element={<IdeaSubmitPage />} />
                <Route path="company/billing" element={<CompanyBillingPage />} />
              </Route>
            </Route>

            <Route element={<RequireAuth role="ADMIN" />}>
              <Route element={<AuthenticatedLayout headerVariant="admin" />}>
                {/* Every admin tier — reviewer, admin, super_admin — reaches approvals and
                    user management (see AdminLevel.java and RequireAdminLevel). */}
                <Route path="admin/approvals" element={<AdminApprovalsPage />}>
                  <Route index element={<Navigate to="companies" replace />} />
                  <Route path="companies" element={<AdminCompanyApprovalsPage />} />
                  <Route path="jobs" element={<AdminJobApprovalsPage />} />
                  <Route path="ideas" element={<AdminIdeaApprovalsPage />} />
                </Route>
                <Route path="admin/users" element={<AdminUsersPage />} />
                <Route path="admin/users/candidates/:id" element={<AdminCandidateDetailPage />} />
                <Route path="admin/users/companies/:id" element={<AdminCompanyDetailPage />} />

                {/* Everything else in the admin console is admin/super_admin only — a reviewer
                    hitting one of these directly bounces to Approvals (see RequireAdminLevel). */}
                <Route element={<RequireAdminLevel levels={['ADMIN', 'SUPER_ADMIN']} />}>
                  <Route path="admin/dashboard" element={<AdminDashboardPage />} />
                  <Route
                    path="admin/mock-interview-questions"
                    element={<AdminMockInterviewQuestionsPage />}
                  />
                  <Route path="admin/reports" element={<AdminReportsPage />} />
                  <Route path="admin/billing" element={<AdminBillingPage />} />
                  <Route path="admin/jobs" element={<AdminJobsPage />} />
                  <Route path="admin/ideas" element={<AdminIdeasPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="dev/style-guide" element={<StyleGuidePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
