import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TicketPriorityBadge from "../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../components/tickets/TicketStatusBadge";
import { ROUTES } from "../constants/routes";
import {
  addClientTicketMessage,
  subscribeTicketById,
  subscribeTicketMessages,
} from "../services/ticketService";
import { useAuth } from "../hooks/useAuth";
import {
  ACCEPTED_ATTACHMENT_INPUT,
  formatFileSize,
  getAttachmentExtension,
  getAttachmentKindLabel,
  isImageAttachment,
  validateAttachmentFiles,
} from "../utils/attachments";
import AttachmentViewerModal from "../components/shared/AttachmentViewerModal";

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
  divider: { borderColor: TOKENS.border },
};

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={ui.textMuted}>{label}</p>
      <p className="mt-1 text-sm" style={ui.text}>{value || "No definido"}</p>
    </div>
  );
}

function AttachmentCard({ attachment, onOpen }) {
  const isImage = isImageAttachment(attachment);
  return (
    <button type="button" onClick={() => onOpen(attachment)} className="group block overflow-hidden rounded-lg border text-left transition hover:shadow-md" style={ui.panel}>
      {isImage ? (
        <img src={attachment.url} alt={attachment.name || "Adjunto"} className="h-28 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-28 items-center justify-center text-sm font-semibold" style={ui.muted}>{getAttachmentExtension(attachment.name)}</div>
      )}
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium" style={ui.text}>{attachment.name || "Adjunto"}</p>
        <p className="text-xs" style={ui.textMuted}>{getAttachmentKindLabel(attachment.contentType)}{attachment.size ? ` · ${formatFileSize(attachment.size)}` : ""}</p>
      </div>
    </button>
  );
}

