/**
 * Admin dashboard with broader operational metrics.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TicketPriorityBadge from "../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../components/tickets/TicketStatusBadge";
import {
  ROUTES,
  buildAdminQuoteDetailRoute,
  buildAdminTechnicalReportDetailRoute,
  buildAdminTicketDetailRoute,
} from "../constants/routes";
import { subscribeClients } from "../services/clientService";
import { subscribeAdminQuotes } from "../services/quoteService";
import { subscribeAdminTechnicalReports } from "../services/technicalReportService";
import {
  subscribeAdminTicketMetrics,
  subscribeAdminTickets,
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

function formatCurrency(value, currency = "CRC") {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: currency || "CRC",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getMonthKey(value) {
  if (!value) {
    return "";
  }

  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function SecondaryMetricCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
        {value}
      </p>
    </article>
  );
}

function AdminDashboardPage() {
  const [ticketMetrics, setTicketMetrics] = useState({
    total: 0,
    open: 0,
    inReview: 0,
    waitingClient: 0,
    resolved: 0,
  });
  const [tickets, setTickets] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState({
    tickets: true,
    metrics: true,
    quotes: true,
    reports: true,
    clients: true,
  });

  useEffect(() => {
    const unsubscribe = subscribeAdminTicketMetrics(
      (data) => {
        setTicketMetrics(data);
        setLoading((prev) => ({ ...prev, metrics: false }));
      },
      () => {
        setErrorMessage("No fue posible cargar las métricas del dashboard.");
        setLoading((prev) => ({ ...prev, metrics: false }));
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAdminTickets(
      (data) => {
        setTickets(data);
        setLoading((prev) => ({ ...prev, tickets: false }));
      },
      () => {
        setErrorMessage("No fue posible cargar los tickets recientes.");
        setLoading((prev) => ({ ...prev, tickets: false }));
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAdminQuotes(
      (data) => {
        setQuotes(data);
        setLoading((prev) => ({ ...prev, quotes: false }));
      },
      () => {
        setErrorMessage("No fue posible cargar las cotizaciones.");
        setLoading((prev) => ({ ...prev, quotes: false }));
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAdminTechnicalReports(
      (data) => {
        setReports(data);
        setLoading((prev) => ({ ...prev, reports: false }));
      },
      () => {
        setErrorMessage("No fue posible cargar las fichas técnicas.");
        setLoading((prev) => ({ ...prev, reports: false }));
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeClients(
      (data) => {
        setClients(data);
        setLoading((prev) => ({ ...prev, clients: false }));
      },
      () => {
        setErrorMessage("No fue posible cargar los clientes.");
        setLoading((prev) => ({ ...prev, clients: false }));
      }
    );

    return () => unsubscribe();
  }, []);

  const recentTickets = useMemo(() => tickets.slice(0, 5), [tickets]);
  const recentQuotes = useMemo(() => quotes.slice(0, 4), [quotes]);
  const recentReports = useMemo(() => reports.slice(0, 4), [reports]);

  const quoteMetrics = useMemo(() => {
    const total = quotes.length;
    const draft = quotes.filter((quote) => quote.status === "draft").length;
    const sent = quotes.filter((quote) => quote.status === "sent").length;
    const approved = quotes.filter((quote) => quote.status === "approved").length;
    const totalAmount = quotes.reduce(
      (acc, quote) => acc + Number(quote.total || 0),
      0
    );
    const approvedAmount = quotes
      .filter((quote) => quote.status === "approved")
      .reduce((acc, quote) => acc + Number(quote.total || 0), 0);

    return {
      total,
      draft,
      sent,
      approved,
      totalAmount,
      approvedAmount,
    };
  }, [quotes]);

  const reportMetrics = useMemo(() => {
    const currentMonthKey = getMonthKey(new Date());

    return {
      total: reports.length,
      draft: reports.filter((report) => report.status === "draft").length,
      linkedQuote: reports.filter((report) => Boolean(report.quoteId)).length,
      currentMonth: reports.filter(
        (report) => getMonthKey(report.createdAt) === currentMonthKey
      ).length,
    };
  }, [reports]);

  const clientMetrics = useMemo(() => {
    const activeClients = clients.filter((client) => client.status !== "inactive").length;
    const systems = clients.reduce(
      (acc, client) => acc + (Array.isArray(client.systems) ? client.systems.length : 0),
      0
    );
    const critical = clients.filter(
      (client) => String(client.supportPriority || "").toLowerCase() === "critical"
    ).length;

    return {
      total: clients.length,
      activeClients,
      systems,
      critical,
    };
  }, [clients]);

  const isLoadingPrimary =
    loading.metrics || loading.quotes || loading.reports || loading.clients;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            Administración
          </p>
          <h2 className="section-title">Dashboard de administración</h2>
          <p className="section-subtitle mt-2">
            Resumen operativo de tickets, clientes, cotizaciones y fichas técnicas.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
        </div>
      </header>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </article>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Tickets abiertos"
          value={loading.metrics ? "..." : ticketMetrics.open}
          helper="Pendientes de atención"
        />
        <MetricCard
          label="En revisión"
          value={loading.metrics ? "..." : ticketMetrics.inReview}
          helper="Trabajo activo"
        />
        <MetricCard
          label="Esperando cliente"
          value={loading.metrics ? "..." : ticketMetrics.waitingClient}
          helper="Pendiente de respuesta"
        />
        <MetricCard
          label="Cotizaciones"
          value={loading.quotes ? "..." : quoteMetrics.total}
          helper="Total acumulado"
        />
        <MetricCard
          label="Fichas técnicas"
          value={loading.reports ? "..." : reportMetrics.total}
          helper="Historial técnico"
        />
        <MetricCard
          label="Clientes activos"
          value={loading.clients ? "..." : clientMetrics.activeClients}
          helper="Con operación vigente"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="card-base p-6 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                Panorama comercial y técnico
              </h3>
              <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
                Indicadores rápidos para seguimiento del negocio.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SecondaryMetricCard
              label="Valor total cotizado"
              value={isLoadingPrimary ? "..." : formatCurrency(quoteMetrics.totalAmount)}
            />
            <SecondaryMetricCard
              label="Valor aprobado"
              value={loading.quotes ? "..." : formatCurrency(quoteMetrics.approvedAmount)}
            />
            <SecondaryMetricCard
              label="Cotizaciones por enviar"
              value={loading.quotes ? "..." : quoteMetrics.draft}
            />
            <SecondaryMetricCard
              label="Cotizaciones enviadas"
              value={loading.quotes ? "..." : quoteMetrics.sent}
            />
            <SecondaryMetricCard
              label="Fichas del mes"
              value={loading.reports ? "..." : reportMetrics.currentMonth}
            />
            <SecondaryMetricCard
              label="Sistemas registrados"
              value={loading.clients ? "..." : clientMetrics.systems}
            />
          </div>
        </article>

        <article className="card-base p-6">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            Prioridades y cierres
          </h3>
          <div className="mt-5 grid gap-3">
            <SecondaryMetricCard
              label="Resueltos"
              value={loading.metrics ? "..." : ticketMetrics.resolved}
            />
            <SecondaryMetricCard
              label="Clientes críticos"
              value={loading.clients ? "..." : clientMetrics.critical}
            />
            <SecondaryMetricCard
              label="Fichas con cotización"
              value={loading.reports ? "..." : reportMetrics.linkedQuote}
            />
            <SecondaryMetricCard
              label="Cotizaciones aprobadas"
              value={loading.quotes ? "..." : quoteMetrics.approved}
            />
          </div>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="card-base p-6 xl:col-span-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                Tickets recientes
              </h3>
              <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
                Últimos movimientos registrados en soporte.
              </p>
            </div>

            <Link to={ROUTES.ADMIN_TICKETS} className="btn-secondary">
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
              Todavía no hay tickets registrados.
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
                            Cliente:
                          </strong>{" "}
                          {ticket.clientId || "No asignado"}
                        </p>
                        <p>
                          <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                            Último movimiento:
                          </strong>{" "}
                          {formatDateTime(ticket.lastMessageAt)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Link
                        to={buildAdminTicketDetailRoute(ticket.id)}
                        className="btn-secondary w-full lg:w-auto"
                      >
                        Abrir ticket
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <article className="card-base p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Actividad reciente
            </h3>
            <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
              Atajos a los últimos documentos creados.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                  Cotizaciones
                </p>
                <Link to={ROUTES.ADMIN_QUOTES} className="text-xs font-medium text-slate-600 dark:text-[#B0B0B0]">
                  Ver más
                </Link>
              </div>

              <div className="space-y-3">
                {recentQuotes.length === 0 ? (
                  <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                    Sin cotizaciones recientes.
                  </p>
                ) : (
                  recentQuotes.map((quote) => (
                    <Link
                      key={quote.id}
                      to={buildAdminQuoteDetailRoute(quote.id)}
                      className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors duration-300 hover:border-slate-300 dark:border-[#444444] dark:bg-[#181818] dark:hover:border-[#666666]"
                    >
                      <p className="text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                        {quote.title || quote.quoteNumber || quote.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                        {formatCurrency(quote.total, quote.currency)}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                  Fichas técnicas
                </p>
                <Link to={ROUTES.ADMIN_TECHNICAL_REPORTS} className="text-xs font-medium text-slate-600 dark:text-[#B0B0B0]">
                  Ver más
                </Link>
              </div>

              <div className="space-y-3">
                {recentReports.length === 0 ? (
                  <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                    Sin fichas recientes.
                  </p>
                ) : (
                  recentReports.map((report) => (
                    <Link
                      key={report.id}
                      to={buildAdminTechnicalReportDetailRoute(report.id)}
                      className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors duration-300 hover:border-slate-300 dark:border-[#444444] dark:bg-[#181818] dark:hover:border-[#666666]"
                    >
                      <p className="text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                        {[report.deviceType, report.brand, report.model].filter(Boolean).join(" ") || report.reportNumber || report.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                        {report.reportNumber || report.id}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default AdminDashboardPage;
