/**
 * Admin single ticket detail page with conversation timeline
 * and compact relations modal.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TicketPriorityBadge from "../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../components/tickets/TicketStatusBadge";
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

function getTimestampMs(value) {
  if (!value) {
    return 0;
  }

  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  return new Date(value).getTime();
}

function buildReportTitle(report) {
  return [report?.deviceType, report?.brand, report?.model]
    .filter(Boolean)
    .join(" ")
    .trim() || report?.reportNumber || "Ficha técnica";
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
        {label}
      </p>
      <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
        {value || "No definido"}
      </p>
    </div>
  );
}

function AttachmentCard({ attachment, index }) {
  const image = isImageAttachment(attachment?.contentType);

  if (image) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md dark:border-[#444444] dark:bg-[#1A1A1A]"
      >
        <img
          src={attachment.url}
          alt={attachment.name || `Adjunto ${index + 1}`}
          className="h-44 w-full object-cover"
          loading="lazy"
        />
        <div className="p-3">
          <p className="truncate text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            {attachment.name || `Imagen ${index + 1}`}
          </p>
          <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            {formatFileSize(attachment.size)}
          </p>
        </div>
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md dark:border-[#444444] dark:bg-[#1A1A1A]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600 dark:border-[#444444] dark:bg-[#181818] dark:text-[#E0E0E0]">
        {getAttachmentExtension(attachment?.name)}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          {attachment.name || `Archivo ${index + 1}`}
        </p>
        <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          {getAttachmentKindLabel(attachment?.contentType)} ·{" "}
          {formatFileSize(attachment?.size)}
        </p>
      </div>
    </a>
  );
}

function MessageCard({ item }) {
  const isStaff = item.senderRole === "admin" || item.senderRole === "agent";

  return (
    <article
      className={`rounded-2xl border p-4 transition-colors duration-300 ${
        isStaff
          ? "border-slate-200 bg-slate-50 dark:border-[#444444] dark:bg-[#181818]"
          : "border-slate-200 bg-white dark:border-[#444444] dark:bg-[#1A1A1A]"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            {item.senderName || "Sin nombre"}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            {isStaff ? "Soporte" : "Cliente"}
          </p>
        </div>

        <p className="text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          {formatDateTime(item.createdAt)}
        </p>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
        {item.message || "Mensaje vacío"}
      </p>

      {Array.isArray(item.attachments) && item.attachments.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {item.attachments.map((attachment, index) => (
            <AttachmentCard
              key={`${attachment.path || attachment.url || index}`}
              attachment={attachment}
              index={index}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CompactOpenButton({ title, onClick, label = "Abrir" }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-[#444444] dark:bg-[#181818] dark:text-[#E0E0E0] dark:hover:bg-[#222222]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label={label}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </button>
  );
}

function RelatedTicketCard({ item, onOpen }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-[#E0E0E0]">
            {item.subject || "Sin asunto"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#888888]">
            {item.ticketNumber || item.id}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-[#888888]">
            Actualizado:{" "}
            {formatDateTime(item.updatedAt || item.lastMessageAt || item.createdAt)}
          </p>
        </div>

        <CompactOpenButton
          title="Abrir ticket"
          onClick={() => onOpen(item.id)}
          label="Abrir ticket"
        />
      </div>
    </article>
  );
}

function RelatedReportCard({ item, onOpen }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-[#E0E0E0]">
            {buildReportTitle(item)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#888888]">
            {item.reportNumber || item.id}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-[#888888]">
            Actualizado: {formatDateTime(item.updatedAt || item.createdAt)}
          </p>
        </div>

        <CompactOpenButton
          title="Abrir ficha técnica"
          onClick={() => onOpen(item.id)}
          label="Abrir ficha técnica"
        />
      </div>
    </article>
  );
}

function AdminTicketDetailPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [statusValue, setStatusValue] = useState("open");
  const [savingStatus, setSavingStatus] = useState(false);
  const [showRelatedModal, setShowRelatedModal] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeTicketById(
      ticketId,
      (data) => {
        setTicket(data);
        setStatusValue(data?.status || "open");
        setLoadingTicket(false);
      },
      () => {
        setErrorMessage("No fue posible cargar el detalle del ticket.");
        setLoadingTicket(false);
      }
    );

    return () => unsubscribe();
  }, [ticketId]);

  useEffect(() => {
    const unsubscribe = subscribeTicketMessages(
      ticketId,
      (data) => {
        setMessages(data);
        setLoadingMessages(false);
      },
      () => {
        setErrorMessage("No fue posible cargar la conversación del ticket.");
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [ticketId]);

  useEffect(() => {
    const unsubscribe = subscribeAdminTickets(
      (data) => {
        setAllTickets(data);
      },
      () => {
        console.error("No fue posible cargar tickets relacionados.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAdminTechnicalReports(
      (data) => {
        setAllReports(data);
      },
      () => {
        console.error("No fue posible cargar fichas relacionadas.");
      }
    );

    return () => unsubscribe();
  }, []);

  const relatedTickets = useMemo(() => {
    if (!ticket?.clientId) {
      return [];
    }

    return [...allTickets]
      .filter((item) => item.id !== ticket.id && item.clientId === ticket.clientId)
      .sort((a, b) => {
        const aSameSystem = a.systemId === ticket.systemId ? 1 : 0;
        const bSameSystem = b.systemId === ticket.systemId ? 1 : 0;

        if (aSameSystem !== bSameSystem) {
          return bSameSystem - aSameSystem;
        }

        return (
          getTimestampMs(b.updatedAt || b.lastMessageAt || b.createdAt) -
          getTimestampMs(a.updatedAt || a.lastMessageAt || a.createdAt)
        );
      });
  }, [allTickets, ticket]);

  const linkedReports = useMemo(() => {
    if (!ticket) {
      return [];
    }

    return [...allReports]
      .filter((report) => report.sourceTicketId === ticket.id)
      .sort(
        (a, b) =>
          getTimestampMs(b.updatedAt || b.createdAt) -
          getTimestampMs(a.updatedAt || a.createdAt)
      );
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

    if (!replyText.trim()) {
      return;
    }

    setSendingReply(true);
    setErrorMessage("");

    try {
      await addAdminTicketMessage(ticketId, replyText, currentUser, selectedFiles);
      setReplyText("");
      setSelectedFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error sending admin reply:", error);
      setErrorMessage("No fue posible enviar la respuesta.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!ticket || statusValue === ticket.status) {
      return;
    }

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
    if (!ticket) {
      return;
    }

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

  if (loadingTicket) {
    return (
      <section className="card-base p-6">
        <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
          Cargando detalle del ticket...
        </p>
      </section>
    );
  }

  if (errorMessage && !ticket) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        {errorMessage}
      </section>
    );
  }

  if (!ticket) {
    return (
      <section className="card-base p-6">
        <h2 className="text-lg font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          Ticket no encontrado
        </h2>
        <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
          El documento solicitado no existe o no está disponible.
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
    <section className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
              Detalle del ticket
            </p>
            <h2 className="section-title">{ticket.subject || "Sin asunto"}</h2>
            <p className="section-subtitle mt-2">{ticket.ticketNumber || ticket.id}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowRelatedModal(true)}
          >
            Relacionados · {relatedTickets.length} tickets · {linkedReports.length} fichas
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleCreateReportFromTicket}
          >
            Crear ficha técnica desde ticket
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      ) : null}

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          Estado del ticket
        </h3>

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="w-full md:max-w-xs">
            <label htmlFor="ticketStatus" className="label-base">
              Estado
            </label>
            <select
              id="ticketStatus"
              name="ticketStatus"
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
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveStatus}
            disabled={savingStatus || statusValue === ticket.status}
          >
            {savingStatus ? "Guardando..." : "Actualizar estado"}
          </button>
        </div>
      </article>

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          Información general
        </h3>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="Cliente" value={ticket.clientId} />
          <InfoItem label="Sistema" value={ticket.systemId} />
          <InfoItem label="Categoría" value={ticket.category} />
          <InfoItem
            label="Creado por"
            value={ticket.createdByName || ticket.createdByUid}
          />
          <InfoItem
            label="Asignado a"
            value={ticket.assignedToName || ticket.assignedToUid}
          />
          <InfoItem label="Creado" value={formatDateTime(ticket.createdAt)} />
          <InfoItem label="Actualizado" value={formatDateTime(ticket.updatedAt)} />
          <InfoItem
            label="Último mensaje"
            value={formatDateTime(ticket.lastMessageAt)}
          />
        </div>
      </article>

      <article className="card-base p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            Conversación
          </h3>
          <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Historial cronológico del ticket.
          </p>
        </div>

        {loadingMessages ? (
          <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
            Cargando conversación...
          </p>
        ) : null}

        {!loadingMessages && messages.length === 0 ? (
          <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
            Este ticket todavía no tiene mensajes registrados.
          </p>
        ) : null}

        {!loadingMessages && messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageCard key={message.id} item={message} />
            ))}
          </div>
        ) : null}
      </article>

      <article className="card-base p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            Responder ticket
          </h3>
          <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Esta respuesta quedará registrada en la conversación.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmitReply}>
          <div>
            <label htmlFor="replyText" className="label-base">
              Mensaje
            </label>
            <textarea
              id="replyText"
              name="replyText"
              className="input-base min-h-[160px] resize-y"
              placeholder="Escriba la respuesta administrativa del ticket."
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="adminAttachments" className="label-base">
              Adjuntos
            </label>
            <input
              ref={fileInputRef}
              id="adminAttachments"
              name="adminAttachments"
              type="file"
              accept={ACCEPTED_ATTACHMENT_INPUT}
              multiple
              className="input-base file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:file:bg-[#E0E0E0] dark:file:text-[#121212]"
              onChange={handleFileChange}
            />

            {selectedFiles.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFiles.map((file) => (
                  <span
                    key={`${file.name}-${file.size}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818] dark:text-[#E0E0E0]"
                  >
                    {file.name} · {formatFileSize(file.size)}
                    <button
                      type="button"
                      className="text-rose-500"
                      onClick={() => handleRemoveSelectedFile(file.name)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Link to={ROUTES.ADMIN_TICKETS} className="btn-secondary">
              Volver al listado
            </Link>

            <button type="submit" className="btn-primary" disabled={sendingReply}>
              {sendingReply ? "Enviando..." : "Enviar respuesta"}
            </button>
          </div>
        </form>
      </article>

      {showRelatedModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-[28px] border border-slate-200 bg-white shadow-2xl transition-colors duration-300 dark:border-[#444444] dark:bg-[#121212]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-[#444444]">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-[#E0E0E0]">
                  Relacionados del ticket
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-[#B0B0B0]">
                  Tickets del mismo cliente y fichas técnicas vinculadas a este ticket.
                </p>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowRelatedModal(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-5 px-6 py-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#444444] dark:bg-[#181818]">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
                  Tickets relacionados
                </h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-[#B0B0B0]">
                  Tickets del mismo cliente. Se muestran primero los del mismo sistema.
                </p>

                <div className="mt-4 max-h-[340px] overflow-y-auto pr-1">
                  <div className="space-y-3">
                    {relatedTickets.length > 0 ? (
                      relatedTickets.map((relatedTicket) => (
                        <RelatedTicketCard
                          key={relatedTicket.id}
                          item={relatedTicket}
                          onOpen={(id) => navigate(buildAdminTicketDetailRoute(id))}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-[#444444] dark:bg-[#1A1A1A] dark:text-[#B0B0B0]">
                        No hay otros tickets relacionados para este cliente.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#444444] dark:bg-[#181818]">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
                  Fichas técnicas vinculadas
                </h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-[#B0B0B0]">
                  Fichas creadas formalmente desde este ticket.
                </p>

                <div className="mt-4 max-h-[340px] overflow-y-auto pr-1">
                  <div className="space-y-3">
                    {linkedReports.length > 0 ? (
                      linkedReports.map((report) => (
                        <RelatedReportCard
                          key={report.id}
                          item={report}
                          onOpen={(id) =>
                            navigate(buildAdminTechnicalReportDetailRoute(id))
                          }
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-[#444444] dark:bg-[#1A1A1A] dark:text-[#B0B0B0]">
                        No hay fichas técnicas vinculadas a este ticket.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AdminTicketDetailPage;