import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import TicketPriorityBadge from "../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../components/tickets/TicketStatusBadge";
import AttachmentViewerModal from "../components/shared/AttachmentViewerModal";
import {
  ROUTES,
  buildAdminTechnicalReportDetailRoute,
  buildAdminTicketDetailRoute,
} from "../constants/routes";
import {
  addAdminTicketMessage,
  subscribeAdminTickets,
  subscribeTicketById,
  subscribeTicketMessages,
  updateTicketStatus,
} from "../services/ticketService";
import { subscribeAdminTechnicalReports } from "../services/technicalReportService";
import { subscribeClients, subscribeSystems } from "../services/clientService";
import { useAuth } from "../hooks/useAuth";
import { TICKET_STATUS_LABELS } from "../constants/tickets";
import {
  ACCEPTED_ATTACHMENT_INPUT,
  formatFileSize,
  getAttachmentExtension,
  getAttachmentKindLabel,
  isImageAttachment,
  validateAttachmentFiles,
} from "../utils/attachments";

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function resolveTicketId(params, pathname) {
  const paramId = String(params.ticketId || params.id || "").trim();
  if (paramId) return paramId;

  const parts = String(pathname || "")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);

  const last = parts.at(-1) || "";
  if (!last) return "";

  const blocked = new Set(["tickets", "ticket", "new", "admin", "detalle", "detail"]);
  if (blocked.has(last.toLowerCase())) return "";

  return last;
}

