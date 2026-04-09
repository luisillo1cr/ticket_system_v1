/**
 * Admin ticket creation page.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAdminTicket } from "../services/ticketService";
import { subscribeClients, subscribeSystems } from "../services/clientService";
import { useAuth } from "../hooks/useAuth";
import { buildAdminTicketDetailRoute, ROUTES } from "../constants/routes";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
} from "../constants/tickets";
import {
  ACCEPTED_ATTACHMENT_INPUT,
  MAX_ATTACHMENT_FILES,
  formatFileSize,
  validateAttachmentFiles,
} from "../utils/attachments";

function AdminCreateTicketPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    clientId: "",
    systemId: "",
    subject: "",
    category: "technical",
    priority: "medium",
    description: "",
  });

  const [clients, setClients] = useState([]);
  const [systems, setSystems] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribeClients = subscribeClients(
      (data) => {
        setClients(data);
      },
      () => {
        console.error("No fue posible cargar clientes.");
      }
    );

    const unsubscribeSystems = subscribeSystems(
      (data) => {
        setSystems(data);
      },
      () => {
        console.error("No fue posible cargar sistemas.");
      }
    );

    return () => {
      unsubscribeClients();
      unsubscribeSystems();
    };
  }, []);

  const availableSystems = useMemo(() => {
    if (!form.clientId) {
      return [];
    }

    return systems.filter(
      (system) => system.clientId === form.clientId && system.status !== "archived"
    );
  }, [form.clientId, systems]);

  useEffect(() => {
    if (!form.clientId) {
      return;
    }

    if (!availableSystems.length) {
      setForm((prev) => ({
        ...prev,
        systemId: "",
      }));
      return;
    }

    const hasSelectedSystem = availableSystems.some(
      (system) => system.id === form.systemId
    );

    if (!hasSelectedSystem) {
      setForm((prev) => ({
        ...prev,
        systemId: availableSystems[0].id,
      }));
    }
  }, [availableSystems, form.clientId, form.systemId]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.clientId) || null,
    [clients, form.clientId]
  );

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === form.systemId) || null,
    [systems, form.systemId]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "clientId" ? { systemId: "" } : {}),
    }));
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!form.clientId.trim()) {
      setErrorMessage("El campo Cliente es obligatorio.");
      return;
    }

    if (!form.systemId.trim()) {
      setErrorMessage("El campo Sistema es obligatorio.");
      return;
    }

    if (!form.subject.trim()) {
      setErrorMessage("El asunto del ticket es obligatorio.");
      return;
    }

    if (!form.description.trim()) {
      setErrorMessage("La descripción del ticket es obligatoria.");
      return;
    }

    setSubmitting(true);

    try {
      const createdTicket = await createAdminTicket(form, currentUser, selectedFiles);
      navigate(buildAdminTicketDetailRoute(createdTicket.id), { replace: true });
    } catch (error) {
      console.error("Error creating admin ticket:", error);
      setErrorMessage(
        "No fue posible crear el ticket. Verifique la configuración y las reglas."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            Tickets
          </p>
          <h2 className="section-title">Nuevo ticket</h2>
          <p className="section-subtitle mt-2">
            Registro inicial de tickets administrativos con numeración segura,
            adjuntos y estructura profesional.
          </p>
        </div>
      </header>

      <article className="card-base p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="clientId" className="label-base">
                Cliente
              </label>
              <select
                id="clientId"
                name="clientId"
                className="input-base"
                value={form.clientId}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione un cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name || client.company || client.id} ({client.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="systemId" className="label-base">
                Sistema
              </label>
              <select
                id="systemId"
                name="systemId"
                className="input-base"
                value={form.systemId}
                onChange={handleChange}
                required
                disabled={!form.clientId || !availableSystems.length}
              >
                <option value="">
                  {!form.clientId
                    ? "Seleccione primero un cliente"
                    : availableSystems.length
                    ? "Seleccione un sistema"
                    : "Este cliente no tiene sistemas registrados"}
                </option>
                {availableSystems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name || system.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedClient ? (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                  Cliente seleccionado
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                  {selectedClient.name || selectedClient.company || selectedClient.id}
                </p>
                <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                  {selectedClient.email || "Sin correo registrado"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                  Sistema seleccionado
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                  {selectedSystem?.name || "Sin sistema seleccionado"}
                </p>
                <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                  {selectedSystem?.type || "Sin tipo definido"}
                </p>
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor="subject" className="label-base">
              Asunto
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              className="input-base"
              placeholder="Describa brevemente la solicitud o incidente"
              value={form.subject}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="category" className="label-base">
                Categoría
              </label>
              <select
                id="category"
                name="category"
                className="input-base"
                value={form.category}
                onChange={handleChange}
              >
                {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="label-base">
                Prioridad
              </label>
              <select
                id="priority"
                name="priority"
                className="input-base"
                value={form.priority}
                onChange={handleChange}
              >
                {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="label-base">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              className="input-base min-h-[160px] resize-y"
              placeholder="Explique el problema, contexto o solicitud con el mayor detalle posible."
              value={form.description}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="adminInitialAttachments" className="label-base">
              Adjuntos iniciales
            </label>
            <input
              ref={fileInputRef}
              id="adminInitialAttachments"
              name="adminInitialAttachments"
              type="file"
              accept={ACCEPTED_ATTACHMENT_INPUT}
              multiple
              className="input-base file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:file:bg-[#E0E0E0] dark:file:text-[#121212]"
              onChange={handleFileChange}
            />
            <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
              Puede adjuntar hasta {MAX_ATTACHMENT_FILES} archivos. Formatos:
              imágenes, PDF, TXT, CSV, JSON, ZIP, DOC/DOCX y XLS/XLSX.
            </p>

            {selectedFiles.length > 0 ? (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818] dark:text-[#E0E0E0]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-[#888888]">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary px-3 py-2"
                      onClick={() => handleRemoveSelectedFile(file.name)}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Creado por
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                {currentUser?.name || currentUser?.email || "Administrador"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Estado inicial
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                Abierto
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(ROUTES.ADMIN_TICKETS)}
              disabled={submitting}
            >
              Cancelar
            </button>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creando ticket..." : "Crear ticket"}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}

export default AdminCreateTicketPage;