function MessageCard({ item, onOpenAttachment }) {
  const isSupport = item.senderRole !== "client";
  return (
    <article className="rounded-lg border p-4" style={isSupport ? ui.muted : ui.panel}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold" style={ui.text}>{item.senderName || "Sin nombre"}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.15em]" style={ui.textMuted}>{isSupport ? "Soporte" : "Cliente"}</p>
        </div>
        <p className="text-xs" style={ui.textMuted}>{formatDateTime(item.createdAt)}</p>
      </div>
      {item.message ? <p className="mt-4 whitespace-pre-line text-sm leading-7" style={ui.text}>{item.message}</p> : null}
      {Array.isArray(item.attachments) && item.attachments.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {item.attachments.map((attachment, index) => (
            <AttachmentCard key={`${attachment.path || attachment.url || index}`} attachment={attachment} onOpen={onOpenAttachment} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ClientTicketDetailPage() {
  const { ticketId } = useParams();
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeTicketById(
      ticketId,
      (data) => {
        setTicket(data);
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

  const sortedMessages = useMemo(() => messages, [messages]);

  function handleFileChange(event) {
    const result = validateAttachmentFiles(event.target.files);
    if (!result.ok) {
      setErrorMessage(result.message);
      event.target.value = "";
      setSelectedFiles([]);
      return;
    }
    setErrorMessage("");
    setSelectedFiles(result.files);
  }

  function handleRemoveSelectedFile(fileName) {
    const nextFiles = selectedFiles.filter((file) => file.name !== fileName);
    setSelectedFiles(nextFiles);
    if (!nextFiles.length && fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmitReply(event) {
    event.preventDefault();
    if (!replyText.trim() && selectedFiles.length === 0) return;

    setSendingReply(true);
    setErrorMessage("");
    try {
      await addClientTicketMessage(ticketId, replyText, currentUser, selectedFiles);
      setReplyText("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending client reply:", error);
      setErrorMessage(error.message || "No fue posible enviar la respuesta.");
    } finally {
      setSendingReply(false);
    }
  }

  if (loadingTicket) {
    return <section className="rounded-lg border px-4 py-10 shadow-sm" style={ui.panel}><p className="text-sm" style={ui.textMuted}>Cargando ticket...</p></section>;
  }

  if (!ticket) {
    return <section className="rounded-lg border px-4 py-10 shadow-sm" style={ui.panel}><p className="text-sm" style={ui.textMuted}>Ticket no encontrado.</p></section>;
  }

  return (
    <section className="space-y-4">
      <section className="rounded-lg border px-4 py-4 shadow-sm" style={ui.panel}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={ui.textMuted}>Mis tickets / Detalle</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em]" style={ui.textMuted}>{ticket.ticketNumber || ticket.id}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={ui.text}>{ticket.subject || 'Sin asunto'}</h1>
            <p className="mt-2 text-sm leading-6" style={ui.textMuted}>{ticket.description || 'Este ticket no tiene descripción inicial.'}</p>
          </div>
          <div className="flex gap-2">
            <Link to={ROUTES.CLIENT_TICKETS} className="rounded-md border px-4 py-2.5 text-sm font-medium transition" style={ui.input}>Volver al listado</Link>
          </div>
        </div>
      </section>

      {errorMessage ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{errorMessage}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <div className="space-y-4">
          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <div className="border-b pb-4" style={ui.divider}>
              <h2 className="text-lg font-semibold" style={ui.text}>Actividad</h2>
              <p className="mt-2 text-sm" style={ui.textMuted}>Conversación cronológica entre usted y el equipo de soporte.</p>
            </div>
            <div className="mt-5 max-h-[680px] space-y-4 overflow-y-auto pr-1">
              {loadingMessages ? (
                <p className="text-sm" style={ui.textMuted}>Cargando conversación...</p>
              ) : sortedMessages.length === 0 ? (
                <p className="text-sm" style={ui.textMuted}>Este ticket todavía no tiene mensajes registrados.</p>
              ) : (
                sortedMessages.map((item) => <MessageCard key={item.id} item={item} onOpenAttachment={setSelectedAttachment} />)
              )}
            </div>
          </article>

          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <div className="border-b pb-4" style={ui.divider}>
              <h2 className="text-lg font-semibold" style={ui.text}>Responder ticket</h2>
              <p className="mt-2 text-sm" style={ui.textMuted}>Agregue más información, evidencias o seguimiento para soporte.</p>
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleSubmitReply}>
              <textarea className="min-h-[180px] w-full rounded-md border px-3 py-3 text-sm leading-6 outline-none transition" style={ui.input} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Escriba su respuesta o seguimiento." />
              <div className="rounded-lg border border-dashed p-4" style={ui.muted}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium" style={ui.text}>Adjuntos</p>
                    <p className="mt-1 text-xs" style={ui.textMuted}>Puede adjuntar imágenes, PDF, TXT, CSV, JSON, ZIP, DOC/DOCX y XLS/XLSX.</p>
                  </div>
                  <label className="cursor-pointer rounded-md border px-4 py-2.5 text-sm font-medium transition" style={ui.input}>
                    Seleccionar archivos
                    <input ref={fileInputRef} type="file" className="hidden" multiple accept={ACCEPTED_ATTACHMENT_INPUT} onChange={handleFileChange} />
                  </label>
                </div>
                {selectedFiles.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedFiles.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" style={ui.panel}>
                        {file.name} · {formatFileSize(file.size)}
                        <button type="button" onClick={() => handleRemoveSelectedFile(file.name)} className="text-rose-500">×</button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link to={ROUTES.CLIENT_TICKETS} className="rounded-md border px-4 py-2.5 text-center text-sm font-medium transition" style={ui.input}>Volver</Link>
                <button type="submit" className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200" disabled={sendingReply}>
                  {sendingReply ? 'Enviando...' : 'Enviar respuesta'}
                </button>
              </div>
            </form>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <h2 className="text-lg font-semibold" style={ui.text}>Detalles</h2>
            <div className="mt-5 space-y-4">
              <InfoRow label="Sistema" value={ticket.systemId} />
              <InfoRow label="Categoría" value={ticket.category} />
              <InfoRow label="Cliente" value={ticket.clientId} />
              <InfoRow label="Creado" value={formatDateTime(ticket.createdAt)} />
              <InfoRow label="Último movimiento" value={formatDateTime(ticket.lastMessageAt || ticket.updatedAt)} />
              <InfoRow label="Asignado a" value={ticket.assignedToName || ticket.assignedToUid || 'Pendiente'} />
            </div>
          </article>
        </aside>
      </div>

      {selectedAttachment ? <AttachmentViewerModal attachment={selectedAttachment} onClose={() => setSelectedAttachment(null)} /> : null}
    </section>
  );
}

export default ClientTicketDetailPage;
