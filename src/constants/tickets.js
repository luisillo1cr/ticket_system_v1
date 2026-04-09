/**
 * Ticket domain constants.
 */

export const TICKET_STATUS_LABELS = {
  open: "Abierto",
  in_review: "En revisión",
  waiting_client: "Esperando cliente",
  resolved: "Resuelto",
  closed_resolved: "Cerrado y resuelto",
  closed: "Cerrado",
};

export const TICKET_PRIORITY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const TICKET_CATEGORY_LABELS = {
  general: "General",
  access: "Acceso",
  billing: "Facturación",
  technical: "Técnico",
  bug: "Error",
  request: "Solicitud",
};

export const TICKET_STATUSES = Object.keys(TICKET_STATUS_LABELS);
export const TICKET_PRIORITIES = Object.keys(TICKET_PRIORITY_LABELS);
export const TICKET_CATEGORIES = Object.keys(TICKET_CATEGORY_LABELS);
export const AUTO_CLOSE_RESOLVED_AFTER_DAYS = 7;
