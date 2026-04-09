/**
 * Mobile-only bottom navigation.
 *
 * Admin: Inicio, Tickets, Clientes, Fichas y panel "Más".
 * Client: Inicio, Tickets, Perfil y panel "Más".
 *
 * The client no longer shows a redundant "Nuevo" tab. The create-ticket route
 * is considered part of the tickets section and the quick sheet stays focused
 * on secondary actions only.
 */

import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import ThemeToggleButton from "../shared/ThemeToggleButton";

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

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h.01M12 12h.01M19.5 12h.01" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25v13.5M5.25 12h13.5" />
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

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75 15 12l-6 5.25" />
    </svg>
  );
}

function isPathActive(pathname, matchPrefixes = [], exact = false) {
  if (matchPrefixes.length === 0) {
    return false;
  }

  return matchPrefixes.some((prefix) => {
    if (exact) {
      return pathname === prefix;
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function getRoleLabel(role) {
  if (role === "admin") return "Administrador";
  if (role === "client") return "Cliente";
  return "Usuario";
}

function getMobileNavigationConfig(role) {
  if (role === "admin") {
    return {
      primaryItems: [
        {
          key: "dashboard",
          label: "Inicio",
          to: ROUTES.ADMIN_DASHBOARD,
          icon: <DashboardIcon />,
          matchPrefixes: [ROUTES.ADMIN_DASHBOARD],
          exact: true,
        },
        {
          key: "tickets",
          label: "Tickets",
          to: ROUTES.ADMIN_TICKETS,
          icon: <TicketIcon />,
          matchPrefixes: [ROUTES.ADMIN_TICKETS],
        },
        {
          key: "clients",
          label: "Clientes",
          to: ROUTES.ADMIN_CLIENTS,
          icon: <ClientsIcon />,
          matchPrefixes: [ROUTES.ADMIN_CLIENTS],
        },
        {
          key: "technicalReports",
          label: "Fichas",
          to: ROUTES.ADMIN_TECHNICAL_REPORTS,
          icon: <FileIcon />,
          matchPrefixes: [ROUTES.ADMIN_TECHNICAL_REPORTS],
        },
      ],
      moreMatchPrefixes: [ROUTES.ADMIN_QUOTES, ROUTES.ADMIN_CATALOG],
      quickLinks: [
        {
          key: "quotes",
          label: "Cotizaciones",
          description: "Listado, detalle y nuevas proformas.",
          to: ROUTES.ADMIN_QUOTES,
          icon: <QuoteIcon />,
        },
        {
          key: "catalog",
          label: "Catálogo técnico",
          description: "Síntomas, diagnósticos, procedimientos y materiales.",
          to: ROUTES.ADMIN_CATALOG,
          icon: <DatabaseIcon />,
        },
        {
          key: "newTicket",
          label: "Nuevo ticket",
          description: "Registrar una solicitud de soporte manual.",
          to: ROUTES.ADMIN_TICKETS_NEW,
          icon: <TicketIcon />,
        },
        {
          key: "newTechnicalReport",
          label: "Nueva ficha técnica",
          description: "Crear un diagnóstico o intervención técnica.",
          to: ROUTES.ADMIN_TECHNICAL_REPORTS_NEW,
          icon: <FileIcon />,
        },
        {
          key: "newQuote",
          label: "Nueva cotización",
          description: "Crear una nueva proforma desde cero.",
          to: ROUTES.ADMIN_QUOTES_NEW,
          icon: <PlusIcon />,
        },
      ],
    };
  }

  if (role === "client") {
    return {
      primaryItems: [
        {
          key: "dashboard",
          label: "Inicio",
          to: ROUTES.CLIENT_DASHBOARD,
          icon: <DashboardIcon />,
          matchPrefixes: [ROUTES.CLIENT_DASHBOARD],
          exact: true,
        },
        {
          key: "tickets",
          label: "Tickets",
          to: ROUTES.CLIENT_TICKETS,
          icon: <TicketIcon />,
          matchPrefixes: [ROUTES.CLIENT_TICKETS],
        },
        {
          key: "profile",
          label: "Perfil",
          to: ROUTES.CLIENT_PROFILE,
          icon: <ProfileIcon />,
          matchPrefixes: [ROUTES.CLIENT_PROFILE],
          exact: true,
        },
      ],
      moreMatchPrefixes: [],
      quickLinks: [],
    };
  }

  return {
    primaryItems: [],
    moreMatchPrefixes: [],
    quickLinks: [],
  };
}

function SheetLinkButton({ item, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.to)}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#1A1A1A] dark:hover:border-[#5A5A5A] dark:hover:bg-[#202020]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-[#444444] dark:bg-[#121212] dark:text-[#E0E0E0]">
        {item.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-[#E0E0E0]">
          {item.label}
        </span>
        <span className="mt-1 block text-xs text-slate-500 dark:text-[#B0B0B0]">
          {item.description}
        </span>
      </span>

      <span className="shrink-0 text-slate-400 dark:text-[#888888]">
        <ArrowRightIcon />
      </span>
    </button>
  );
}

function MobileBottomNav({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navigation = useMemo(
    () => getMobileNavigationConfig(currentUser?.role),
    [currentUser?.role]
  );

  if (!currentUser?.role || navigation.primaryItems.length === 0) {
    return null;
  }

  const moreIsActive = isPathActive(location.pathname, navigation.moreMatchPrefixes);

  const handleNavigate = (to) => {
    navigate(to);
    setIsMoreOpen(false);
  };

  return (
    <>
      {isMoreOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[3px] lg:hidden"
          onClick={() => setIsMoreOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {isMoreOpen ? (
        <div
          className="fixed inset-x-0 z-50 px-4 lg:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 7.25rem)" }}
        >
          <div className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-[#444444] dark:bg-[#121212] dark:shadow-[0_30px_80px_rgba(2,8,23,0.7)]">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-[#444444]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-[#888888]">
                Accesos rápidos
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">
                    {currentUser?.name || currentUser?.email || "Usuario autenticado"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-[#888888]">
                    {getRoleLabel(currentUser?.role)}
                  </p>
                </div>

                <ThemeToggleButton />
              </div>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
              {navigation.quickLinks.length > 0 ? (
                <div className="space-y-3">
                  {navigation.quickLinks.map((item) => (
                    <SheetLinkButton key={item.key} item={item} onClick={handleNavigate} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-[#444444] dark:text-[#B0B0B0]">
                  Desde aquí puedes cambiar el tema o cerrar sesión.
                </div>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-rose-700 transition-all duration-300 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-[#2A1418] dark:text-[#FCA5A5] dark:hover:bg-[#33181D]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-white dark:border-rose-500/25 dark:bg-[#121212]">
                  <LogoutIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Cerrar sesión</span>
                  <span className="mt-1 block text-xs opacity-80">
                    Finalizar sesión en este dispositivo.
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="fixed inset-x-0 bottom-0 z-50 px-4 lg:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        <div className="mx-auto w-full max-w-md rounded-[30px] border border-slate-200/90 bg-white/95 p-2 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-[#444444] dark:bg-[#121212]/95 dark:shadow-[0_24px_70px_rgba(2,8,23,0.72)]">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${navigation.primaryItems.length + 1}, minmax(0, 1fr))` }}
          >
            {navigation.primaryItems.map((item) => {
              const isActive = isPathActive(location.pathname, item.matchPrefixes, item.exact);

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigate(item.to)}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2.5 text-[11px] font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-[#2563EB] dark:text-white dark:shadow-[0_16px_32px_rgba(37,99,235,0.35)]"
                      : "text-slate-500 hover:bg-slate-100/90 dark:text-[#B0B0B0] dark:hover:bg-[#1E1E1E]"
                  }`}
                  aria-label={item.label}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsMoreOpen((previousState) => !previousState)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2.5 text-[11px] font-medium transition-all duration-300 ${
                isMoreOpen || moreIsActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-[#2563EB] dark:text-white dark:shadow-[0_16px_32px_rgba(37,99,235,0.35)]"
                  : "text-slate-500 hover:bg-slate-100/90 dark:text-[#B0B0B0] dark:hover:bg-[#1E1E1E]"
              }`}
              aria-label="Más opciones"
              aria-expanded={isMoreOpen}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl">
                <MoreIcon />
              </span>
              <span className="truncate">Más</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileBottomNav;
