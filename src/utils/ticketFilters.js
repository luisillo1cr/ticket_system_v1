/**
 * Ticket filtering helpers.
 */

export function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function filterTickets(tickets, filters = {}) {
  const search = normalizeSearchText(filters.search);
  const status = String(filters.status ?? "all");
  const priority = String(filters.priority ?? "all");
  const category = String(filters.category ?? "all");

  return tickets.filter((ticket) => {
    const matchesSearch =
      !search ||
      [
        ticket.ticketNumber,
        ticket.subject,
        ticket.clientId,
        ticket.systemId,
        ticket.category,
        ticket.createdByName,
        ticket.assignedToName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));

    const matchesStatus = status === "all" || ticket.status === status;
    const matchesPriority = priority === "all" || ticket.priority === priority;
    const matchesCategory = category === "all" || ticket.category === category;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });
}