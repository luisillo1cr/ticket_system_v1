/**
 * Centralized role and permission helpers.
 *
 * This file is intentionally a bit broader than the current UI usage so that
 * AuthProvider, router guards and page-level checks can import from one place
 * without breaking when a new helper is referenced.
 */

export const ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  CLIENT: 'client',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.AGENT]: 'Agente',
  [ROLES.CLIENT]: 'Cliente',
};

export const PERMISSIONS = {
  DASHBOARD_ADMIN_VIEW: 'dashboard.admin.view',
  DASHBOARD_CLIENT_VIEW: 'dashboard.client.view',

  TICKETS_VIEW: 'tickets.view',
  TICKETS_CREATE: 'tickets.create',
  TICKETS_UPDATE: 'tickets.update',
  TICKETS_ASSIGN: 'tickets.assign',
  TICKETS_CLOSE: 'tickets.close',
  TICKETS_DELETE: 'tickets.delete',

  CLIENTS_VIEW: 'clients.view',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_UPDATE: 'clients.update',
  CLIENTS_DELETE: 'clients.delete',
  CLIENT_ACCESS_MANAGE: 'clients.access.manage',

  SYSTEMS_VIEW: 'systems.view',
  SYSTEMS_CREATE: 'systems.create',
  SYSTEMS_UPDATE: 'systems.update',
  SYSTEMS_DELETE: 'systems.delete',

  TECHNICAL_REPORTS_VIEW: 'technicalReports.view',
  TECHNICAL_REPORTS_CREATE: 'technicalReports.create',
  TECHNICAL_REPORTS_UPDATE: 'technicalReports.update',
  TECHNICAL_REPORTS_DELETE: 'technicalReports.delete',

  QUOTES_VIEW: 'quotes.view',
  QUOTES_CREATE: 'quotes.create',
  QUOTES_UPDATE: 'quotes.update',
  QUOTES_DELETE: 'quotes.delete',
  QUOTE_LINE_ITEMS_DELETE: 'quotes.lineItems.delete',
  QUOTES_EXPORT: 'quotes.export',

  CATALOG_VIEW: 'catalog.view',
  CATALOG_CREATE: 'catalog.create',
  CATALOG_UPDATE: 'catalog.update',
  CATALOG_DELETE: 'catalog.delete',
  CATALOG_RESET: 'catalog.reset',

  INTERNAL_USERS_VIEW: 'internalUsers.view',
  INTERNAL_USERS_CREATE: 'internalUsers.create',
  INTERNAL_USERS_UPDATE: 'internalUsers.update',
  INTERNAL_USERS_DELETE: 'internalUsers.delete',
  INTERNAL_USERS_ROLE_MANAGE: 'internalUsers.role.manage',

  CLIENT_PROFILE_VIEW: 'clientProfile.view',
  CLIENT_PROFILE_UPDATE: 'clientProfile.update',
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: new Set(Object.values(PERMISSIONS)),
  [ROLES.AGENT]: new Set([
    PERMISSIONS.DASHBOARD_ADMIN_VIEW,
    PERMISSIONS.TICKETS_VIEW,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.TICKETS_ASSIGN,
    PERMISSIONS.TICKETS_CLOSE,
    PERMISSIONS.CLIENTS_VIEW,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.SYSTEMS_VIEW,
    PERMISSIONS.SYSTEMS_CREATE,
    PERMISSIONS.SYSTEMS_UPDATE,
    PERMISSIONS.TECHNICAL_REPORTS_VIEW,
    PERMISSIONS.TECHNICAL_REPORTS_CREATE,
    PERMISSIONS.TECHNICAL_REPORTS_UPDATE,
    PERMISSIONS.QUOTES_VIEW,
    PERMISSIONS.QUOTES_CREATE,
    PERMISSIONS.QUOTES_UPDATE,
    PERMISSIONS.QUOTES_EXPORT,
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.CATALOG_CREATE,
    PERMISSIONS.CATALOG_UPDATE,
  ]),
  [ROLES.CLIENT]: new Set([
    PERMISSIONS.DASHBOARD_CLIENT_VIEW,
    PERMISSIONS.TICKETS_VIEW,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.CLIENT_PROFILE_VIEW,
    PERMISSIONS.CLIENT_PROFILE_UPDATE,
    PERMISSIONS.SYSTEMS_VIEW,
    PERMISSIONS.TECHNICAL_REPORTS_VIEW,
    PERMISSIONS.QUOTES_VIEW,
  ]),
};

