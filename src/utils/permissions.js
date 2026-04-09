/**
 * Centralized role and permission helpers.
 */

export const ROLE_LABELS = {
  admin: "Administrador",
  agent: "Agente",
  client: "Cliente",
};

export const ROLE_PERMISSIONS = {
  admin: [
    "admin.dashboard.view",
    "tickets.read",
    "tickets.create",
    "tickets.reply",
    "tickets.update",
    "tickets.assign",
    "tickets.close",
    "clients.read",
    "clients.create",
    "clients.update",
    "clients.delete",
    "systems.read",
    "systems.create",
    "systems.update",
    "systems.delete",
    "clientAccess.manage",
    "quotes.read",
    "quotes.create",
    "quotes.update",
    "quotes.export",
    "quotes.delete",
    "quotes.lineItems.delete",
    "technicalReports.read",
    "technicalReports.create",
    "technicalReports.update",
    "technicalReports.delete",
    "catalog.read",
    "catalog.create",
    "catalog.update",
    "catalog.resetBase",
    "users.manage",
    "roles.manage",
  ],
  agent: [
    "admin.dashboard.view",
    "tickets.read",
    "tickets.create",
    "tickets.reply",
    "tickets.update",
    "tickets.assign",
    "tickets.close",
    "clients.read",
    "clients.create",
    "clients.update",
    "systems.read",
    "systems.create",
    "systems.update",
    "quotes.read",
    "quotes.create",
    "quotes.update",
    "quotes.export",
    "technicalReports.read",
    "technicalReports.create",
    "technicalReports.update",
    "catalog.read",
    "catalog.create",
    "catalog.update",
  ],
  client: [
    "client.dashboard.view",
    "client.profile.view",
    "client.profile.update",
    "tickets.read.own",
    "tickets.create.own",
    "tickets.reply.own",
    "systems.read.own",
    "quotes.read.own",
    "technicalReports.read.own",
  ],
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || "Usuario";
}

export function hasPermission(role, permission) {
  if (!role || !permission) {
    return false;
  }

  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

export function isAdminRole(role) {
  return role === "admin";
}

export function isAgentRole(role) {
  return role === "agent";
}

export function isClientRole(role) {
  return role === "client";
}

export function isStaffRole(role) {
  return role === "admin" || role === "agent";
}
