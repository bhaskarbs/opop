import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'

/** Thin tab-switcher shell around the three approval queues — each tab is a real nested route
 * (rather than client-only tab state) so it's bookmarkable and the back button works, matching
 * how every other section of the app is a routed page. The tab content (AdminCompanyApprovalsPage
 * / AdminJobApprovalsPage / AdminIdeaApprovalsPage) keeps its own heading/subtitle, so this only
 * renders the switcher. */
export default function AdminApprovalsPage() {
  const { t } = useTranslation('admin')
  const localize = useLocalizedPath()

  function tabClassName({ isActive }: { isActive: boolean }) {
    return `inline-flex items-center rounded-lg px-4 py-2.5 text-[13.5px] font-bold no-underline ${
      isActive ? 'bg-primary-tint text-primary' : 'text-slate'
    }`
  }

  return (
    <>
      <div className="mx-auto max-w-[1280px] px-6 pt-7">
        <div className="mb-1 flex gap-1 border-b border-border">
          <NavLink to={localize(ROUTES.adminCompanyApprovals)} end className={tabClassName}>
            {t('approvals.companiesTab')}
          </NavLink>
          <NavLink to={localize(ROUTES.adminJobApprovals)} end className={tabClassName}>
            {t('approvals.jobsTab')}
          </NavLink>
          <NavLink to={localize(ROUTES.adminIdeaApprovals)} end className={tabClassName}>
            {t('approvals.ideasTab')}
          </NavLink>
        </div>
      </div>
      <Outlet />
    </>
  )
}
