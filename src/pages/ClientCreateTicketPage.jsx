/**
 * Client ticket creation page.
 */

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

const PROFILE_PREFILL_MAP = {
  email_change: {
    subject: "Solicitud de cambio de correo de acceso",
    category: "request",
    priority: "medium",
    description:
      "Solicito actualizar el correo asociado a mi acceso al portal. Indique por favor el nuevo correo autorizado y cualquier validación necesaria para completar el cambio.",
  },
};

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
    if (!systems.length) {
      return;
    }

    if (!systems.some((system) => system.id === form.systemId)) {
      setForm((prev) => ({
        ...prev,
        systemId: systems[0].id,
      }));
    }
  }, [systems, form.systemId]);

  useEffect(() => {
    const prefillKey = String(searchParams.get("reason") || "").trim().toLowerCase();
    const prefill = PROFILE_PREFILL_MAP[prefillKey];

    if (!prefill) {
      return;
    }

    setForm((prev) => {
      if (prev.subject || prev.description) {
        return prev;
      }

      return {
        ...prev,
        subject: prefill.subject,
        category: prefill.category,
        priority: prefill.priority,
        description: prefill.description,
      };
    });
  }, [searchParams]);

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === form.systemId) || null,
    [systems, form.systemId]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
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

    if (!form.systemId.trim()) {
      setErrorMessage("El campo Sistema es obligatorio.");
      return;
    }

    if (!form.subject.trim()) {
      setErrorMessage("El asunto es obligatorio.");
      return;
    }

    if (!form.description.trim()) {
      setErrorMessage("La descripción es obligatoria.");
      return;
    }

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
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
            Solicitar asistencia
          </p>
          <h2 className="section-title">Nuevo ticket</h2>
          <p className="section-subtitle mt-2">
            Envíe su solicitud de soporte con el mayor detalle posible y adjunte
            evidencia desde el primer momento.
          </p>
        </div>

        <div>
          <button type="button" className="btn-secondary" onClick={() => navigate(ROUTES.CLIENT_PROFILE)}>
            Volver a mi información
          </button>
        </div>
      </header>

      <article className="card-base p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
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
              disabled={!systems.length}
            >
              <option value="">
                {systems.length ? "Seleccione un sistema" : "No hay sistemas registrados para su cuenta"}
              </option>
              {systems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.name || system.id}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
              Si no ve su sistema en la lista, solicite al administrador que lo asocie a su cuenta.
            </p>
          </div>

          {selectedSystem ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Sistema seleccionado
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                {selectedSystem.name || selectedSystem.id}
              </p>
              <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                {selectedSystem.type || "Sin tipo definido"}
              </p>
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
              placeholder="Describa brevemente su problema o solicitud"
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
              placeholder="Explique el problema, contexto o solicitud con detalle."
              value={form.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="attachments" className="label-base">
              Adjuntos iniciales
            </label>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#1A1A1A]">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label htmlFor="attachments" className="btn-secondary cursor-pointer">
                    Elegir archivos
                  </label>

                  <input
                    id="attachments"
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_ATTACHMENT_INPUT}
                    multiple
                    onChange={handleFileChange}
                  />

                  <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                    {selectedFiles.length
                      ? `${selectedFiles.length} archivo${selectedFiles.length === 1 ? "" : "s"}`
                      : "Sin archivos seleccionados"}
                  </p>
                </div>

                <p className="text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                  Puede adjuntar hasta {MAX_ATTACHMENT_FILES} archivos. Formatos: imágenes, PDF, TXT,
                  CSV, JSON, ZIP, DOC/DOCX y XLS/XLSX.
                </p>
              </div>
            </div>

            {selectedFiles.length > 0 ? (
              <div className="space-y-3">
                {selectedFiles.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between dark:border-[#444444] dark:bg-[#181818]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                        {file.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary w-full sm:w-auto"
                      onClick={() => handleRemoveSelectedFile(file.name)}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(ROUTES.CLIENT_TICKETS)}
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

export default ClientCreateTicketPage;
