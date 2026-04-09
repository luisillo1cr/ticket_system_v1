/**
 * Admin tickets listing page.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TicketPriorityBadge from "../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../components/tickets/TicketStatusBadge";
import TicketFiltersBar from "../components/tickets/TicketFiltersBar";
import {
  ROUTES,
  buildAdminTicketDetailRoute,
} from "../constants/routes";
import { autoCloseResolvedTickets, subscribeAdminTickets } from "../services/ticketService";
import { filterTickets } from "../utils/ticketFilters";

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function AdminTicketsPage() {
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
    autoCloseResolvedTickets().catch((error) => {
      console.error("Error auto-closing resolved tickets:", error);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAdminTickets(
      (data) => {
        setTickets(data);
        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar el listado de tickets.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredTickets = useMemo(
    () => filterTickets(tickets, filters),
    [tickets, filters]
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            Tickets
          </p>
          <h2 className="section-title">Gestión de tickets</h2>
          <p className="section-subtitle mt-2">
            Búsqueda y filtrado operativo del módulo de tickets.
          </p>
        </div>

        <div>
          <Link to={ROUTES.ADMIN_TICKETS_NEW} className="btn-primary">
            Nuevo ticket
          </Link>
        </div>
      </header>

      <TicketFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        searchPlaceholder="Buscar por ticket, asunto, cliente, sistema o responsable"
      />

      {!loading && !errorMessage ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition-colors duration-300 dark:border-[#444444] dark:bg-[#1A1A1A] dark:text-[#B0B0B0]">
          <span>
            Mostrando <strong>{filteredTickets.length}</strong> de <strong>{tickets.length}</strong>{" "}
            tickets
          </span>
        </div>
      ) : null}

      {loading ? (
        <article className="card-base p-6">
          <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
            Cargando tickets...
          </p>
        </article>
      ) : null}

      {!loading && errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </article>
      ) : null}

      {!loading && !errorMessage && tickets.length === 0 ? (
        <article className="card-base p-8">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            No hay tickets registrados
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            La colección <strong>tickets</strong> aún no tiene documentos para mostrar.
          </p>
          <div className="mt-5">
            <Link to={ROUTES.ADMIN_TICKETS_NEW} className="btn-primary">
              Crear primer ticket
            </Link>
          </div>
        </article>
      ) : null}

      {!loading && !errorMessage && tickets.length > 0 && filteredTickets.length === 0 ? (
        <article className="card-base p-8">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            No hay resultados
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Ajuste la búsqueda o los filtros para encontrar tickets.
          </p>
        </article>
      ) : null}

      {!loading && !errorMessage && filteredTickets.length > 0 ? (
        <>
          <div className="hidden lg:block">
            <div className="table-shell">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="table-head">
                    <th className="table-cell">Ticket</th>
                    <th className="table-cell">Asunto</th>
                    <th className="table-cell">Estado</th>
                    <th className="table-cell">Prioridad</th>
                    <th className="table-cell">Cliente</th>
                    <th className="table-cell">Creado</th>
                    <th className="table-cell text-right">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-t border-slate-200 transition-colors duration-300 dark:border-[#444444]"
                    >
                      <td className="table-cell font-medium text-slate-900 dark:text-[#E0E0E0]">
                        {ticket.ticketNumber || ticket.id}
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                            {ticket.subject || "Sin asunto"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                            {ticket.category || "Sin categoría"}
                          </p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <TicketStatusBadge status={ticket.status} />
                      </td>
                      <td className="table-cell">
                        <TicketPriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="table-cell">{ticket.clientId || "No asignado"}</td>
                      <td className="table-cell">{formatDateTime(ticket.createdAt)}</td>
                      <td className="table-cell text-right">
                        <Link
                          to={buildAdminTicketDetailRoute(ticket.id)}
                          className="btn-secondary px-3 py-2"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filteredTickets.map((ticket) => (
              <article key={ticket.id} className="card-base p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <TicketStatusBadge status={ticket.status} />
                  <TicketPriorityBadge priority={ticket.priority} />
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                  {ticket.subject || "Sin asunto"}
                </h3>

                <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                  {ticket.ticketNumber || ticket.id}
                </p>

                <div className="mt-4 space-y-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
                  <p>
                    <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                      Cliente:
                    </strong>{" "}
                    {ticket.clientId || "No asignado"}
                  </p>
                  <p>
                    <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                      Categoría:
                    </strong>{" "}
                    {ticket.category || "Sin categoría"}
                  </p>
                  <p>
                    <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                      Creado:
                    </strong>{" "}
                    {formatDateTime(ticket.createdAt)}
                  </p>
                </div>

                <div className="mt-5">
                  <Link
                    to={buildAdminTicketDetailRoute(ticket.id)}
                    className="btn-secondary w-full"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default AdminTicketsPage;