import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES, buildClientTicketDetailRoute } from "../constants/routes";
import { subscribeClientTickets } from "../services/ticketService";
import { useAuth } from "../hooks/useAuth";
import { filterTickets } from "../utils/ticketFilters";

const TOKENS = {
  surface: "var(--app-surface)",
  surfaceMuted: "var(--app-surface-muted)",
  border: "var(--app-border)",
  text: "var(--app-text)",
  textMuted: "var(--app-text-muted)",
};

const ui = {
  panel: { backgroundColor: TOKENS.surface, borderColor: TOKENS.border, color: TOKENS.text },
  muted: { backgroundColor: TOKENS.surfaceMuted, borderColor: TOKENS.border, color: TOKENS.text },
  input: { backgroundColor: TOKENS.surfaceMuted, borderColor: TOKENS.border, color: TOKENS.text },
  text: { color: TOKENS.text },
  textMuted: { color: TOKENS.textMuted },
};

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

const CATEGORY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "technical", label: "Técnica" },
  { value: "billing", label: "Facturación" },
  { value: "request", label: "Solicitud" },
  { value: "access", label: "Acceso" },
  { value: "other", label: "Otra" },
];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
        style={ui.textMuted}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por ticket, asunto o sistema"
        className="h-10 w-full rounded-md border pl-10 pr-3 text-sm outline-none transition"
        style={ui.input}
      />
    </div>
  );
}

function FilterSelect({ value, onChange, options, name }) {
  return (
    <select
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.name, event.target.value)}
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

