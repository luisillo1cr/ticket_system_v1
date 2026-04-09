/**
 * Admin technical reports listing page.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ROUTES,
  buildAdminTechnicalReportDetailRoute,
} from "../constants/routes";
import { subscribeClients } from "../services/clientService";
import { subscribeAdminTechnicalReports } from "../services/technicalReportService";

const TECHNICAL_REPORT_STATUS_LABELS = {
  draft: "Borrador",
  in_progress: "En proceso",
  completed: "Completada",
  delivered: "Entregada",
  archived: "Archivada",
};

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeDateInputValue(value) {
  if (!value) {
    return "";
  }

  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function StatusBadge({ status }) {
  return <span className="badge-neutral">{TECHNICAL_REPORT_STATUS_LABELS[status] || status || "Borrador"}</span>;
}

function AdminTechnicalReportsPage() {
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const unsubscribeReports = subscribeAdminTechnicalReports(
      (data) => {
        setReports(data);
        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar las fichas técnicas.");
        setLoading(false);
      }
    );

    const unsubscribeClients = subscribeClients(
      (data) => {
        setClients(data);
      },
      () => {
        console.error("No fue posible cargar clientes para fichas técnicas.");
      }
    );

    return () => {
      unsubscribeReports();
      unsubscribeClients();
    };
  }, []);

  const clientLabelById = useMemo(() => {
    return clients.reduce((acc, client) => {
      acc[client.id] = client.name || client.company || client.id;
      return acc;
    }, {});
  }, [clients]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return reports.filter((report) => {
      const createdDate = typeof report.createdAt?.toDate === "function"
        ? report.createdAt.toDate()
        : new Date(report.createdAt || 0);

      const matchesSearch =
        !normalizedSearch ||
        [
          report.reportNumber,
          report.clientId,
          clientLabelById[report.clientId],
          report.deviceType,
          report.brand,
          report.model,
          report.serialNumber,
          report.quoteId,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const matchesClient = clientFilter === "all" || report.clientId === clientFilter;
      const matchesStatus = statusFilter === "all" || (report.status || "draft") === statusFilter;

      const matchesFrom = !dateFrom || normalizeDateInputValue(createdDate) >= dateFrom;
      const matchesTo = !dateTo || normalizeDateInputValue(createdDate) <= dateTo;

      return matchesSearch && matchesClient && matchesStatus && matchesFrom && matchesTo;
    });
  }, [clientFilter, clientLabelById, dateFrom, dateTo, reports, search, statusFilter]);

  const clearFilters = () => {
    setSearch("");
    setClientFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            Fichas técnicas
          </p>
          <h2 className="section-title">Gestión de fichas técnicas</h2>
          <p className="section-subtitle mt-2">
            Registro profesional de diagnósticos, síntomas y procedimientos realizados.
          </p>
        </div>

        <div>
          <Link to={ROUTES.ADMIN_TECHNICAL_REPORTS_NEW} className="btn-primary">
            Nueva ficha técnica
          </Link>
        </div>
      </header>

      <article className="card-base p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_180px_180px_auto] xl:items-end">
          <div className="min-w-0">
            <label htmlFor="technicalReportSearch" className="label-base">
              Buscar
            </label>
            <input
              id="technicalReportSearch"
              type="text"
              className="input-base"
              placeholder="Buscar por número, cliente, equipo, modelo o cotización"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="technicalReportClientFilter" className="label-base">
              Cliente
            </label>
            <select
              id="technicalReportClientFilter"
              className="input-base"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name || client.company || client.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="technicalReportStatusFilter" className="label-base">
              Estado
            </label>
            <select
              id="technicalReportStatusFilter"
              className="input-base"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {Object.entries(TECHNICAL_REPORT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="technicalReportDateFrom" className="label-base">
              Fecha desde
            </label>
            <input
              id="technicalReportDateFrom"
              type="date"
              className="input-base h-[46px] px-3 py-2 text-sm"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="technicalReportDateTo" className="label-base">
              Fecha hasta
            </label>
            <input
              id="technicalReportDateTo"
              type="date"
              className="input-base h-[46px] px-3 py-2 text-sm"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button type="button" className="btn-secondary w-full xl:w-auto" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        </div>
      </article>

      {loading ? (
        <article className="card-base p-6">
          <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
            Cargando fichas técnicas...
          </p>
        </article>
      ) : null}

      {!loading && errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </article>
      ) : null}

      {!loading && !errorMessage && reports.length === 0 ? (
        <article className="card-base p-8">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            No hay fichas técnicas registradas
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Todavía no se ha creado ninguna ficha técnica en el sistema.
          </p>
          <div className="mt-5">
            <Link to={ROUTES.ADMIN_TECHNICAL_REPORTS_NEW} className="btn-primary">
              Crear primera ficha
            </Link>
          </div>
        </article>
      ) : null}

      {!loading && !errorMessage && reports.length > 0 && filteredReports.length === 0 ? (
        <article className="card-base p-8">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            No hay resultados
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Ajuste la búsqueda o los filtros para ver fichas coincidentes.
          </p>
        </article>
      ) : null}

      {!loading && !errorMessage && filteredReports.length > 0 ? (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <article key={report.id} className="card-base p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                    {report.deviceType || "Equipo"} {report.brand || ""} {report.model || ""}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    {report.reportNumber || report.id}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={report.status || "draft"} />
                    <span className="badge-neutral">{clientLabelById[report.clientId] || report.clientId || "Cliente no definido"}</span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                        Cliente
                      </p>
                      <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
                        {clientLabelById[report.clientId] || report.clientId || "No definido"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                        Serie
                      </p>
                      <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
                        {report.serialNumber || "No definida"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                        Cotización
                      </p>
                      <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
                        {report.quoteId || "No definida"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                        Creado
                      </p>
                      <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
                        {formatDateTime(report.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Link
                    to={buildAdminTechnicalReportDetailRoute(report.id)}
                    className="btn-secondary w-full lg:w-auto"
                  >
                    Ver y editar
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

export default AdminTechnicalReportsPage;