export function getRoleValue(input) {
  if (typeof input === 'string') {
    return input.trim();
  }

  return String(input?.role || '').trim();
}

export function getRoleLabel(input) {
  const role = getRoleValue(input);
  return ROLE_LABELS[role] || 'Sin rol';
}

export function isAdminRole(input) {
  return getRoleValue(input) === ROLES.ADMIN;
}

export function isAgentRole(input) {
  return getRoleValue(input) === ROLES.AGENT;
}

export function isClientRole(input) {
  return getRoleValue(input) === ROLES.CLIENT;
}

export function isStaffRole(input) {
  const role = getRoleValue(input);
  return role === ROLES.ADMIN || role === ROLES.AGENT;
}

export function getPermissionsForRole(input) {
  const role = getRoleValue(input);
  return ROLE_PERMISSIONS[role] || new Set();
}

export function hasPermission(input, permission) {
  if (!permission) {
    return false;
  }

  return getPermissionsForRole(input).has(permission);
}

export function hasAnyPermission(input, permissions = []) {
  return permissions.some((permission) => hasPermission(input, permission));
}

export function hasAllPermissions(input, permissions = []) {
  return permissions.every((permission) => hasPermission(input, permission));
}

export function canManageInternalUsers(input) {
  return hasPermission(input, PERMISSIONS.INTERNAL_USERS_VIEW);
}

export function canManageClientAccess(input) {
  return hasPermission(input, PERMISSIONS.CLIENT_ACCESS_MANAGE);
}

export function canDeleteClients(input) {
  return hasPermission(input, PERMISSIONS.CLIENTS_DELETE);
}

export function canDeleteSystems(input) {
  return hasPermission(input, PERMISSIONS.SYSTEMS_DELETE);
}

export function canResetServiceCatalog(input) {
  return hasPermission(input, PERMISSIONS.CATALOG_RESET);
}

export function canDeleteCatalogItems(input) {
  return hasPermission(input, PERMISSIONS.CATALOG_DELETE);
}

export function canDeleteTechnicalReports(input) {
  return hasPermission(input, PERMISSIONS.TECHNICAL_REPORTS_DELETE);
}

export function canDeleteQuoteLineItems(input) {
  return hasPermission(input, PERMISSIONS.QUOTE_LINE_ITEMS_DELETE);
}

export function canDeleteQuotes(input) {
  return hasPermission(input, PERMISSIONS.QUOTES_DELETE);
}

export function canDeleteTickets(input) {
  return hasPermission(input, PERMISSIONS.TICKETS_DELETE);
}

export function canViewAdminDashboard(input) {
  return hasPermission(input, PERMISSIONS.DASHBOARD_ADMIN_VIEW);
}

export function canViewClientDashboard(input) {
  return hasPermission(input, PERMISSIONS.DASHBOARD_CLIENT_VIEW);
}

export function canViewClientProfile(input) {
  return hasPermission(input, PERMISSIONS.CLIENT_PROFILE_VIEW);
}

export function canUpdateClientProfile(input) {
  return hasPermission(input, PERMISSIONS.CLIENT_PROFILE_UPDATE);
}

export default {
  ROLES,
  ROLE_LABELS,
  PERMISSIONS,
  getRoleValue,
  getRoleLabel,
  isAdminRole,
  isAgentRole,
  isClientRole,
  isStaffRole,
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canManageInternalUsers,
  canManageClientAccess,
  canDeleteClients,
  canDeleteSystems,
  canResetServiceCatalog,
  canDeleteCatalogItems,
  canDeleteTechnicalReports,
  canDeleteQuoteLineItems,
  canDeleteQuotes,
  canDeleteTickets,
  canViewAdminDashboard,
  canViewClientDashboard,
  canViewClientProfile,
  canUpdateClientProfile,
};
