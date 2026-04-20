import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES, buildAdminTicketDetailRoute } from "../constants/routes";
import { createAdminTicket } from "../services/ticketService";
import { subscribeClients, subscribeSystemsByClient } from "../services/clientService";
import { subscribeInternalUsers } from "../services/userService";
import { useAuth } from "../hooks/useAuth";
import { isAdminRole } from "../utils/permissions";

const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.json,.zip,.doc,.docx,.xls,.xlsx";

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

function SelectedFileRow({ file, onRemove }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3" style={ui.panel}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" style={ui.text}>{file.name}</p>
        <p className="mt-1 text-xs" style={ui.textMuted}>{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      <button type="button" className="rounded-md border px-3 py-2 text-xs font-medium transition" style={ui.input} onClick={() => onRemove(file.name)}>
        Quitar
      </button>
    </div>
  );
}

function AdminCreateTicketPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  const incomingParentTicket = location.state?.parentTicket || null;
  const incomingSuggestedType = location.state?.suggestedType || "task";

  const [clients, setClients] = useState([]);
  const [systems, setSystems] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [form, setForm] = useState({
    type: incomingSuggestedType,
    subject: incomingParentTicket ? `${incomingSuggestedType === "incident" ? "Incidente" : "Child ticket"}: ${incomingParentTicket.subject}` : "",
    description: "",
    clientId: incomingParentTicket?.clientId || "",
    systemId: incomingParentTicket?.systemId || "",
    category: "soporte",
    priority: "medium",
    assignedToUid: currentUser?.uid || "",
    assignedToName: currentUser?.name || currentUser?.email || "",
    parentTicketId: incomingParentTicket?.id || "",
    parentTicketNumber: incomingParentTicket?.ticketNumber || "",
  });

  useEffect(() => {
    const unsubscribeClients = subscribeClients(setClients, () => {});
    return () => unsubscribeClients();
  }, []);

  useEffect(() => {
    if (!form.clientId) {
      setSystems([]);
      return () => {};
    }
    const unsubscribeSystems = subscribeSystemsByClient(form.clientId, setSystems, () => {});
    return () => unsubscribeSystems();
  }, [form.clientId]);

  useEffect(() => {
    if (!isAdminRole(currentUser)) {
      setStaffUsers([]);
      return () => {};
    }
    const unsubscribeUsers = subscribeInternalUsers(setStaffUsers, () => {});
    return () => unsubscribeUsers();
  }, [currentUser]);

  const filteredSystems = useMemo(
    () => systems.filter((item) => !form.clientId || item.clientId === form.clientId),
    [systems, form.clientId]
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "clientId") next.systemId = "";
      if (name === "assignedToUid") {
        const selected = staffUsers.find((item) => item.id === value);
        next.assignedToName = selected?.name || currentUser?.name || currentUser?.email || "";
      }
      return next;
    });
  }

  function handleFileChange(event) {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  }

  function handleRemoveFile(fileName) {
    const nextFiles = selectedFiles.filter((file) => file.name !== fileName);
    setSelectedFiles(nextFiles);
    if (nextFiles.length === 0 && fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const created = await createAdminTicket(form, currentUser, selectedFiles);
      navigate(buildAdminTicketDetailRoute(created.id));
    } catch (error) {
      console.error("Error creating admin ticket:", error);
      setErrorMessage(error.message || "No fue posible crear el ticket.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  return (
    <section className="space-y-4">
      <section className="rounded-lg border px-4 py-4 shadow-sm" style={ui.panel}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={ui.textMuted}>Tickets / Crear</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={ui.text}>Crear ticket</h1>
            <p className="mt-2 text-sm" style={ui.textMuted}>Formulario operativo para registrar tasks, requests, incidentes o child tickets.</p>
          </div>
          <div className="flex gap-2">
            <Link to={ROUTES.ADMIN_TICKETS} className="rounded-md border px-4 py-2.5 text-sm font-medium transition" style={ui.input}>Volver al listado</Link>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <div className="space-y-4">
          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <div className="border-b pb-4" style={ui.divider}>
              <h2 className="text-lg font-semibold" style={ui.text}>Información principal</h2>
              <p className="mt-2 text-sm" style={ui.textMuted}>Resumen corto, cliente correcto, sistema correcto y clasificación útil.</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="ticketType" className="mb-2 block text-sm font-medium" style={ui.text}>Tipo</label>
                <select id="ticketType" name="type" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.type} onChange={handleChange}>
                  <option value="task">Task</option>
                  <option value="request">Request</option>
                  <option value="incident">Incident</option>
                  <option value="problem">Problem</option>
                  <option value="subtask">Child ticket</option>
                </select>
              </div>

              <div>
                <label htmlFor="ticketCategory" className="mb-2 block text-sm font-medium" style={ui.text}>Categoría</label>
                <input id="ticketCategory" name="category" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.category} onChange={handleChange} placeholder="Ej. soporte, bug, acceso" />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="ticketSubject" className="mb-2 block text-sm font-medium" style={ui.text}>Resumen</label>
                <input id="ticketSubject" name="subject" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.subject} onChange={handleChange} placeholder="Resumen corto y útil del ticket" required />
              </div>

              <div>
                <label htmlFor="ticketClient" className="mb-2 block text-sm font-medium" style={ui.text}>Cliente</label>
                <select id="ticketClient" name="clientId" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.clientId} onChange={handleChange} required>
                  <option value="">Seleccione un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.company || client.name || client.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ticketSystem" className="mb-2 block text-sm font-medium" style={ui.text}>Sistema</label>
                <select id="ticketSystem" name="systemId" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.systemId} onChange={handleChange} required>
                  <option value="">Seleccione un sistema</option>
                  {filteredSystems.map((system) => (
                    <option key={system.id} value={system.id}>{system.name || system.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ticketPriority" className="mb-2 block text-sm font-medium" style={ui.text}>Prioridad</label>
                <select id="ticketPriority" name="priority" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.priority} onChange={handleChange}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label htmlFor="ticketAssignee" className="mb-2 block text-sm font-medium" style={ui.text}>Asignado a</label>
                {isAdminRole(currentUser) ? (
                  <select id="ticketAssignee" name="assignedToUid" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={form.assignedToUid} onChange={handleChange}>
                    {staffUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.name || user.email}</option>
                    ))}
                  </select>
                ) : (
                  <input id="ticketAssignee" className="h-11 w-full rounded-md border px-3 text-sm outline-none transition" style={ui.input} value={currentUser?.name || currentUser?.email || 'Agente'} disabled />
                )}
              </div>
            </div>
          </article>

          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <div className="border-b pb-4" style={ui.divider}>
              <h2 className="text-lg font-semibold" style={ui.text}>Descripción</h2>
              <p className="mt-2 text-sm" style={ui.textMuted}>Contexto, impacto, evidencias y datos técnicos relevantes.</p>
            </div>
            <div className="mt-5">
              <label htmlFor="ticketDescription" className="mb-2 block text-sm font-medium" style={ui.text}>Detalle</label>
              <textarea id="ticketDescription" name="description" className="min-h-[220px] w-full rounded-md border px-3 py-3 text-sm leading-6 outline-none transition" style={ui.input} value={form.description} onChange={handleChange} placeholder="Describe el problema, solicitud o contexto técnico con el mayor valor posible." required />
            </div>
          </article>

          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <div className="border-b pb-4" style={ui.divider}>
              <h2 className="text-lg font-semibold" style={ui.text}>Adjuntos</h2>
              <p className="mt-2 text-sm" style={ui.textMuted}>Conserve el flujo de seleccionar y quitar archivos antes de guardar.</p>
            </div>
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border p-4" style={ui.muted}>
                <label htmlFor="ticketAttachments" className="inline-flex cursor-pointer rounded-md border px-4 py-2.5 text-sm font-medium transition" style={ui.input}>Elegir archivos</label>
                <input ref={fileInputRef} id="ticketAttachments" type="file" className="hidden" multiple accept={ACCEPT_ATTR} onChange={handleFileChange} />
                <p className="mt-3 text-xs" style={ui.textMuted}>Puede adjuntar imágenes, PDF, TXT, CSV, JSON, ZIP, DOC/DOCX y XLS/XLSX.</p>
              </div>

              {selectedFiles.length > 0 ? (
                <div className="space-y-3">
                  {selectedFiles.map((file) => (
                    <SelectedFileRow key={`${file.name}-${file.size}`} file={file} onRemove={handleRemoveFile} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm" style={ui.muted}>Aún no hay archivos seleccionados.</div>
              )}
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-lg border p-5 shadow-sm" style={ui.panel}>
            <h2 className="text-lg font-semibold" style={ui.text}>Detalles rápidos</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={ui.textMuted}>Estado inicial</dt>
                <dd className="mt-1" style={ui.text}>Abierto</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={ui.textMuted}>Creado por</dt>
                <dd className="mt-1" style={ui.text}>{currentUser?.name || currentUser?.email || 'Soporte'}</dd>
              </div>
              {form.parentTicketNumber ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={ui.textMuted}>Ticket padre</dt>
                  <dd className="mt-1" style={ui.text}>{form.parentTicketNumber}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={ui.textMuted}>Cliente</dt>
                <dd className="mt-1" style={ui.text}>{clients.find((item) => item.id === form.clientId)?.company || clients.find((item) => item.id === form.clientId)?.name || 'Pendiente'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={ui.textMuted}>Sistema</dt>
                <dd className="mt-1" style={ui.text}>{filteredSystems.find((item) => item.id === form.systemId)?.name || 'Pendiente'}</dd>
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
              <Link to={ROUTES.ADMIN_TICKETS} className="rounded-md border px-4 py-2.5 text-center text-sm font-medium transition" style={ui.input}>Cancelar</Link>
            </div>
          </article>
        </aside>
      </form>
    </section>
  );
}

export default AdminCreateTicketPage;