function TicketTypeBadge({ type }) {
  const normalized = String(type || "task").toLowerCase();

  const variants = {
    task: "bg-slate-100 text-slate-700 dark:bg-[#232323] dark:text-[#D4D4D4]",
    request: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    incident: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    problem: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    subtask: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
        variants[normalized] || variants.task
      }`}
    >
      {normalized}
    </span>
  );
}

function SectionCard({ title, subtitle, children, bodyClassName = "" }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2C2C2C] dark:bg-[var(--app-surface)]">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-[#2C2C2C]">
        <h2 className="text-base font-semibold text-slate-950 dark:text-[var(--app-text)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-[var(--app-text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className={bodyClassName || "p-5"}>{children}</div>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0 dark:border-[#2C2C2C]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-[var(--app-text-muted)]">
        {label}
      </span>
      <span className="max-w-[58%] text-right text-sm text-slate-900 dark:text-[var(--app-text)]">
        {value || "No definido"}
      </span>
    </div>
  );
}

function AttachmentCard({ attachment, index, onOpen }) {
  const image = isImageAttachment(attachment?.contentType);

  if (image) {
    return (
      <button
        type="button"
        onClick={() => onOpen(attachment)}
        className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:shadow-md dark:border-[#333333] dark:bg-[#181818]"
      >
        <img
          src={attachment.url}
          alt={attachment.name || `Adjunto ${index + 1}`}
          className="h-40 w-full object-cover"
          loading="lazy"
        />
        <div className="p-3">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-[var(--app-text)]">
            {attachment.name || `Imagen ${index + 1}`}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[var(--app-text-muted)]">
            Imagen · {formatFileSize(attachment.size)}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(attachment)}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:shadow-md dark:border-[#333333] dark:bg-[#181818]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-[#333333] dark:bg-[#202020] dark:text-[var(--app-text)]">
        {getAttachmentExtension(attachment?.name)}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-[var(--app-text)]">
          {attachment.name || `Archivo ${index + 1}`}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-[var(--app-text-muted)]">
          {getAttachmentKindLabel(attachment?.contentType)} · {formatFileSize(attachment?.size)}
        </p>
      </div>
    </button>
  );
}

function MessageCard({ item, onOpenAttachment }) {
  const isSupport = item.senderRole !== "client";

  return (
    <article
      className={`rounded-xl border p-4 ${
        isSupport
          ? "border-slate-200 bg-slate-50 dark:border-[#333333] dark:bg-[#181818]"
          : "border-slate-200 bg-white dark:border-[#333333] dark:bg-[#151515]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-[var(--app-text)]">
            {item.senderName || "Sin nombre"}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-[var(--app-text-muted)]">
            {isSupport ? "Soporte" : "Cliente"}
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-[var(--app-text-muted)]">
          {formatDateTime(item.createdAt)}
        </p>
      </div>

      <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-[#D4D4D4]">
        {item.message || "Mensaje vacío"}
      </div>

      {Array.isArray(item.attachments) && item.attachments.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {item.attachments.map((attachment, index) => (
            <AttachmentCard
              key={`${attachment.path || attachment.url || index}`}
              attachment={attachment}
              index={index}
              onOpen={onOpenAttachment}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function RelationCard({ title, subtitle, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm dark:border-[#333333] dark:bg-[#181818]"
    >
      <p className="text-sm font-semibold text-slate-900 dark:text-[var(--app-text)]">
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-[var(--app-text-muted)]">
        {subtitle}
      </p>
    </button>
  );
}

function AdminTicketDetailPage() {
  const params = useParams();
  const location = useLocation();
  const ticketId = resolveTicketId(params, location.pathname);

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [systems, setSystems] = useState([]);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusValue, setStatusValue] = useState("open");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!ticketId) {
      setTicket(null);
      setMessages([]);
      setLoadingTicket(false);
      setLoadingMessages(false);
      setErrorMessage("No fue posible resolver la ruta del ticket.");
      return () => {};
    }

    const unsubscribeTicket = subscribeTicketById(
      ticketId,
      (item) => {
        setTicket(item);
        setStatusValue(item?.status || "open");
        setLoadingTicket(false);
      },
      (error) => {
        console.error("Error subscribing ticket detail:", error);
        setErrorMessage("No fue posible cargar el ticket solicitado.");
        setLoadingTicket(false);
      }
    );

    const unsubscribeMessages = subscribeTicketMessages(
      ticketId,
      (items) => {
        setMessages(items);
        setLoadingMessages(false);
      },
      (error) => {
        console.error("Error subscribing ticket messages:", error);
        setErrorMessage("No fue posible cargar la conversación del ticket.");
        setLoadingMessages(false);
      }
    );

    const unsubscribeTickets = subscribeAdminTickets(setAllTickets, () => {});
    const unsubscribeReports = subscribeAdminTechnicalReports(setAllReports, () => {});
    const unsubscribeClients = subscribeClients(setClients, () => {});
    const unsubscribeSystems = subscribeSystems(setSystems, () => {});

    return () => {
      unsubscribeTicket();
      unsubscribeMessages();
      unsubscribeTickets();
      unsubscribeReports();
      unsubscribeClients();
      unsubscribeSystems();
    };
  }, [ticketId]);

  const clientMap = useMemo(
    () =>
      clients.reduce((acc, item) => {
        acc[item.id] = item.company || item.name || item.id;
        return acc;
      }, {}),
    [clients]
  );

  const systemMap = useMemo(
    () =>
      systems.reduce((acc, item) => {
        acc[item.id] = item.name || item.id;
        return acc;
      }, {}),
    [systems]
  );

  const relatedTickets = useMemo(() => {
    if (!ticket?.clientId) return [];

    return [...allTickets]
      .filter((item) => item.id !== ticket.id && item.clientId === ticket.clientId)
      .sort(
        (a, b) =>
          getTimestampMs(b.updatedAt || b.lastMessageAt || b.createdAt) -
          getTimestampMs(a.updatedAt || a.lastMessageAt || a.createdAt)
      )
      .slice(0, 5);
  }, [allTickets, ticket]);

  const linkedReports = useMemo(() => {
    if (!ticket) return [];

    return [...allReports]
      .filter((report) => report.sourceTicketId === ticket.id)
      .sort(
        (a, b) =>
          getTimestampMs(b.updatedAt || b.createdAt) -
          getTimestampMs(a.updatedAt || a.createdAt)
      )
      .slice(0, 5);
  }, [allReports, ticket]);

  const handleFileChange = (event) => {
    const result = validateAttachmentFiles(event.target.files);

    if (!result.ok) {
      setErrorMessage(result.message);
      event.target.value = "";
      setSelectedFiles([]);
      return;
    }

    setErrorMessage("");
    setSelectedFiles(result.files);
  };

  const handleRemoveSelectedFile = (fileName) => {
    const nextFiles = selectedFiles.filter((file) => file.name !== fileName);
    setSelectedFiles(nextFiles);

    if (!nextFiles.length && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitReply = async (event) => {
    event.preventDefault();

    if (!ticketId) {
      setErrorMessage("No fue posible identificar el ticket.");
      return;
    }

    if (!replyText.trim() && selectedFiles.length === 0) {
      return;
    }

    setSendingReply(true);
    setErrorMessage("");

    try {
      await addAdminTicketMessage(ticketId, replyText, currentUser, selectedFiles);
      setReplyText("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending admin reply:", error);
      setErrorMessage("No fue posible enviar la respuesta.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!ticketId || !ticket || statusValue === ticket.status) return;

    setSavingStatus(true);
    setErrorMessage("");

    try {
      await updateTicketStatus(ticketId, statusValue);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      setErrorMessage("No fue posible actualizar el estado del ticket.");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCreateReportFromTicket = () => {
    if (!ticket) return;

    navigate(ROUTES.ADMIN_TECHNICAL_REPORTS_NEW, {
      state: {
        sourceTicket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber || ticket.id,
          subject: ticket.subject || "",
          clientId: ticket.clientId || "",
          systemId: ticket.systemId || "",
          description: ticket.description || "",
        },
      },
    });
  };

  const handleCreateChildTicket = (suggestedType) => {
    if (!ticket) return;

    navigate(ROUTES.ADMIN_TICKETS_NEW, {
      state: {
        suggestedType,
        parentTicket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber || ticket.id,
          subject: ticket.subject || "",
          clientId: ticket.clientId || "",
          systemId: ticket.systemId || "",
        },
      },
    });
  };

  if (loadingTicket) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-[#2C2C2C] dark:bg-[var(--app-surface)] dark:text-[var(--app-text-muted)]">
        Cargando detalle del ticket...
      </section>
    );
  }

  if (!ticket) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-500/30 dark:bg-rose-500/10">
        <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-300">
          Ticket no encontrado
        </h2>
        <p className="mt-2 text-sm text-rose-700/80 dark:text-rose-300/80">
          {errorMessage || "El documento solicitado no existe o no está disponible."}
        </p>
        <div className="mt-5">
          <Link to={ROUTES.ADMIN_TICKETS} className="btn-secondary">
            Volver al listado
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2C2C2C] dark:bg-[var(--app-surface)]">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-[#2C2C2C]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[var(--app-text-muted)]">
            <Link to={ROUTES.ADMIN_TICKETS} className="hover:text-slate-700 dark:hover:text-[var(--app-text)]">
              Tickets
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-[var(--app-text)]">
              {ticket.ticketNumber || ticket.id}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <TicketTypeBadge type={ticket.type} />
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-[var(--app-text-muted)]">
              {ticket.ticketNumber || ticket.id}
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-[var(--app-text)]">
              {ticket.subject || "Sin asunto"}
            </h1>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600 dark:text-[var(--app-text-muted)]">
              {ticket.description || "Este ticket no tiene descripción inicial."}
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            <button
              type="button"
              className="btn-secondary !rounded-xl !px-4 !py-2.5 !text-sm"
              onClick={handleCreateReportFromTicket}
            >
              Crear ficha técnica
            </button>

            <button
              type="button"
              className="btn-secondary !rounded-xl !px-4 !py-2.5 !text-sm"
              onClick={() => handleCreateChildTicket("subtask")}
            >
              Add child ticket
            </button>

            <button
              type="button"
              className="btn-secondary !rounded-xl !px-4 !py-2.5 !text-sm"
              onClick={() => handleCreateChildTicket("incident")}
            >
              Crear incidente
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <div className="space-y-5">
          <SectionCard
            title="Actividad"
            subtitle="Comentarios, archivos y seguimiento del caso."
            bodyClassName="p-5"
          >
            <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-sm dark:border-[#2C2C2C]">
              <button
                type="button"
                className="rounded-md bg-slate-100 px-3 py-1.5 font-medium text-slate-700 dark:bg-[#202020] dark:text-[var(--app-text)]"
              >
                Comentarios
              </button>
              <span className="rounded-md px-3 py-1.5 text-slate-500 dark:text-[var(--app-text-muted)]">
                Historial
              </span>
            </div>

            <form
              onSubmit={handleSubmitReply}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-[#333333] dark:bg-[#181818]"
            >
              <label htmlFor="replyMessage" className="label-base">
                Responder
              </label>

              <textarea
                id="replyMessage"
                className="input-base mt-2 min-h-[130px]"
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Escriba una respuesta, avance técnico o aclaración para el cliente."
              />

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#333333] dark:bg-[#151515]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-[var(--app-text)]">
                      Archivos adjuntos
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-[var(--app-text-muted)]">
                      Imágenes, PDF y archivos de soporte permitidos.
                    </p>
                  </div>

                  <label htmlFor="replyAttachments" className="btn-secondary inline-flex cursor-pointer !rounded-xl">
                    Adjuntar archivos
                  </label>
                </div>

                <input
                  ref={fileInputRef}
                  id="replyAttachments"
                  type="file"
                  className="hidden"
                  multiple
                  accept={ACCEPTED_ATTACHMENT_INPUT}
                  onChange={handleFileChange}
                />
              </div>

              {selectedFiles.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {selectedFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.size}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-[#333333] dark:bg-[#151515]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-[var(--app-text)]">
                          {file.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-[var(--app-text-muted)]">
                          {formatFileSize(file.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-2 !text-xs !rounded-lg"
                        onClick={() => handleRemoveSelectedFile(file.name)}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="btn-primary !rounded-xl !px-4 !py-2.5"
                  disabled={sendingReply}
                >
                  {sendingReply ? "Enviando..." : "Publicar respuesta"}
                </button>
              </div>
            </form>

            <div className="mt-5 space-y-4">
              {loadingMessages ? (
                <p className="text-sm text-slate-500 dark:text-[var(--app-text-muted)]">
                  Cargando conversación...
                </p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-[var(--app-text-muted)]">
                  Este ticket todavía no tiene mensajes registrados.
                </p>
              ) : (
                messages.map((item) => (
                  <MessageCard
                    key={item.id}
                    item={item}
                    onOpenAttachment={setSelectedAttachment}
                  />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Relacionado"
            subtitle="Tickets del mismo cliente y fichas técnicas vinculadas."
            bodyClassName="p-5"
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-[var(--app-text)]">
                  Tickets relacionados
                </h3>

                <div className="mt-3 space-y-3">
                  {relatedTickets.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-[#333333] dark:text-[var(--app-text-muted)]">
                      No hay otros tickets relacionados por cliente.
                    </div>
                  ) : (
                    relatedTickets.map((item) => (
                      <RelationCard
                        key={item.id}
                        title={item.subject || item.ticketNumber || item.id}
                        subtitle={`${item.ticketNumber || item.id} · ${formatDateTime(
                          item.updatedAt || item.createdAt
                        )}`}
                        onOpen={() => navigate(buildAdminTicketDetailRoute(item.id))}
                      />
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-[var(--app-text)]">
                  Fichas técnicas vinculadas
                </h3>

                <div className="mt-3 space-y-3">
                  {linkedReports.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-[#333333] dark:text-[var(--app-text-muted)]">
                      Aún no hay fichas técnicas vinculadas a este ticket.
                    </div>
                  ) : (
                    linkedReports.map((report) => (
                      <RelationCard
                        key={report.id}
                        title={
                          report.reportNumber ||
                          `${report.deviceType || "Ficha"} ${report.brand || ""} ${report.model || ""}`.trim()
                        }
                        subtitle={`${report.deviceType || "Equipo"} · ${formatDateTime(
                          report.updatedAt || report.createdAt
                        )}`}
                        onOpen={() =>
                          navigate(buildAdminTechnicalReportDetailRoute(report.id))
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard
            title="Detalles"
            subtitle="Estado actual y metadatos del ticket."
            bodyClassName="p-5"
          >
            <div>
              <label htmlFor="ticketStatus" className="label-base">
                Estado
              </label>

              <div className="mt-2 flex gap-3">
                <select
                  id="ticketStatus"
                  className="input-base"
                  value={statusValue}
                  onChange={(event) => setStatusValue(event.target.value)}
                >
                  {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn-primary !rounded-xl whitespace-nowrap"
                  onClick={handleSaveStatus}
                  disabled={savingStatus || statusValue === ticket.status}
                >
                  {savingStatus ? "Guardando..." : "Aplicar"}
                </button>
              </div>
            </div>

            <div className="mt-5">
              <DetailRow label="Cliente" value={clientMap[ticket.clientId] || ticket.clientId} />
              <DetailRow
                label="Sistema"
                value={systemMap[ticket.systemId] || ticket.systemId || "Sin sistema"}
              />
              <DetailRow label="Categoría" value={ticket.category} />
              <DetailRow label="Creado por" value={ticket.createdByName || ticket.createdByUid} />
              <DetailRow
                label="Asignado a"
                value={ticket.assignedToName || ticket.assignedToUid || "Pendiente"}
              />
              <DetailRow
                label="Ticket padre"
                value={ticket.parentTicketNumber || "No definido"}
              />
              <DetailRow label="Creado" value={formatDateTime(ticket.createdAt)} />
              <DetailRow label="Actualizado" value={formatDateTime(ticket.updatedAt)} />
              <DetailRow label="Último mensaje" value={formatDateTime(ticket.lastMessageAt)} />
            </div>
          </SectionCard>
        </aside>
      </div>

      {selectedAttachment ? (
        <AttachmentViewerModal
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      ) : null}
    </section>
  );
}

export default AdminTicketDetailPage;