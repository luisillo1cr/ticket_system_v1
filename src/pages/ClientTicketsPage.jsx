/**
 * Client tickets listing page.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TicketPriorityBadge from "../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../components/tickets/TicketStatusBadge";
import TicketFiltersBar from "../components/tickets/TicketFiltersBar";
import { ROUTES, buildClientTicketDetailRoute } from "../constants/routes";
import { subscribeClientTickets } from "../services/ticketService";
import { useAuth } from "../hooks/useAuth";
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
    if (!hasClientScope) {
      return;
    }

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

  const isLoading = hasClientScope ? loading : false;

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
            Mis tickets
          </p>
          <h2 className="section-title">Historial de soporte</h2>
          <p className="section-subtitle mt-2">
            Búsqueda y filtrado de sus tickets de soporte.
          </p>
        </div>

        <div>
          <Link to={ROUTES.CLIENT_TICKETS_NEW} className="btn-primary">
            Solicitar asistencia
          </Link>
        </div>
      </header>

      <TicketFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        searchPlaceholder="Buscar por ticket, asunto o sistema"
      />

      {!isLoading && !errorMessage ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition-colors duration-300 dark:border-[#444444] dark:bg-[#1A1A1A] dark:text-[#B0B0B0]">
          <span>
            Mostrando <strong>{filteredTickets.length}</strong> de <strong>{tickets.length}</strong>{" "}
            tickets
          </span>
        </div>
      ) : null}

      {isLoading ? (
        <article className="card-base p-6">
          <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
            Cargando tickets...
          </p>
        </article>
      ) : null}

      {!isLoading && errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </article>
      ) : null}

      {!isLoading && !errorMessage && tickets.length === 0 ? (
        <article className="card-base p-8">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            No tiene tickets registrados
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Cuando necesite ayuda, puede crear su primer ticket desde este portal.
          </p>
          <div className="mt-5">
            <Link to={ROUTES.CLIENT_TICKETS_NEW} className="btn-primary">
              Crear ticket
            </Link>
          </div>
        </article>
      ) : null}

      {!isLoading && !errorMessage && tickets.length > 0 && filteredTickets.length === 0 ? (
        <article className="card-base p-8">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            No hay resultados
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Ajuste la búsqueda o los filtros para encontrar tickets.
          </p>
        </article>
      ) : null}

      {!isLoading && !errorMessage && filteredTickets.length > 0 ? (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => (
            <article key={ticket.id} className="card-base p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <TicketStatusBadge status={ticket.status} />
                    <TicketPriorityBadge priority={ticket.priority} />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                    {ticket.subject || "Sin asunto"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    {ticket.ticketNumber || ticket.id}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
                    <p>
                      <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                        Sistema:
                      </strong>{" "}
                      {ticket.systemId || "No definido"}
                    </p>
                    <p>
                      <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                        Creado:
                      </strong>{" "}
                      {formatDateTime(ticket.createdAt)}
                    </p>
                    <p>
                      <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                        Último movimiento:
                      </strong>{" "}
                      {formatDateTime(ticket.lastMessageAt)}
                    </p>
                  </div>
                </div>

                <div className="lg:pl-6">
                  <Link
                    to={buildClientTicketDetailRoute(ticket.id)}
                    className="btn-secondary w-full lg:w-auto"
                  >
                    Ver ticket
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default ClientTicketsPage;