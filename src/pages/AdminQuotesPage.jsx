/**
 * Admin quotes listing page with operational metrics.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QUOTE_STATUS_LABELS } from "../constants/quotes";
import { ROUTES, buildAdminQuoteDetailRoute } from "../constants/routes";
import { subscribeAdminQuotes } from "../services/quoteService";

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

function AdminQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const unsubscribe = subscribeAdminQuotes(
      (data) => {
        setQuotes(data);
        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar las cotizaciones.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const metrics = useMemo(() => {
    const totalAmount = quotes.reduce((acc, quote) => acc + Number(quote.total || 0), 0);
    const approvedAmount = quotes
      .filter((quote) => quote.status === "approved")
      .reduce((acc, quote) => acc + Number(quote.total || 0), 0);

    return {
      total: quotes.length,
      draft: quotes.filter((quote) => quote.status === "draft").length,
      sent: quotes.filter((quote) => quote.status === "sent").length,
      approved: quotes.filter((quote) => quote.status === "approved").length,
      rejected: quotes.filter((quote) => quote.status === "rejected").length,
      totalAmount,
      approvedAmount,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return quotes.filter((quote) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          quote.quoteNumber,
          quote.title,
          quote.clientId,
          quote.clientDisplayName,
          quote.createdByName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const matchesStatus = statusFilter === "all" || quote.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [quotes, search, statusFilter]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            Cotizaciones
          </p>
          <h2 className="section-title">Gestión de cotizaciones</h2>
          <p className="section-subtitle mt-2">
            Seguimiento comercial de proformas, estados y montos aprobados.
          </p>
        </div>

        <div>
          <Link to={ROUTES.ADMIN_QUOTES_NEW} className="btn-primary">
            Nueva cotización
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Totales" value={loading ? "..." : metrics.total} />
        <MetricCard label="Borrador" value={loading ? "..." : metrics.draft} />
        <MetricCard label="Enviadas" value={loading ? "..." : metrics.sent} />
        <MetricCard label="Aprobadas" value={loading ? "..." : metrics.approved} />
        <MetricCard label="Valor total" value={loading ? "..." : formatCurrency(metrics.totalAmount)} />
        <MetricCard label="Valor aprobado" value={loading ? "..." : formatCurrency(metrics.approvedAmount)} />
      </div>

      <article className="card-base p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_1fr]">
          <div>
            <label htmlFor="quoteSearch" className="label-base">
              Buscar
            </label>
            <input
              id="quoteSearch"
              type="text"
              className="input-base"
              placeholder="Buscar por número, título o cliente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="quoteStatus" className="label-base">
              Estado
            </label>
            <select
              id="quoteStatus"
              className="input-base"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </article>

      {loading ? (
        <article className="card-base p-6">
          <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
            Cargando cotizaciones...
          </p>
        </article>
      ) : null}

      {!loading && errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </article>
      ) : null}

      {!loading && !errorMessage && quotes.length === 0 ? (
        <article className="card-base p-8">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            No hay cotizaciones registradas
          </h3>
          <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Todavía no se ha creado ninguna cotización en el sistema.
          </p>
          <div className="mt-5">
            <Link to={ROUTES.ADMIN_QUOTES_NEW} className="btn-primary">
              Crear primera cotización
            </Link>
          </div>
        </article>
      ) : null}

      {!loading && !errorMessage && quotes.length > 0 && filteredQuotes.length === 0 ? (
        <article className="card-base p-8">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            No hay resultados
          </h3>
          <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Ajuste la búsqueda o el filtro de estado.
          </p>
        </article>
      ) : null}

      {!loading && !errorMessage && filteredQuotes.length > 0 ? (
        <div className="grid gap-4">
          {filteredQuotes.map((quote) => (
            <article key={quote.id} className="card-base p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                    {quote.title || "Sin título"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    {quote.quoteNumber || quote.id}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
                    <p>
                      <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                        Cliente:
                      </strong>{" "}
                      {quote.clientDisplayName || quote.clientId || "No definido"}
                    </p>
                    <p>
                      <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                        Estado:
                      </strong>{" "}
                      {QUOTE_STATUS_LABELS[quote.status] || quote.status || "draft"}
                    </p>
                    <p>
                      <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                        Total:
                      </strong>{" "}
                      {formatCurrency(quote.total, quote.currency)}
                    </p>
                    <p>
                      <strong className="font-medium text-slate-800 transition-colors duration-300 dark:text-[#E0E0E0]">
                        Creado:
                      </strong>{" "}
                      {formatDateTime(quote.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <Link
                    to={buildAdminQuoteDetailRoute(quote.id)}
                    className="btn-secondary w-full lg:w-auto"
                  >
                    Ver cotización
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

export default AdminQuotesPage;
