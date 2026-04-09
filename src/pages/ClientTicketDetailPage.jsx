/**
 * Client single ticket detail page with conversation timeline.
 */

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

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">{label}</p>
      <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">{value || "No definido"}</p>
    </div>
  );
}

function AttachmentCard({ attachment, onOpen }) {
  const isImage = isImageAttachment(attachment);
  return (
    <button type="button" onClick={() => onOpen(attachment)} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:shadow-md dark:border-[#444444] dark:bg-[#1A1A1A]">
      {isImage ? <img src={attachment.url} alt={attachment.name || "Adjunto"} className="h-32 w-full object-cover" loading="lazy" /> : <div className="flex h-32 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-[#181818] dark:text-[#B0B0B0]">{getAttachmentExtension(attachment.name)}</div>}
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-[#E0E0E0]">{attachment.name || "Adjunto"}</p>
        <p className="text-xs text-slate-500 dark:text-[#888888]">{getAttachmentKindLabel(attachment.contentType)}{attachment.size ? ` · ${formatFileSize(attachment.size)}` : ""}</p>
      </div>
    </button>
  );
}

function MessageCard({ item, onOpenAttachment }) {
  const isStaff = item.senderRole === "admin" || item.senderRole === "agent";
  return (
    <article className={`rounded-2xl border p-4 transition-colors duration-300 ${isStaff ? "border-slate-200 bg-slate-50 dark:border-[#444444] dark:bg-[#181818]" : "border-slate-200 bg-white dark:border-[#444444] dark:bg-[#1A1A1A]"}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">{item.senderName || "Sin nombre"}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">{isStaff ? "Soporte" : "Cliente"}</p>
        </div>
        <p className="text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">{formatDateTime(item.createdAt)}</p>
      </div>
      {item.message ? <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">{item.message}</p> : null}
      {Array.isArray(item.attachments) && item.attachments.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{item.attachments.map((attachment, index) => <AttachmentCard key={`${attachment.path || attachment.url || index}`} attachment={attachment} onOpen={onOpenAttachment} />)}</div> : null}
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
    const unsubscribe = subscribeTicketById(ticketId, (data) => {
      setTicket(data);
      setLoadingTicket(false);
    }, () => {
      setErrorMessage("No fue posible cargar el detalle del ticket.");
      setLoadingTicket(false);
    });
    return () => unsubscribe();
  }, [ticketId]);

  useEffect(() => {
    const unsubscribe = subscribeTicketMessages(ticketId, (data) => {
      setMessages(data);
      setLoadingMessages(false);
    }, () => {
      setErrorMessage("No fue posible cargar la conversación del ticket.");
      setLoadingMessages(false);
    });
    return () => unsubscribe();
  }, [ticketId]);

  const sortedMessages = useMemo(() => messages, [messages]);

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
    if (!nextFiles.length && fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmitReply = async (event) => {
    event.preventDefault();
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
  };

  if (loadingTicket) return <section className="card-base p-6">Cargando ticket...</section>;
  if (!ticket) return <section className="card-base p-6">Ticket no encontrado.</section>;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-[#888888]">Mis tickets</p>
          <h2 className="section-title">{ticket.subject || "Sin asunto"}</h2>
          <p className="section-subtitle mt-2">{ticket.ticketNumber || ticket.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3"><TicketStatusBadge status={ticket.status} /><TicketPriorityBadge priority={ticket.priority} /></div>
      </header>

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{errorMessage}</div> : null}

      <article className="card-base p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Sistema" value={ticket.systemId} />
          <InfoItem label="Categoría" value={ticket.category} />
          <InfoItem label="Cliente" value={ticket.clientId} />
          <InfoItem label="Creado" value={formatDateTime(ticket.createdAt)} />
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#444444] dark:bg-[#181818]">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-[#888888]">Descripción inicial</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-[#E0E0E0]">{ticket.description || "Sin descripción inicial."}</p>
        </div>
      </article>

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">Conversación</h3>
        <div className="mt-5 space-y-4 max-h-[640px] overflow-y-auto pr-1">
          {loadingMessages ? <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">Cargando conversación...</p> : sortedMessages.map((item) => <MessageCard key={item.id} item={item} onOpenAttachment={setSelectedAttachment} />)}
        </div>
      </article>

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">Responder ticket</h3>
        <form className="mt-5 space-y-4" onSubmit={handleSubmitReply}>
          <textarea className="input-base min-h-[160px] resize-y" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Agregue más información, evidencia o seguimiento al ticket." />
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-[#444444] dark:bg-[#181818]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-[#E0E0E0]">Adjuntos</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-[#888888]">Puede adjuntar imágenes, PDF, TXT, CSV, JSON, ZIP, DOC/DOCX y XLS/XLSX.</p>
              </div>
              <label className="btn-secondary cursor-pointer">Seleccionar archivos<input ref={fileInputRef} type="file" className="hidden" multiple accept={ACCEPTED_ATTACHMENT_INPUT} onChange={handleFileChange} /></label>
            </div>
            {selectedFiles.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{selectedFiles.map((file) => <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-[#444444] dark:bg-[#121212] dark:text-[#E0E0E0]">{file.name} · {formatFileSize(file.size)}<button type="button" onClick={() => handleRemoveSelectedFile(file.name)} className="text-rose-500">×</button></span>)}</div> : null}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link to={ROUTES.CLIENT_TICKETS} className="btn-secondary">Volver</Link><button type="submit" className="btn-primary" disabled={sendingReply}>{sendingReply ? "Enviando..." : "Enviar respuesta"}</button></div>
        </form>
      </article>

      {selectedAttachment ? <AttachmentViewerModal attachment={selectedAttachment} onClose={() => setSelectedAttachment(null)} /> : null}
    </section>
  );
}

export default ClientTicketDetailPage;
