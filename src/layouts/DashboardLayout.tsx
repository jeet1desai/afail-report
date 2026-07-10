import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState, type JSX } from 'react';

const navItems = [
  // {
  //   path: "/82-report",
  //   label: "82 Report",
  //   icon: (
  //     <svg
  //       className="sidebar__icon"
  //       viewBox="0 0 24 24"
  //       fill="none"
  //       stroke="currentColor"
  //       strokeWidth="2"
  //       strokeLinecap="round"
  //       strokeLinejoin="round"
  //     >
  //       <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
  //       <polyline points="14 2 14 8 20 8" />
  //       <line x1="16" y1="13" x2="8" y2="13" />
  //       <line x1="16" y1="17" x2="8" y2="17" />
  //     </svg>
  //   ),
  // },

  {
    path: '/plants',
    label: 'Plants',
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    path: '/main-sheet',
    label: 'Main Sheet',
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    ),
  },
  {
    path: '/pivot-reports',
    label: 'Pivot Reports',
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    path: '/failure-report-state',
    label: 'Failure Report State',
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    path: '/summary',
    label: 'Summary',
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 17h6" />
        <path d="M9 12h6" />
        <path d="M9 7h6" />
      </svg>
    ),
  },
];

const pageTitleConfig: Record<string, { title: string; icon: JSX.Element }> = {
  '/82-report': {
    title: '82 Report',
    icon: (
      <svg className="header__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  '/summary': {
    title: 'Summary',
    icon: (
      <svg className="header__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 17h6" />
        <path d="M9 12h6" />
        <path d="M9 7h6" />
      </svg>
    ),
  },
  '/plants': {
    title: 'Plants',
    icon: (
      <svg className="header__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  '/main-sheet': {
    title: 'Main Sheet',
    icon: (
      <svg className="header__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    ),
  },
  '/pivot-reports': {
    title: 'Pivot Reports',
    icon: (
      <svg className="header__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  '/failure-report-state': {
    title: 'Failure Report State',
    icon: (
      <svg className="header__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
      </svg>
    ),
  },
};

function DashboardLayout() {
  const location = useLocation();
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  if (false) {
    console.log(setToast);
  }

  const config = pageTitleConfig[location.pathname] || {
    title: 'Dashboard',
    icon: null,
  };

  // const showToast = (message: string, type: "success" | "error") => {
  //   setToast({ message, type });
  //   setTimeout(() => setToast(null), 3000);
  // };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">A</div>
          <div className="sidebar__title">Shipment Report</div>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__section-label">Workspace</div>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main">
        <header className="header">
          <div className="header__left">
            <h1 className="header__title">
              {config.icon}
              {config.title}
            </h1>
          </div>
          <div className="header__right"></div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast--${toast.type}`}>
          {toast.type === 'success' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default DashboardLayout;
