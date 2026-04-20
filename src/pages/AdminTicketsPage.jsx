import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import {
  ROUTES,
  buildAdminTicketDetailRoute,
} from "../constants/routes";

const TOKENS = {
  bg: "var(--app-bg)",
  surface: "var(--app-surface)",
  surfaceMuted: "var(--app-surface-muted)",
  border: "var(--app-border)",
  text: "var(--app-text)",
  textMuted: "var(--app-text-muted)",
};

const ui = {
  panel: {
    backgroundColor: TOKENS.surface,
    borderColor: TOKENS.border,
    color: TOKENS.text,
  },
  surfaceMuted: {
    backgroundColor: TOKENS.surfaceMuted,
    borderColor: TOKENS.border,
    color: TOKENS.text,
  },
  input: {
    backgroundColor: TOKENS.surfaceMuted,
    borderColor: TOKENS.border,
    color: TOKENS.text,
  },
  text: {
    color: TOKENS.text,
  },
  mutedText: {
    color: TOKENS.textMuted,
  },
};

const JIRA_PILL_BASE =
  "inline-flex items-center rounded-[4px] px-1.5 py-[2px] text-[10px] font-semibold uppercase tracking-[0.12em] leading-none whitespace-nowrap";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En progreso" },
  { value: "in_review", label: "En revisión" },
  { value: "pending_client", label: "Esperando cliente" },
  { value: "resolved", label: "Resuelto" },
  { value: "closed", label: "Cerrado" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "task", label: "Task" },
  { value: "request", label: "Request" },
  { value: "incident", label: "Incidente" },
  { value: "problem", label: "Problema" },
  { value: "subtask", label: "Child ticket" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "soporte", label: "Soporte" },
  { value: "bug", label: "Bug" },
  { value: "acceso", label: "Acceso" },
  { value: "facturacion", label: "Facturación" },
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "red", label: "Red" },
  { value: "otros", label: "Otros" },
];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value) {
  if (!value) return "Sin fecha";

  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);

    return new Intl.DateTimeFormat("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "Sin fecha";
  }
}

function getStatusLabel(status) {
  const normalized = normalizeText(status).toLowerCase();

  const map = {
    open: "Abierto",
    in_progress: "En progreso",
    in_review: "En revisión",
    pending_client: "Esperando cliente",
    resolved: "Resuelto",
    closed: "Cerrado",
  };

  return map[normalized] || normalized || "Sin estado";
}

function getPriorityLabel(priority) {
  const normalized = normalizeText(priority).toLowerCase();

  const map = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente",
  };

  return map[normalized] || normalized || "Media";
}

function getTypeLabel(type) {
  const normalized = normalizeText(type).toLowerCase();

  const map = {
    task: "Task",
    request: "Request",
    incident: "Incidente",
    problem: "Problema",
    subtask: "Child ticket",
  };

  return map[normalized] || "Task";
}

function getCategoryLabel(category) {
  const normalized = normalizeText(category).toLowerCase();

  const map = {
    soporte: "Soporte",
    bug: "Bug",
    acceso: "Acceso",
    facturacion: "Facturación",
    hardware: "Hardware",
    software: "Software",
    red: "Red",
    otros: "Otros",
  };

  return map[normalized] || (normalized ? normalized : "Sin categoría");
}

function getStatusBadgeClass(status) {
  const normalized = normalizeText(status).toLowerCase();

  const map = {
    open: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    in_review: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    pending_client: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    closed: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return map[normalized] || map.open;
}

function getPriorityBadgeClass(priority) {
  const normalized = normalizeText(priority).toLowerCase();

  const map = {
    low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    medium: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    high: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    urgent: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  };

  return map[normalized] || map.medium;
}

function SearchInput({ value, onChange }) {
  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        style={ui.mutedText}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        />
      </svg>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por ticket, asunto, cliente, sistema, creador o asignado"
        className="h-10 w-full rounded-md border pl-10 pr-3 text-sm outline-none transition"
        style={ui.input}
      />
    </div>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border px-3 text-sm outline-none transition"
      style={ui.input}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="rounded-lg border px-5 py-8 text-center" style={ui.surfaceMuted}>
      <h3 className="text-lg font-semibold" style={ui.text}>
        No hay tickets registrados
      </h3>
      <p className="mt-2 text-sm" style={ui.mutedText}>
        Ajusta los filtros o crea el primer ticket del sistema.
      </p>

      <div className="mt-5">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          Crear ticket
        </button>
      </div>
    </div>
  );
}

