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
import { RequireAuth } from './routes/RequireAuth'
import { ScrollToTop } from './routes/ScrollToTop'
import i18n, { DEFAULT_LANGUAGE, isSupportedLanguage } from './i18n'
import StyleGuidePage from './pages/dev/StyleGuidePage'
import LandingPage from './pages/LandingPage'
import JobSearchPage from './pages/job-search/JobSearchPage'
import JobDetailPage from './pages/JobDetailPage'
import PartnershipsPage from './pages/PartnershipsPage'
import CommunityPage from './pages/CommunityPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import IdeasBrowsePage from './pages/IdeasBrowsePage'
import IdeaDetailPage from './pages/IdeaDetailPage'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import CompanyForgotPasswordPage from './pages/auth/CompanyForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import VerifyEmailPendingPage from './pages/auth/VerifyEmailPendingPage'
import CompanyLoginPage from './pages/auth/CompanyLoginPage'
import CompanyRegisterPage from './pages/auth/CompanyRegisterPage'
import AdminLoginPage from './pages/auth/AdminLoginPage'
import CandidateDashboardPage from './pages/candidate/CandidateDashboardPage'
import CandidateProfilePage from './pages/candidate/CandidateProfilePage'
import AddMissingDetailsPage from './pages/candidate/AddMissingDetailsPage'
import ApplicationsPage from './pages/candidate/ApplicationsPage'
import MockInterviewPage from './pages/candidate/MockInterviewPage'
import MyIdeasPage from './pages/candidate/MyIdeasPage'
import IdeaSubmitPage from './pages/candidate/IdeaSubmitPage'
import CandidateBillingPage from './pages/candidate/CandidateBillingPage'
import CompanyDashboardPage from './pages/company/CompanyDashboardPage'
import CompanyProfilePage from './pages/company/CompanyProfilePage'
import CompanyPartnershipsPage from './pages/company/CompanyPartnershipsPage'
import PostJobPage from './pages/company/PostJobPage'
import SearchCandidatesPage from './pages/company/SearchCandidatesPage'
import SeminarSchedulerPage from './pages/company/SeminarSchedulerPage'
import CompanyBillingPage from './pages/company/CompanyBillingPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminApprovalsPage from './pages/admin/AdminApprovalsPage'
import AdminJobApprovalsPage from './pages/admin/AdminJobApprovalsPage'
import AdminCompanyApprovalsPage from './pages/admin/AdminCompanyApprovalsPage'
import AdminIdeaApprovalsPage from './pages/admin/AdminIdeaApprovalsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminMockInterviewQuestionsPage from './pages/admin/AdminMockInterviewQuestionsPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminBillingPage from './pages/admin/AdminBillingPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'

const PublicLayout = lazy(() => import('./layouts/PublicLayout'))
const AuthenticatedLayout = lazy(() => import('./layouts/AuthenticatedLayout'))

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
          clearSession()
        }
      })
  }, [setSession, clearSession])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={null}>
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
              <Route path="verify-email" element={<VerifyEmailPage />} />
              <Route path="verify-email-pending" element={<VerifyEmailPendingPage />} />
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
                <Route path="company/search-candidates" element={<SearchCandidatesPage />} />
                <Route path="company/seminars" element={<SeminarSchedulerPage />} />
                <Route path="company/ideas" element={<MyIdeasPage />} />
                <Route path="company/ideas/submit" element={<IdeaSubmitPage />} />
                <Route path="company/ideas/:ideaId/edit" element={<IdeaSubmitPage />} />
                <Route path="company/billing" element={<CompanyBillingPage />} />
              </Route>
            </Route>

            <Route element={<RequireAuth role="ADMIN" />}>
              <Route element={<AuthenticatedLayout headerVariant="admin" />}>
                <Route path="admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="admin/approvals" element={<AdminApprovalsPage />}>
                  <Route index element={<Navigate to="companies" replace />} />
                  <Route path="companies" element={<AdminCompanyApprovalsPage />} />
                  <Route path="jobs" element={<AdminJobApprovalsPage />} />
                  <Route path="ideas" element={<AdminIdeaApprovalsPage />} />
                </Route>
                <Route path="admin/users" element={<AdminUsersPage />} />
                <Route
                  path="admin/mock-interview-questions"
                  element={<AdminMockInterviewQuestionsPage />}
                />
                <Route path="admin/reports" element={<AdminReportsPage />} />
                <Route path="admin/billing" element={<AdminBillingPage />} />
                <Route path="admin/settings" element={<AdminSettingsPage />} />
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