function DesktopTable({ tickets }) {
  return (
    <div className="hidden overflow-hidden rounded-lg border lg:block" style={ui.panel}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead style={ui.muted}>
            <tr>
              {['Ticket', 'Asunto', 'Sistema', 'Estado', 'Prioridad', 'Actualizado'].map((label) => (
                <th key={label} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]" style={ui.textMuted}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket, index) => (
              <tr key={ticket.id} style={{ borderTop: index === 0 ? 'none' : `1px solid ${TOKENS.border}` }}>
                <td className="px-4 py-3 align-top">
                  <Link to={buildClientTicketDetailRoute(ticket.id)} className="text-sm font-semibold hover:underline" style={ui.text}>
                    {ticket.ticketNumber || ticket.id}
                  </Link>
                  <div className="mt-1 text-xs" style={ui.textMuted}>{ticket.clientId || 'Mi cuenta'}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="max-w-[360px] text-sm font-medium" style={ui.text}>{ticket.subject || 'Sin asunto'}</div>
                  <div className="mt-1 text-xs" style={ui.textMuted}>{ticket.category || 'Sin categoría'}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="text-sm" style={ui.text}>{ticket.systemId || 'Sin sistema'}</div>
                  <div className="mt-1 text-xs" style={ui.textMuted}>{ticket.assignedToName || 'Sin asignar'}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClass(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getPriorityBadgeClass(ticket.priority)}`}>
                    {getPriorityLabel(ticket.priority)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="text-sm" style={ui.text}>{formatDateTime(ticket.updatedAt || ticket.lastMessageAt || ticket.createdAt)}</div>
                  <div className="mt-1 text-xs" style={ui.textMuted}>Creado {formatDateTime(ticket.createdAt)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileCards({ tickets }) {
  return (
    <div className="space-y-3 lg:hidden">
      {tickets.map((ticket) => (
        <Link key={ticket.id} to={buildClientTicketDetailRoute(ticket.id)} className="block rounded-lg border px-4 py-4 shadow-sm transition hover:shadow-md" style={ui.panel}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={ui.text}>{ticket.ticketNumber || ticket.id}</div>
              <div className="mt-1 text-sm font-medium" style={ui.text}>{ticket.subject || 'Sin asunto'}</div>
            </div>
            <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClass(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getPriorityBadgeClass(ticket.priority)}`}>
              {getPriorityLabel(ticket.priority)}
            </span>
            <span className="rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={ui.muted}>{ticket.category || 'Sin categoría'}</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={ui.textMuted}>Sistema</p>
              <p className="mt-1 text-sm" style={ui.text}>{ticket.systemId || 'Sin sistema'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={ui.textMuted}>Actualizado</p>
              <p className="mt-1 text-sm" style={ui.text}>{formatDateTime(ticket.updatedAt || ticket.lastMessageAt || ticket.createdAt)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ClientTicketsPage() {
  const { currentUser } = useAuth();
  const hasClientScope = Boolean(currentUser?.clientId);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    category: "all",
  });

  useEffect(() => {
    if (!hasClientScope) return;

    const unsubscribe = subscribeClientTickets(
      currentUser.clientId,
      (data) => {
        setTickets(data);
        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar sus tickets.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [hasClientScope, currentUser?.clientId]);

  const filteredTickets = useMemo(() => filterTickets(tickets, filters), [tickets, filters]);
  const isLoading = hasClientScope ? loading : false;

  const summary = useMemo(() => ({
    total: filteredTickets.length,
    open: filteredTickets.filter((item) => normalizeText(item.status).toLowerCase() === 'open').length,
    review: filteredTickets.filter((item) => normalizeText(item.status).toLowerCase() === 'in_review').length,
    pending: filteredTickets.filter((item) => normalizeText(item.status).toLowerCase() === 'pending_client').length,
  }), [filteredTickets]);

  function handleFilterChange(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleResetFilters() {
    setFilters({ search: '', status: 'all', priority: 'all', category: 'all' });
  }

  return (
    <section className="space-y-4">
      <section className="rounded-lg border px-4 py-4 shadow-sm" style={ui.panel}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={ui.textMuted}>Mis tickets</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={ui.text}>Historial de soporte</h1>
              <p className="mt-2 text-sm" style={ui.textMuted}>Consulte el estado de sus solicitudes y abra el detalle cuando necesite responder.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleResetFilters} className="rounded-md border px-4 py-2.5 text-sm font-medium transition" style={ui.input}>Limpiar filtros</button>
              <Link to={ROUTES.CLIENT_TICKETS_NEW} className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">Solicitar asistencia</Link>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <SearchInput value={filters.search} onChange={(value) => handleFilterChange('search', value)} />
            <FilterSelect name="status" value={filters.status} onChange={handleFilterChange} options={STATUS_OPTIONS} />
            <FilterSelect name="priority" value={filters.priority} onChange={handleFilterChange} options={PRIORITY_OPTIONS} />
            <FilterSelect name="category" value={filters.category} onChange={handleFilterChange} options={CATEGORY_OPTIONS} />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={ui.muted}>Total {summary.total}</span>
            <span className="rounded px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Abiertos {summary.open}</span>
            <span className="rounded px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">En revisión {summary.review}</span>
            <span className="rounded px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">Esperando cliente {summary.pending}</span>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-lg border px-4 py-10 shadow-sm" style={ui.panel}>
          <p className="text-sm" style={ui.textMuted}>Cargando tickets...</p>
        </section>
      ) : errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{errorMessage}</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-lg border px-5 py-8 text-center" style={ui.muted}>
          <h3 className="text-lg font-semibold" style={ui.text}>No tiene tickets registrados</h3>
          <p className="mt-2 text-sm" style={ui.textMuted}>Cuando necesite ayuda, puede crear su primer ticket desde este portal.</p>
          <div className="mt-5">
            <Link to={ROUTES.CLIENT_TICKETS_NEW} className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">Crear ticket</Link>
          </div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-lg border px-5 py-8 text-center" style={ui.muted}>
          <h3 className="text-lg font-semibold" style={ui.text}>No hay resultados</h3>
          <p className="mt-2 text-sm" style={ui.textMuted}>Ajuste la búsqueda o los filtros para encontrar tickets.</p>
        </div>
      ) : (
        <>
          <DesktopTable tickets={filteredTickets} />
          <MobileCards tickets={filteredTickets} />
        </>
      )}
    </section>
  );
}

export default ClientTicketsPage;
