/**
 * Centralized route constants.
 */

export const ROUTES = {
  ROOT: "/",
  LOGIN: "/login",
  APP: "/app",

  ADMIN_DASHBOARD: "/app/admin/dashboard",
  ADMIN_TICKETS: "/app/admin/tickets",
  ADMIN_TICKETS_NEW: "/app/admin/tickets/new",
  ADMIN_CLIENTS: "/app/admin/clients",
  ADMIN_USERS: "/app/admin/users",
  ADMIN_QUOTES: "/app/admin/quotes",
  ADMIN_QUOTES_NEW: "/app/admin/quotes/new",
  ADMIN_TECHNICAL_REPORTS: "/app/admin/technical-reports",
  ADMIN_TECHNICAL_REPORTS_NEW: "/app/admin/technical-reports/new",
  ADMIN_CATALOG: "/app/admin/catalog",

  CLIENT_DASHBOARD: "/app/client/dashboard",
  CLIENT_TICKETS: "/app/client/tickets",
  CLIENT_TICKETS_NEW: "/app/client/tickets/new",
  CLIENT_PROFILE: "/app/client/profile",

  UNAUTHORIZED: "/unauthorized",
};

export function buildAdminTicketDetailRoute(ticketId) {
  return `/app/admin/tickets/${ticketId}`;
}

export function buildClientTicketDetailRoute(ticketId) {
  return `/app/client/tickets/${ticketId}`;
}

export function buildAdminTechnicalReportDetailRoute(reportId) {
  return `/app/admin/technical-reports/${reportId}`;
}

export function buildAdminQuoteDetailRoute(quoteId) {
  return `/app/admin/quotes/${quoteId}`;
}
