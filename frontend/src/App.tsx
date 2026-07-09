import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import StyleGuidePage from './pages/dev/StyleGuidePage'
import LandingPage from './pages/LandingPage'
import JobSearchPage from './pages/job-search/JobSearchPage'
import JobDetailPage from './pages/JobDetailPage'
import PartnershipsPage from './pages/PartnershipsPage'
import CommunityPage from './pages/CommunityPage'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CompanyLoginPage from './pages/auth/CompanyLoginPage'
import CompanyRegisterPage from './pages/auth/CompanyRegisterPage'
import CandidateDashboardPage from './pages/candidate/CandidateDashboardPage'
import CandidateProfilePage from './pages/candidate/CandidateProfilePage'
import AddMissingDetailsPage from './pages/candidate/AddMissingDetailsPage'
import ApplicationsPage from './pages/candidate/ApplicationsPage'
import SeminarSchedulerPage from './pages/candidate/SeminarSchedulerPage'
import MockInterviewPage from './pages/candidate/MockInterviewPage'
import CompanyDashboardPage from './pages/company/CompanyDashboardPage'
import PostJobPage from './pages/company/PostJobPage'
import SearchCandidatesPage from './pages/company/SearchCandidatesPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminJobApprovalsPage from './pages/admin/AdminJobApprovalsPage'
import AdminCompanyApprovalsPage from './pages/admin/AdminCompanyApprovalsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'

const PublicLayout = lazy(() => import('./layouts/PublicLayout'))
const AuthenticatedLayout = lazy(() => import('./layouts/AuthenticatedLayout'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/jobs" element={<JobSearchPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/partnerships" element={<PartnershipsPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/company/login" element={<CompanyLoginPage />} />
            <Route path="/company/register" element={<CompanyRegisterPage />} />
          </Route>

          <Route element={<AuthenticatedLayout headerVariant="candidate" />}>
            <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />
            <Route path="/candidate/profile" element={<CandidateProfilePage />} />
            <Route path="/candidate/profile/add-details" element={<AddMissingDetailsPage />} />
            <Route path="/candidate/applications" element={<ApplicationsPage />} />
            <Route path="/candidate/seminars" element={<SeminarSchedulerPage />} />
            <Route path="/candidate/mock-interview" element={<MockInterviewPage />} />
          </Route>

          <Route element={<AuthenticatedLayout headerVariant="company" />}>
            <Route path="/company/dashboard" element={<CompanyDashboardPage />} />
            <Route path="/company/post-job" element={<PostJobPage />} />
            <Route path="/company/search-candidates" element={<SearchCandidatesPage />} />
          </Route>

          <Route element={<AuthenticatedLayout headerVariant="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/job-approvals" element={<AdminJobApprovalsPage />} />
            <Route path="/admin/company-approvals" element={<AdminCompanyApprovalsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
          </Route>

          <Route path="/dev/style-guide" element={<StyleGuidePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
