/**
 * Main authenticated application layout.
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../hooks/useAuth";
import ThemeToggleButton from "../../components/shared/ThemeToggleButton";
import BackToTopButton from "../../components/shared/BackToTopButton";
import MobileBottomNav from "../../components/navigation/MobileBottomNav";
import { getRoleLabel, isAdminRole, isStaffRole } from "../../utils/permissions";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5h8.25V3H3v10.5ZM12.75 21H21V10.5h-8.25V21ZM12.75 3H21v4.5h-8.25V3ZM3 16.5h8.25V21H3v-4.5Z" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v3a2 2 0 0 0 0 3v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-3a2 2 0 0 0 0-3v-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.75h6M9 14.25h3" />
    </svg>
  );
}

function ClientsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="11" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 19a3 3 0 0 0-2.3-2.9M5 19a3 3 0 0 1 2.3-2.9M17 8.5a2.5 2.5 0 1 1 0-5M7 8.5a2.5 2.5 0 1 0 0-5" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9A1.5 1.5 0 0 0 18 19.5V6.75L14.25 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3v3.75H18M9 10.5h6M9 14.25h6M9 18h3" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9A1.5 1.5 0 0 0 18 19.5V6.75L14.25 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3v3.75H18M9 10.5h6M9 14.25h6M9 18h3" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <ellipse cx="12" cy="5.5" rx="7" ry="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5v6c0 1.93 3.13 3.5 7 3.5s7-1.57 7-3.5v-6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 11.5v7c0 1.93 3.13 3.5 7 3.5s7-1.57 7-3.5v-7" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="11" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 8.5a2.5 2.5 0 1 0-2.95-2.45M5.5 8.5a2.5 2.5 0 1 1 2.95-2.45" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 18.5a3 3 0 0 0-2-2.82M5 18.5a3 3 0 0 1 2-2.82" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5 20.25 12m0 0-4.5 4.5m4.5-4.5H9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5H7.875A1.875 1.875 0 0 0 6 6.375v11.25A1.875 1.875 0 0 0 7.875 19.5H10.5" />
    </svg>
  );
}

function getNavigationByRole(role) {
  if (isStaffRole(role)) {
    const items = [
      { label: "Dashboard", to: ROUTES.ADMIN_DASHBOARD, icon: <DashboardIcon /> },
      { label: "Tickets", to: ROUTES.ADMIN_TICKETS, icon: <TicketIcon /> },
      { label: "Clientes", to: ROUTES.ADMIN_CLIENTS, icon: <ClientsIcon /> },
      { label: "Cotizaciones", to: ROUTES.ADMIN_QUOTES, icon: <QuoteIcon /> },
      { label: "Fichas técnicas", to: ROUTES.ADMIN_TECHNICAL_REPORTS, icon: <FileIcon /> },
      { label: "Catálogo técnico", to: ROUTES.ADMIN_CATALOG, icon: <DatabaseIcon /> },
    ];

    if (isAdminRole(role)) {
      items.splice(3, 0, {
        label: "Equipo y roles",
        to: ROUTES.ADMIN_USERS,
        icon: <TeamIcon />,
      });
    }

    return items;
  }

  if (role === "client") {
    return [
      { label: "Dashboard", to: ROUTES.CLIENT_DASHBOARD, icon: <DashboardIcon /> },
      { label: "Mis tickets", to: ROUTES.CLIENT_TICKETS, icon: <TicketIcon /> },
      { label: "Mi información", to: ROUTES.CLIENT_PROFILE, icon: <ProfileIcon /> },
    ];
  }

  return [];
}

function getMobileHeaderByRole(role) {
  if (role === "admin") {
    return {
      eyebrow: "Moonforge Digital",
      title: "Panel de administración",
    };
  }

  if (role === "agent") {
    return {
      eyebrow: "Moonforge Digital",
      title: "Panel operativo",
    };
  }

  if (role === "client") {
    return {
      eyebrow: "Moonforge Digital",
      title: "Portal del cliente",
    };
  }

  return {
    eyebrow: "Moonforge Digital",
    title: "Panel principal",
  };
}

function DashboardLayout() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const navigationItems = getNavigationByRole(currentUser?.role);
  const mobileHeader = getMobileHeaderByRole(currentUser?.role);

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="panel-shell items-start">
      <aside className="sidebar-shell sticky top-0 h-screen overflow-y-auto">
        <div className="flex min-h-screen flex-col p-6">
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
              Moonforge Digital
            </p>
            <h2 className="text-lg font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Panel principal
            </h2>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? "sidebar-nav-link-active" : ""}`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-6">
            <div className="card-base p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                    {currentUser?.name || currentUser?.email || "Usuario autenticado"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    {getRoleLabel(currentUser?.role)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <ThemeToggleButton />

                  <button
                    type="button"
                    className="icon-button shrink-0"
                    onClick={handleLogout}
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                  >
                    <LogoutIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="topbar-shell">
          <div className="container-app flex min-h-[72px] items-center justify-between gap-4 py-4">
            <div className="lg:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-[#888888]">
                {mobileHeader.eyebrow}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-[#E0E0E0]">
                {mobileHeader.title}
              </p>
            </div>

            <div className="lg:hidden">
              <ThemeToggleButton />
            </div>
          </div>
        </header>

        <main className="container-app py-6 pb-32 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav currentUser={currentUser} onLogout={handleLogout} />
      <BackToTopButton />
    </div>
  );
}

export default DashboardLayout;
