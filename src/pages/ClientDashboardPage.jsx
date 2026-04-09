/**
 * Client dashboard with improved operational context.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TicketPriorityBadge from "../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../components/tickets/TicketStatusBadge";
import { ROUTES, buildClientTicketDetailRoute } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";
import { subscribeClientById, subscribeSystemsByClient } from "../services/clientService";
import {
  subscribeClientTicketMetrics,
  subscribeClientTickets,
} from "../services/ticketService";

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

function MetricCard({ label, value, helper }) {
  return (
    <article className="card-base p-5">
      <p className="text-sm font-medium text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          {helper}
        </p>
      ) : null}
    </article>
  );
}

function ClientDashboardPage() {
  const { currentUser } = useAuth();
  const hasClientScope = Boolean(currentUser?.clientId);

  const [metrics, setMetrics] = useState({
    total: 0,
    open: 0,
    inReview: 0,
    waitingClient: 0,
    resolved: 0,
  });
  const [tickets, setTickets] = useState([]);
  const [clientRecord, setClientRecord] = useState(null);
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState({
    metrics: true,
    tickets: true,
    client: true,
    systems: true,
  });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!hasClientScope) {
      setLoading({ metrics: false, tickets: false, client: false, systems: false });
      return;
    }

    const unsubscribeMetrics = subscribeClientTicketMetrics(
      currentUser.clientId,
      (data) => {
        setMetrics(data);
        setLoading((prev) => ({ ...prev, metrics: false }));
      },
      (error) => {
        console.error("Client dashboard metrics error:", error);
        setErrorMessage("No fue posible cargar las métricas del dashboard.");
        setLoading((prev) => ({ ...prev, metrics: false }));
      }
    );

    const unsubscribeTickets = subscribeClientTickets(
      currentUser.clientId,
      (data) => {
        setTickets(data);
        setLoading((prev) => ({ ...prev, tickets: false }));
      },
      (error) => {
        console.error("Client dashboard tickets error:", error);
        setErrorMessage("No fue posible cargar los tickets recientes.");
        setLoading((prev) => ({ ...prev, tickets: false }));
      }
    );

    const unsubscribeClient = subscribeClientById(
      currentUser.clientId,
      (data) => {
        setClientRecord(data);
        setLoading((prev) => ({ ...prev, client: false }));
      },
      (error) => {
        console.error("Client dashboard client record error:", error);
        setErrorMessage("No fue posible cargar la información de su cuenta.");
        setLoading((prev) => ({ ...prev, client: false }));
      }
    );

    const unsubscribeSystems = subscribeSystemsByClient(
      currentUser.clientId,
      (data) => {
        setSystems(data);
        setLoading((prev) => ({ ...prev, systems: false }));
      },
      (error) => {
        console.error("Client dashboard systems error:", error);
        setErrorMessage("No fue posible cargar los sistemas asociados.");
        setLoading((prev) => ({ ...prev, systems: false }));
      }
    );

    return () => {
      unsubscribeMetrics();
      unsubscribeTickets();
      unsubscribeClient();
      unsubscribeSystems();
    };
  }, [currentUser?.clientId, hasClientScope]);

  const recentTickets = useMemo(() => tickets.slice(0, 5), [tickets]);
  const recentSystems = useMemo(() => systems.slice(0, 5), [systems]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            Cliente
          </p>
          <h2 className="section-title">Dashboard del cliente</h2>
          <p className="section-subtitle mt-2">
            Resumen de tickets, sistemas activos y estado general de soporte.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={ROUTES.CLIENT_TICKETS} className="btn-secondary">
            Ver tickets
          </Link>
          <Link to={ROUTES.CLIENT_TICKETS_NEW} className="btn-primary">
            Solicitar asistencia
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </article>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Tickets totales" value={loading.metrics ? "..." : metrics.total} helper="Historial acumulado" />
        <MetricCard label="Abiertos" value={loading.metrics ? "..." : metrics.open} helper="Pendientes de atención" />
        <MetricCard label="En revisión" value={loading.metrics ? "..." : metrics.inReview} helper="Soporte trabajando" />
        <MetricCard label="Resueltos" value={loading.metrics ? "..." : metrics.resolved} helper="Casos cerrados exitosamente" />
        <MetricCard
          label="Sistemas activos"
          value={loading.systems ? "..." : systems.length}
          helper={clientRecord?.supportPriority ? `Prioridad: ${clientRecord.supportPriority}` : "Infraestructura asociada"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="card-base p-6 xl:col-span-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                Tickets recientes
              </h3>
              <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
                Seguimiento de sus solicitudes más recientes.
              </p>
            </div>

            <Link to={ROUTES.CLIENT_TICKETS} className="btn-secondary">
              Ver todos
            </Link>
          </div>

          {loading.tickets ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Cargando tickets recientes...
            </p>
          ) : null}

          {!loading.tickets && recentTickets.length === 0 ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Todavía no hay tickets registrados para su cuenta.
            </p>
          ) : null}

          {!loading.tickets && recentTickets.length > 0 ? (
            <div className="grid gap-4">
              {recentTickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <TicketStatusBadge status={ticket.status} />
                        <TicketPriorityBadge priority={ticket.priority} />
                      </div>

                      <h4 className="mt-4 text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                        {ticket.subject || "Sin asunto"}
                      </h4>

                      <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                        {ticket.ticketNumber || ticket.id}
                      </p>

                      <div className="mt-3 space-y-1 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
                        <p>
                          <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                            Sistema:
                          </strong>{" "}
                          {ticket.systemId || "No definido"}
                        </p>
                        <p>
                          <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                            Último movimiento:
                          </strong>{" "}
                          {formatDateTime(ticket.lastMessageAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
                      <Link to={buildClientTicketDetailRoute(ticket.id)} className="btn-secondary">
                        Ver detalle
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <article className="card-base p-6">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            Sistemas asociados
          </h3>
          <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Infraestructura activa asociada a su cuenta.
          </p>

          <div className="mt-5 space-y-3">
            {loading.systems ? (
              <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                Cargando sistemas...
              </p>
            ) : null}

            {!loading.systems && recentSystems.length === 0 ? (
              <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                No hay sistemas registrados para este cliente.
              </p>
            ) : null}

            {!loading.systems && recentSystems.length > 0
              ? recentSystems.map((system) => (
                  <div
                    key={system.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]"
                  >
                    <p className="text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                      {system.name || system.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                      {system.type || "Sistema"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                      Estado: {system.status || "active"}
                    </p>
                  </div>
                ))
              : null}
          </div>
        </article>
      </div>
    </section>
  );
}

export default ClientDashboardPage;