function DesktopTable({ tickets, onOpenTicket }) {
  return (
    <div className="hidden overflow-hidden rounded-lg border lg:block" style={ui.panel}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead style={ui.surfaceMuted}>
            <tr>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Tipo
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Ticket
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Asunto
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Cliente
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Asignado
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Estado
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Prioridad
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Actualizado
              </th>
            </tr>
          </thead>

          <tbody>
            {tickets.map((ticket, index) => (
              <tr
                key={ticket.id}
                onClick={() => onOpenTicket(ticket.id)}
                className="cursor-pointer transition hover:bg-black/5 dark:hover:bg-white/[0.03]"
                style={{
                  borderTop: index === 0 ? "none" : `1px solid ${TOKENS.border}`,
                }}
              >
                <td className="px-4 py-2.5 align-top">
                  <span className={JIRA_PILL_BASE} style={ui.surfaceMuted}>
                    {getTypeLabel(ticket.type)}
                  </span>
                </td>

                <td className="px-4 py-2.5 align-top">
                  <div className="text-sm font-semibold leading-5" style={ui.text}>
                    {ticket.ticketNumber || ticket.id?.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="mt-1 text-xs leading-5" style={ui.mutedText}>
                    {ticket.systemId || "Sin sistema"}
                  </div>
                </td>

                <td className="px-4 py-2.5 align-top">
                  <div className="max-w-[280px] text-sm font-semibold leading-5" style={ui.text}>
                    {ticket.subject || "Sin asunto"}
                  </div>
                  <div className="mt-1 text-xs leading-5" style={ui.mutedText}>
                    {getCategoryLabel(ticket.category)}
                  </div>
                </td>

                <td className="px-4 py-2.5 align-top">
                  <div className="text-sm leading-5" style={ui.text}>
                    {ticket.clientId || "Sin cliente"}
                  </div>
                  <div className="mt-1 text-xs leading-5" style={ui.mutedText}>
                    Creado por {ticket.createdByName || "Sin dato"}
                  </div>
                </td>

                <td className="px-4 py-2.5 align-top">
                  <div className="text-sm leading-5" style={ui.text}>
                    {ticket.assignedToName || "Sin asignar"}
                  </div>
                  <div className="mt-1 break-all text-xs leading-5" style={ui.mutedText}>
                    {ticket.assignedToUid || "—"}
                  </div>
                </td>

                <td className="px-4 py-2.5 align-top">
                  <span className={`${JIRA_PILL_BASE} ${getStatusBadgeClass(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                </td>

                <td className="px-4 py-2.5 align-top">
                  <span className={`${JIRA_PILL_BASE} ${getPriorityBadgeClass(ticket.priority)}`}>
                    {getPriorityLabel(ticket.priority)}
                  </span>
                </td>

                <td className="px-4 py-2.5 align-top">
                  <div className="text-sm leading-5" style={ui.text}>
                    {formatDate(ticket.updatedAt || ticket.lastMessageAt)}
                  </div>
                  <div className="mt-1 text-xs leading-5" style={ui.mutedText}>
                    Creado {formatDate(ticket.createdAt)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileList({ tickets, onOpenTicket }) {
  return (
    <div className="space-y-3 lg:hidden">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          onClick={() => onOpenTicket(ticket.id)}
          className="block w-full rounded-lg border px-4 py-4 text-left shadow-sm transition hover:shadow-md"
          style={ui.panel}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={ui.text}>
                {ticket.ticketNumber || ticket.id?.slice(0, 8).toUpperCase()}
              </div>
              <div className="mt-1 text-sm font-medium" style={ui.text}>
                {ticket.subject || "Sin asunto"}
              </div>
            </div>

            <span className={`${JIRA_PILL_BASE} ${getStatusBadgeClass(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className={JIRA_PILL_BASE} style={ui.surfaceMuted}>
              {getTypeLabel(ticket.type)}
            </span>

            <span className={`${JIRA_PILL_BASE} ${getPriorityBadgeClass(ticket.priority)}`}>
              {getPriorityLabel(ticket.priority)}
            </span>

            <span className={JIRA_PILL_BASE} style={ui.surfaceMuted}>
              {getCategoryLabel(ticket.category)}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Cliente
              </p>
              <p className="mt-1 text-sm" style={ui.text}>
                {ticket.clientId || "Sin cliente"}
              </p>
            </div>

            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Asignado
              </p>
              <p className="mt-1 text-sm" style={ui.text}>
                {ticket.assignedToName || "Sin asignar"}
              </p>
            </div>

            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Sistema
              </p>
              <p className="mt-1 text-sm" style={ui.text}>
                {ticket.systemId || "Sin sistema"}
              </p>
            </div>

            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={ui.mutedText}
              >
                Actualizado
              </p>
              <p className="mt-1 text-sm" style={ui.text}>
                {formatDate(ticket.updatedAt || ticket.lastMessageAt)}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function AdminTicketsPage() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const ticketsRef = collection(db, "tickets");

    const unsubscribe = onSnapshot(
      ticketsRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));

        items.sort(
          (a, b) =>
            getTimestampMs(b.updatedAt || b.lastMessageAt || b.createdAt) -
            getTimestampMs(a.updatedAt || a.lastMessageAt || a.createdAt)
        );

        setTickets(items);
        setLoading(false);
        setError("");
      },
      (snapshotError) => {
        console.error("Error loading tickets:", snapshotError);
        setError("No fue posible cargar los tickets.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = normalizeText(search).toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          ticket.ticketNumber,
          ticket.subject,
          ticket.clientId,
          ticket.systemId,
          ticket.createdByName,
          ticket.assignedToName,
          ticket.category,
          ticket.priority,
          ticket.status,
          ticket.type,
        ]
          .map((value) => normalizeText(value).toLowerCase())
          .join(" ")
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        normalizeText(ticket.status).toLowerCase() === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        normalizeText(ticket.priority).toLowerCase() === priorityFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        normalizeText(ticket.category).toLowerCase() === categoryFilter;

      const matchesType =
        typeFilter === "all" ||
        normalizeText(ticket.type || "task").toLowerCase() === typeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCategory &&
        matchesType
      );
    });
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter, typeFilter]);

  const summary = useMemo(() => {
    const total = filteredTickets.length;
    const openCount = filteredTickets.filter(
      (item) => normalizeText(item.status).toLowerCase() === "open"
    ).length;
    const reviewCount = filteredTickets.filter(
      (item) => normalizeText(item.status).toLowerCase() === "in_review"
    ).length;
    const pendingClientCount = filteredTickets.filter(
      (item) => normalizeText(item.status).toLowerCase() === "pending_client"
    ).length;

    return {
      total,
      openCount,
      reviewCount,
      pendingClientCount,
    };
  }, [filteredTickets]);

  function handleOpenTicket(ticketId) {
    navigate(buildAdminTicketDetailRoute(ticketId));
  }

  function handleCreateTicket() {
    navigate(ROUTES.ADMIN_TICKETS_NEW);
  }

  function handleResetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setTypeFilter("all");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border px-4 py-4 shadow-sm" style={ui.panel}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                style={ui.mutedText}
              >
                Tickets
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={ui.text}>
                Gestión de tickets
              </h1>

              <p className="mt-2 text-sm" style={ui.mutedText}>
                Vista operativa del módulo de tickets para administración y seguimiento.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-md border px-4 py-2.5 text-sm font-medium transition"
                style={ui.input}
              >
                Limpiar filtros
              </button>

              <button
                type="button"
                onClick={handleCreateTicket}
                className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Nuevo ticket
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
            <SearchInput value={search} onChange={setSearch} />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={PRIORITY_OPTIONS}
            />
            <FilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_OPTIONS}
            />
            <FilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={JIRA_PILL_BASE} style={ui.surfaceMuted}>
              Total {summary.total}
            </span>

            <span
              className={`${JIRA_PILL_BASE} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}
            >
              Abiertos {summary.openCount}
            </span>

            <span
              className={`${JIRA_PILL_BASE} bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300`}
            >
              En revisión {summary.reviewCount}
            </span>

            <span
              className={`${JIRA_PILL_BASE} bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300`}
            >
              Esperando cliente {summary.pendingClientCount}
            </span>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <section className="rounded-lg border px-4 py-10 shadow-sm" style={ui.panel}>
          <p className="text-sm" style={ui.mutedText}>
            Cargando tickets...
          </p>
        </section>
      ) : filteredTickets.length === 0 ? (
        <EmptyState onCreate={handleCreateTicket} />
      ) : (
        <>
          <MobileList tickets={filteredTickets} onOpenTicket={handleOpenTicket} />
          <DesktopTable tickets={filteredTickets} onOpenTicket={handleOpenTicket} />
        </>
      )}
    </div>
  );
}