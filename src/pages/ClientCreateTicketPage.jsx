import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from "../constants/tickets";
import { ROUTES, buildClientTicketDetailRoute } from "../constants/routes";
import { createClientTicket } from "../services/ticketService";
import { subscribeSystemsByClient } from "../services/clientService";
import { useAuth } from "../hooks/useAuth";
import {
  ACCEPTED_ATTACHMENT_INPUT,
  MAX_ATTACHMENT_FILES,
  formatFileSize,
  validateAttachmentFiles,
} from "../utils/attachments";

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

const PROFILE_PREFILL_MAP = {
  email_change: {
    subject: "Solicitud de cambio de correo de acceso",
    category: "request",
    priority: "medium",
    description:
      "Solicito actualizar el correo asociado a mi acceso al portal. Indique por favor el nuevo correo autorizado y cualquier validación necesaria para completar el cambio.",
  },
};

function SelectedFileRow({ file, onRemove }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3" style={ui.panel}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" style={ui.text}>{file.name}</p>
        <p className="mt-1 text-xs" style={ui.textMuted}>{formatFileSize(file.size)}</p>
      </div>
      <button type="button" onClick={() => onRemove(file.name)} className="rounded-md border px-3 py-2 text-xs font-medium transition" style={ui.input}>
        Quitar
      </button>
    </div>
  );
}

function ClientCreateTicketPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    systemId: "",
    subject: "",
    category: "technical",
    priority: "medium",
    description: "",
  });

  const [systems, setSystems] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!currentUser?.clientId) {
      setSystems([]);
      return () => {};
    }

    return subscribeSystemsByClient(
      currentUser.clientId,
      (data) => {
        setSystems(data.filter((system) => system.status !== "archived"));
      },
      () => {
        console.error("No fue posible cargar sistemas del cliente.");
      }
    );
  }, [currentUser?.clientId]);

  useEffect(() => {
    if (!systems.length) return;
    if (!systems.some((system) => system.id === form.systemId)) {
      setForm((prev) => ({ ...prev, systemId: systems[0].id }));
    }
  }, [systems, form.systemId]);

  useEffect(() => {
    const prefillKey = String(searchParams.get("reason") || "").trim().toLowerCase();
    const prefill = PROFILE_PREFILL_MAP[prefillKey];
    if (!prefill) return;

    setForm((prev) => {
      if (prev.subject || prev.description) return prev;
      return { ...prev, ...prefill };
    });
  }, [searchParams]);

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === form.systemId) || null,
    [systems, form.systemId]
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

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

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.systemId.trim()) return setErrorMessage("El campo Sistema es obligatorio.");
    if (!form.subject.trim()) return setErrorMessage("El asunto es obligatorio.");
    if (!form.description.trim()) return setErrorMessage("La descripción es obligatoria.");

    setSubmitting(true);
    try {
      const createdTicket = await createClientTicket(form, currentUser, selectedFiles);
      navigate(buildClientTicketDetailRoute(createdTicket.id), { replace: true });
    } catch (error) {
      console.error("Error creating client ticket:", error);
      setErrorMessage("No fue posible crear el ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <section className="rounded-lg border px-4 py-4 shadow-sm" style={ui.panel}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={ui.textMuted}>Tickets / Crear</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={ui.text}>Nuevo ticket</h1>
            <p className="mt-2 text-sm" style={ui.textMuted}>Registre una solicitud con el formato más claro posible para acelerar la atención.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate(ROUTES.CLIENT_PROFILE)} className="rounded-md border px-4 py-2.5 text-sm font-medium transition" style={ui.input}>Volver a mi información</button>
            <button type="button" onClick={() => navigate(ROUTES.CLIENT_TICKETS)} className="rounded-md border px-4 py-2.5 text-sm font-medium transition" style={ui.input}>Mis tickets</button>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <div className="space-y-4">
          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <div className="border-b pb-4" style={ui.divider}>
              <h2 className="text-lg font-semibold" style={ui.text}>Información principal</h2>
              <p className="mt-2 text-sm" style={ui.textMuted}>Seleccione el sistema correcto, un resumen útil y prioridad real.</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="systemId" className="mb-2 block text-sm font-medium" style={ui.text}>Sistema</label>
                <select id="systemId" name="systemId" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.systemId} onChange={handleChange} required disabled={!systems.length}>
                  <option value="">{systems.length ? "Seleccione un sistema" : "No hay sistemas registrados para su cuenta"}</option>
                  {systems.map((system) => (
                    <option key={system.id} value={system.id}>{system.name || system.id}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs" style={ui.textMuted}>Si no ve su sistema en la lista, solicite al administrador que lo asocie a su cuenta.</p>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="subject" className="mb-2 block text-sm font-medium" style={ui.text}>Resumen</label>
                <input id="subject" name="subject" type="text" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} placeholder="Describa brevemente su problema o solicitud" value={form.subject} onChange={handleChange} required />
              </div>

              <div>
                <label htmlFor="category" className="mb-2 block text-sm font-medium" style={ui.text}>Categoría</label>
                <select id="category" name="category" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.category} onChange={handleChange}>
                  {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="mb-2 block text-sm font-medium" style={ui.text}>Prioridad</label>
                <select id="priority" name="priority" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.priority} onChange={handleChange}>
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </article>

          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <div className="border-b pb-4" style={ui.divider}>
              <h2 className="text-lg font-semibold" style={ui.text}>Descripción</h2>
              <p className="mt-2 text-sm" style={ui.textMuted}>Explique contexto, impacto, síntomas y cualquier dato útil para soporte.</p>
            </div>

            <div className="mt-5">
              <label htmlFor="description" className="mb-2 block text-sm font-medium" style={ui.text}>Detalle</label>
              <textarea id="description" name="description" className="min-h-[220px] w-full rounded-md border px-3 py-3 text-sm leading-6 outline-none transition" style={ui.input} placeholder="Explique el problema, contexto o solicitud con detalle." value={form.description} onChange={handleChange} required />
            </div>
          </article>

          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <div className="border-b pb-4" style={ui.divider}>
              <h2 className="text-lg font-semibold" style={ui.text}>Adjuntos</h2>
              <p className="mt-2 text-sm" style={ui.textMuted}>Puede adjuntar hasta {MAX_ATTACHMENT_FILES} archivos antes de enviar el ticket.</p>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-lg border p-4" style={ui.muted}>
                <label className="inline-flex cursor-pointer rounded-md border px-4 py-2.5 text-sm font-medium transition" style={ui.input}>
                  Elegir archivos
                  <input ref={fileInputRef} type="file" className="hidden" multiple accept={ACCEPTED_ATTACHMENT_INPUT} onChange={handleFileChange} />
                </label>
                <p className="mt-3 text-xs" style={ui.textMuted}>Formatos permitidos: imágenes, PDF, TXT, CSV, JSON, ZIP, DOC/DOCX y XLS/XLSX.</p>
              </div>

              {selectedFiles.length > 0 ? (
                <div className="space-y-3">
                  {selectedFiles.map((file) => (
                    <SelectedFileRow key={`${file.name}-${file.size}`} file={file} onRemove={handleRemoveSelectedFile} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm" style={ui.muted}>
                  Aún no hay archivos seleccionados.
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <h2 className="text-lg font-semibold" style={ui.text}>Resumen</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={ui.textMuted}>Estado inicial</dt>
                <dd className="mt-1" style={ui.text}>Abierto</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={ui.textMuted}>Cliente</dt>
                <dd className="mt-1" style={ui.text}>{currentUser?.clientId || 'Mi cuenta'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={ui.textMuted}>Sistema seleccionado</dt>
                <dd className="mt-1" style={ui.text}>{selectedSystem?.name || selectedSystem?.id || 'Pendiente'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={ui.textMuted}>Prioridad</dt>
                <dd className="mt-1" style={ui.text}>{TICKET_PRIORITY_LABELS[form.priority] || 'Media'}</dd>
              </div>
            </dl>
          </article>

          {errorMessage ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{errorMessage}</div>
          ) : null}

          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <div className="flex flex-col gap-3">
              <button type="submit" className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200" disabled={submitting}>
                {submitting ? 'Creando ticket...' : 'Crear ticket'}
              </button>
              <button type="button" onClick={() => navigate(ROUTES.CLIENT_TICKETS)} className="rounded-md border px-4 py-2.5 text-sm font-medium transition" style={ui.input}>
                Cancelar
              </button>
            </div>
          </article>
        </aside>
      </form>
    </section>
  );
}

export default ClientCreateTicketPage;
