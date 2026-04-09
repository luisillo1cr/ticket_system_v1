/**
 * Client profile / information page.
 *
 * Allows the client to review and update basic profile information, inspect
 * active systems and review recent service history visible to the client.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES, buildClientTicketDetailRoute } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";
import {
  subscribeClientById,
  subscribeSystemsByClient,
  updateOwnAccessProfile,
  updateOwnClientProfile,
} from "../services/clientService";
import { subscribeClientTickets } from "../services/ticketService";
import { subscribeClientQuotes } from "../services/quoteService";
import { subscribeClientTechnicalReports } from "../services/technicalReportService";
import TicketStatusBadge from "../components/tickets/TicketStatusBadge";

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

function getClientIdTypeLabel(value) {
  const normalized = String(value || "national").trim();

  if (normalized === "juridical") {
    return "Jurídica";
  }

  return "Nacional";
}

function InfoValue({ value, muted = false }) {
  return (
    <p
      className={`mt-1 text-sm ${
        muted
          ? "text-slate-500 transition-colors duration-300 dark:text-[#94A3B8]"
          : "text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]"
      }`}
    >
      {value || "No definido"}
    </p>
  );
}

function FieldGroup({ label, children, helper }) {
  return (
    <div>
      <label className="label-base">{label}</label>
      {children}
      {helper ? (
        <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function RecordCard({ title, subtitle, children, action }) {
  return (
    <article className="card-base p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            {title}
          </h3>
          <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            {subtitle}
          </p>
        </div>

        {action || null}
      </div>

      {children}
    </article>
  );
}

function TechnicalReportStatusBadge({ status }) {
  const normalized = String(status || "draft").trim().toLowerCase();

  const styles = {
    draft: "badge-neutral",
    in_progress: "badge-warning",
    completed: "badge-success",
    delivered: "badge-info",
  };

  const labels = {
    draft: "Borrador",
    in_progress: "En progreso",
    completed: "Completada",
    delivered: "Entregada",
  };

  return <span className={styles[normalized] || "badge-neutral"}>{labels[normalized] || status || "Sin estado"}</span>;
}

function QuoteStatusBadge({ status }) {
  const normalized = String(status || "draft").trim().toLowerCase();

  const styles = {
    draft: "badge-neutral",
    sent: "badge-info",
    approved: "badge-success",
    rejected: "badge-warning",
    expired: "badge-warning",
  };

  const labels = {
    draft: "Borrador",
    sent: "Enviada",
    approved: "Aprobada",
    rejected: "Rechazada",
    expired: "Vencida",
  };

  return <span className={styles[normalized] || "badge-neutral"}>{labels[normalized] || status || "Sin estado"}</span>;
}

function ClientProfilePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [clientRecord, setClientRecord] = useState(null);
  const [systems, setSystems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [technicalReports, setTechnicalReports] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState({
    client: true,
    systems: true,
    tickets: true,
    technicalReports: true,
    quotes: true,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [accessSuccess, setAccessSuccess] = useState("");
  const [clientSuccess, setClientSuccess] = useState("");
  const [savingAccess, setSavingAccess] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [accessForm, setAccessForm] = useState({
    name: currentUser?.name || "",
  });
  const [clientForm, setClientForm] = useState({
    contactPerson: "",
    phoneType: "national",
    phone: "",
    idType: "national",
    idNumber: "",
  });

  useEffect(() => {
    setAccessForm({ name: currentUser?.name || "" });
  }, [currentUser?.name]);

  useEffect(() => {
    if (!currentUser?.clientId) {
      setLoading({
        client: false,
        systems: false,
        tickets: false,
        technicalReports: false,
        quotes: false,
      });
      return () => {};
    }

    const unsubscribeClient = subscribeClientById(
      currentUser.clientId,
      (data) => {
        setClientRecord(data);
        setClientForm({
          contactPerson: data?.contactPerson || "",
          phoneType: data?.phoneType || "national",
          phone: data?.phone || "",
          idType: data?.idType || "national",
          idNumber: data?.idNumber || "",
        });
        setLoading((prev) => ({ ...prev, client: false }));
      },
      (error) => {
        console.error("Client profile client error:", error);
        setErrorMessage("No fue posible cargar la información principal del cliente.");
        setLoading((prev) => ({ ...prev, client: false }));
      }
    );

    const unsubscribeSystems = subscribeSystemsByClient(
      currentUser.clientId,
      (data) => {
        setSystems(data.filter((system) => system.status !== "archived"));
        setLoading((prev) => ({ ...prev, systems: false }));
      },
      (error) => {
        console.error("Client profile systems error:", error);
        setErrorMessage("No fue posible cargar los sistemas asociados.");
        setLoading((prev) => ({ ...prev, systems: false }));
      }
    );

    const unsubscribeTickets = subscribeClientTickets(
      currentUser.clientId,
      (data) => {
        setTickets(data);
        setLoading((prev) => ({ ...prev, tickets: false }));
      },
      (error) => {
        console.error("Client profile tickets error:", error);
        setErrorMessage("No fue posible cargar el historial de tickets.");
        setLoading((prev) => ({ ...prev, tickets: false }));
      }
    );

    const unsubscribeTechnicalReports = subscribeClientTechnicalReports(
      currentUser.clientId,
      (data) => {
        setTechnicalReports(data);
        setLoading((prev) => ({ ...prev, technicalReports: false }));
      },
      (error) => {
        console.error("Client profile technical reports error:", error);
        setLoading((prev) => ({ ...prev, technicalReports: false }));
      }
    );

    const unsubscribeQuotes = subscribeClientQuotes(
      currentUser.clientId,
      (data) => {
        setQuotes(data);
        setLoading((prev) => ({ ...prev, quotes: false }));
      },
      (error) => {
        console.error("Client profile quotes error:", error);
        setLoading((prev) => ({ ...prev, quotes: false }));
      }
    );

    return () => {
      unsubscribeClient();
      unsubscribeSystems();
      unsubscribeTickets();
      unsubscribeTechnicalReports();
      unsubscribeQuotes();
    };
  }, [currentUser?.clientId]);

  const recentTickets = useMemo(() => tickets.slice(0, 5), [tickets]);
  const recentTechnicalReports = useMemo(() => technicalReports.slice(0, 5), [technicalReports]);
  const recentQuotes = useMemo(() => quotes.slice(0, 5), [quotes]);

  const handleAccessChange = (event) => {
    const { name, value } = event.target;

    setAccessForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClientChange = (event) => {
    const { name, value } = event.target;

    setClientForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveAccess = async (event) => {
    event.preventDefault();
    setAccessSuccess("");
    setErrorMessage("");

    if (!String(accessForm.name || "").trim()) {
      setErrorMessage("El nombre visible de acceso es obligatorio.");
      return;
    }

    setSavingAccess(true);

    try {
      await updateOwnAccessProfile({ name: accessForm.name });
      setAccessSuccess("El nombre de acceso fue actualizado correctamente.");
    } catch (error) {
      console.error("Client profile access update error:", error);
      setErrorMessage("No fue posible actualizar el nombre de acceso.");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleSaveClient = async (event) => {
    event.preventDefault();
    setClientSuccess("");
    setErrorMessage("");

    if (!currentUser?.clientId) {
      setErrorMessage("No existe un cliente asociado a su acceso.");
      return;
    }

    setSavingClient(true);

    try {
      await updateOwnClientProfile(currentUser.clientId, clientForm);
      setClientSuccess("La información principal fue actualizada correctamente.");
    } catch (error) {
      console.error("Client profile client update error:", error);
      setErrorMessage("No fue posible actualizar la información del cliente.");
    } finally {
      setSavingClient(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            Mi información
          </p>
          <h2 className="section-title">Perfil del cliente</h2>
          <p className="section-subtitle mt-2">
            Revise su acceso, actualice datos básicos autorizados y consulte el historial reciente de soporte.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={ROUTES.CLIENT_TICKETS} className="btn-secondary">
            Ver tickets
          </Link>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(`${ROUTES.CLIENT_TICKETS_NEW}?reason=email_change`)}
          >
            Solicitar cambio de correo
          </button>
        </div>
      </header>

      {errorMessage ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </article>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="card-base p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Acceso al portal
            </h3>
            <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
              Información visible de su cuenta de acceso.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSaveAccess}>
            <FieldGroup label="Nombre visible de acceso">
              <input
                type="text"
                name="name"
                className="input-base"
                value={accessForm.name}
                onChange={handleAccessChange}
                placeholder="Nombre visible del usuario"
              />
            </FieldGroup>

            <FieldGroup
              label="Correo actual"
              helper="Por seguridad, el cambio de correo se solicita mediante ticket desde el botón superior."
            >
              <div className="input-base flex min-h-[52px] items-center bg-slate-50 dark:bg-[#111827]">
                {currentUser?.email || "No definido"}
              </div>
            </FieldGroup>

            {accessSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 transition-colors duration-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                {accessSuccess}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingAccess}>
                {savingAccess ? "Guardando..." : "Guardar nombre"}
              </button>
            </div>
          </form>
        </article>

        <article className="card-base p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Información principal del cliente
            </h3>
            <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
              Datos básicos visibles para soporte y seguimiento.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSaveClient}>
            <FieldGroup label="Cliente / empresa">
              <div className="input-base flex min-h-[52px] items-center bg-slate-50 dark:bg-[#111827]">
                {loading.client ? "Cargando..." : clientRecord?.company || clientRecord?.name || currentUser?.clientId || "No definido"}
              </div>
            </FieldGroup>

            <FieldGroup label="Nombre del contacto">
              <input
                type="text"
                name="contactPerson"
                className="input-base"
                value={clientForm.contactPerson}
                onChange={handleClientChange}
                placeholder="Nombre de la persona contacto"
              />
            </FieldGroup>

            <div className="grid gap-5 md:grid-cols-2">
              <FieldGroup label="Tipo de teléfono">
                <select name="phoneType" className="input-base" value={clientForm.phoneType} onChange={handleClientChange}>
                  <option value="national">Nacional</option>
                  <option value="international">Internacional</option>
                </select>
              </FieldGroup>

              <FieldGroup label="Teléfono">
                <input
                  type="text"
                  name="phone"
                  className="input-base"
                  value={clientForm.phone}
                  onChange={handleClientChange}
                  placeholder="Número de contacto"
                />
              </FieldGroup>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <FieldGroup label="Tipo de identificación">
                <select name="idType" className="input-base" value={clientForm.idType} onChange={handleClientChange}>
                  <option value="national">Nacional</option>
                  <option value="juridical">Jurídica</option>
                </select>
              </FieldGroup>

              <FieldGroup label="Número de identificación">
                <input
                  type="text"
                  name="idNumber"
                  className="input-base"
                  value={clientForm.idNumber}
                  onChange={handleClientChange}
                  placeholder="Cédula o identificación"
                />
              </FieldGroup>
            </div>

            {clientSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 transition-colors duration-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                {clientSuccess}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingClient || loading.client}>
                {savingClient ? "Guardando..." : "Guardar información"}
              </button>
            </div>
          </form>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RecordCard
          title="Resumen del cliente"
          subtitle="Información general cargada para su cuenta."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Estado
              </p>
              <InfoValue value={clientRecord?.status === "active" ? "Activo" : clientRecord?.status} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Prioridad de soporte
              </p>
              <InfoValue value={clientRecord?.supportPriority || "normal"} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Correo comercial
              </p>
              <InfoValue value={clientRecord?.email || currentUser?.email} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Identificación
              </p>
              <InfoValue value={`${getClientIdTypeLabel(clientRecord?.idType)} · ${clientRecord?.idNumber || "No definida"}`} />
            </div>
          </div>
        </RecordCard>

        <RecordCard
          title="Sistemas activos"
          subtitle="Sistemas y activos vinculados a su cuenta."
          action={<span className="badge-neutral">{loading.systems ? "..." : `${systems.length} activos`}</span>}
        >
          {loading.systems ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Cargando sistemas...
            </p>
          ) : null}

          {!loading.systems && systems.length === 0 ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              No hay sistemas activos asociados a su cuenta.
            </p>
          ) : null}

          {!loading.systems && systems.length > 0 ? (
            <div className="space-y-3">
              {systems.map((system) => (
                <div
                  key={system.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]"
                >
                  <p className="text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                    {system.name || system.id}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    {system.type || "Sin tipo definido"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    Estado: {system.status || "active"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </RecordCard>

        <RecordCard
          title="Historial reciente"
          subtitle="Resumen rápido del movimiento acumulado."
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Tickets
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                {loading.tickets ? "..." : tickets.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Fichas técnicas
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                {loading.technicalReports ? "..." : technicalReports.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Cotizaciones
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                {loading.quotes ? "..." : quotes.length}
              </p>
            </div>
          </div>
        </RecordCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RecordCard
          title="Tickets recientes"
          subtitle="Sus solicitudes más recientes visibles desde el portal."
          action={
            <Link to={ROUTES.CLIENT_TICKETS} className="btn-secondary">
              Ver todos
            </Link>
          }
        >
          {loading.tickets ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Cargando tickets...
            </p>
          ) : null}

          {!loading.tickets && recentTickets.length === 0 ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Todavía no hay tickets registrados en su cuenta.
            </p>
          ) : null}

          {!loading.tickets && recentTickets.length > 0 ? (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                    {ticket.subject || "Sin asunto"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    {ticket.ticketNumber || ticket.id}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    Actualizado: {formatDateTime(ticket.updatedAt || ticket.lastMessageAt)}
                  </p>
                  <div className="mt-3">
                    <Link to={buildClientTicketDetailRoute(ticket.id)} className="btn-secondary">
                      Ver ticket
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </RecordCard>

        <RecordCard
          title="Fichas técnicas recientes"
          subtitle="Registro de intervenciones y diagnósticos asociados a su cuenta."
        >
          {loading.technicalReports ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Cargando fichas técnicas...
            </p>
          ) : null}

          {!loading.technicalReports && recentTechnicalReports.length === 0 ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              No hay fichas técnicas visibles todavía para su cuenta.
            </p>
          ) : null}

          {!loading.technicalReports && recentTechnicalReports.length > 0 ? (
            <div className="space-y-3">
              {recentTechnicalReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <TechnicalReportStatusBadge status={report.status} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                    {report.reportNumber || report.id}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    {report.deviceType || "Equipo no definido"} · {report.brand || "Marca no definida"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    Actualizado: {formatDateTime(report.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </RecordCard>

        <RecordCard
          title="Cotizaciones recientes"
          subtitle="Últimas proformas visibles para su cuenta."
        >
          {loading.quotes ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Cargando cotizaciones...
            </p>
          ) : null}

          {!loading.quotes && recentQuotes.length === 0 ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              No hay cotizaciones visibles todavía para su cuenta.
            </p>
          ) : null}

          {!loading.quotes && recentQuotes.length > 0 ? (
            <div className="space-y-3">
              {recentQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                    {quote.quoteNumber || quote.id}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    {quote.title || "Sin título"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                    Actualizado: {formatDateTime(quote.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </RecordCard>
      </div>
    </section>
  );
}

export default ClientProfilePage;
