/**
 * Admin technical report detail page.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import {
  addTechnicalReportAttachments,
  subscribeTechnicalReportById,
} from "../services/technicalReportService";
import {
  formatFileSize,
  validateReportAttachmentFiles,
} from "../utils/reportAttachments";

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

function TabButton({ active, onClick, label, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-300 ${
        active
          ? "border-slate-900 bg-slate-900 text-white dark:border-[#E0E0E0] dark:bg-[#E0E0E0] dark:text-[#121212]"
          : "border-slate-200 bg-white text-slate-700 dark:border-[#444444] dark:bg-[#1A1A1A] dark:text-[#E0E0E0]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SectionList({ items, emptyLabel = "No hay registros.", maxVisible = 3 }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
        {emptyLabel}
      </p>
    );
  }

  const shouldScroll = items.length > maxVisible;

  return (
    <div className="flex min-h-[220px] flex-col">
      <div className={shouldScroll ? "max-h-[220px] overflow-y-auto pr-1" : "flex-1"}>
        <ul className="grid gap-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818] dark:text-[#E0E0E0]"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      {shouldScroll ? (
        <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          Se muestran hasta 3 bloques visibles por vez. Deslice dentro de la lista para ver los demás.
        </p>
      ) : null}
    </div>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 5.5a4 4 0 0 0 4.9 4.9l-7.7 7.7a2 2 0 1 1-2.8-2.8l7.7-7.7a4 4 0 0 0-4.9-4.9l2.8-2.8Z" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 8 4.5-8 4.5-8-4.5L12 3Zm8 4.5V16.5L12 21m8-13.5L12 12m0 9V12M4 7.5V16.5L12 21" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6m-5 3h4m-5.2-6.2A6 6 0 1 1 15.2 14.8c-.77.77-1.2 1.82-1.2 2.91V18h-4v-.29c0-1.09-.43-2.14-1.2-2.91Z" />
    </svg>
  );
}

function AdminTechnicalReportDetailPage() {
  const { reportId } = useParams();
  const fileInputRef = useRef(null);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("receipt");

  useEffect(() => {
    const unsubscribe = subscribeTechnicalReportById(
      reportId,
      (data) => {
        setReport(data);
        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar la ficha técnica.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [reportId]);

  const handleFileChange = (event) => {
    const result = validateReportAttachmentFiles(event.target.files);

    if (!result.ok) {
      setErrorMessage(result.message);
      event.target.value = "";
      setSelectedFiles([]);
      return;
    }

    setErrorMessage("");
    setSelectedFiles(result.files);
  };

  const handleUploadAttachments = async (event) => {
    event.preventDefault();

    if (!selectedFiles.length) {
      return;
    }

    setUploading(true);
    setErrorMessage("");

    try {
      await addTechnicalReportAttachments(reportId, selectedFiles);
      setSelectedFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading technical report attachments:", error);
      setErrorMessage("No fue posible subir los archivos de la ficha técnica.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <section className="card-base p-6">
        <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
          Cargando ficha técnica...
        </p>
      </section>
    );
  }

  if (errorMessage && !report) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        {errorMessage}
      </section>
    );
  }

  if (!report) {
    return (
      <section className="card-base p-6">
        <h2 className="text-lg font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          Ficha técnica no encontrada
        </h2>
        <div className="mt-5">
          <Link to={ROUTES.ADMIN_TECHNICAL_REPORTS} className="btn-secondary">
            Volver al listado
          </Link>
        </div>
      </section>
    );
  }

  const attachments = Array.isArray(report.attachments) ? report.attachments : [];

  return (
    <section className="space-y-6">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          Ficha técnica
        </p>
        <h2 className="section-title">
          {report.deviceType || "Equipo"} {report.brand || ""} {report.model || ""}
        </h2>
        <p className="section-subtitle mt-2">{report.reportNumber || report.id}</p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      ) : null}

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          Información general
        </h3>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="Cliente" value={report.clientId} />
          <InfoItem label="Cotización relacionada" value={report.quoteId} />
          <InfoItem label="Tipo de equipo" value={report.deviceType} />
          <InfoItem label="Marca" value={report.brand} />
          <InfoItem label="Modelo" value={report.model} />
          <InfoItem label="Serie" value={report.serialNumber} />
          <InfoItem label="Estado" value={report.status || "draft"} />
          <InfoItem label="Creado por" value={report.createdByName} />
          <InfoItem label="Creado" value={formatDateTime(report.createdAt)} />
          <InfoItem label="Actualizado" value={formatDateTime(report.updatedAt)} />
        </div>
      </article>

      <article className="card-base p-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <TabButton
            active={activeTab === "receipt"}
            onClick={() => setActiveTab("receipt")}
            label="Ingreso"
            icon={<ReceiptIcon />}
          />
          <TabButton
            active={activeTab === "diagnostics"}
            onClick={() => setActiveTab("diagnostics")}
            label="Diagnóstico"
            icon={<SearchIcon />}
          />
          <TabButton
            active={activeTab === "procedures"}
            onClick={() => setActiveTab("procedures")}
            label="Procedimientos"
            icon={<WrenchIcon />}
          />
          <TabButton
            active={activeTab === "materials"}
            onClick={() => setActiveTab("materials")}
            label="Materiales"
            icon={<CubeIcon />}
          />
          <TabButton
            active={activeTab === "recommendations"}
            onClick={() => setActiveTab("recommendations")}
            label="Recomendaciones"
            icon={<LightbulbIcon />}
          />
        </div>

        {activeTab === "receipt" ? (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Condición de ingreso
            </h3>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
              {report.receivedCondition || "No definido"}
            </p>
            <div>
              <p className="mb-3 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                Síntomas
              </p>
              <SectionList items={report.symptoms} />
            </div>
          </div>
        ) : null}

        {activeTab === "diagnostics" ? (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Diagnóstico
            </h3>
            <SectionList items={report.diagnostics} />
            <div>
              <p className="mb-3 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                Resumen de diagnóstico
              </p>
              <p className="whitespace-pre-line text-sm leading-7 text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
                {report.diagnosticsSummary || "No definido"}
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === "procedures" ? (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Procedimientos
            </h3>
            <SectionList items={report.procedures} />
            <div>
              <p className="mb-3 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                Trabajo realizado
              </p>
              <p className="whitespace-pre-line text-sm leading-7 text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
                {report.workPerformedSummary || "No definido"}
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === "materials" ? (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Materiales utilizados
            </h3>
            <SectionList items={report.materialsUsed} />
          </div>
        ) : null}

        {activeTab === "recommendations" ? (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Recomendaciones
            </h3>
            <SectionList items={report.recommendations} />
            <div>
              <p className="mb-3 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                Recomendaciones finales
              </p>
              <p className="whitespace-pre-line text-sm leading-7 text-slate-700 transition-colors duration-300 dark:text-[#E0E0E0]">
                {report.recommendationsSummary || "No definido"}
              </p>
            </div>
          </div>
        ) : null}
      </article>

      {report.sourceTicketId ? (
        <article className="card-base p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                Ticket de origen
              </h3>
              <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
                Esta ficha fue creada desde el ticket {report.sourceTicketNumber || report.sourceTicketId}.
              </p>
            </div>

            <Link
              to={`/app/admin/tickets/${report.sourceTicketId}`}
              className="btn-secondary"
            >
              Abrir ticket
            </Link>
          </div>
        </article>
      ) : null}

      <article className="card-base p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
            Evidencia y archivos
          </h3>
          <p className="mt-2 text-sm text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
            Adjunte imágenes o PDFs relacionados con la ficha técnica.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleUploadAttachments}>
          <div>
            <label htmlFor="technicalReportFiles" className="label-base">
              Subir archivos
            </label>
            <input
              ref={fileInputRef}
              id="technicalReportFiles"
              name="technicalReportFiles"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="input-base file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:file:bg-[#E0E0E0] dark:file:text-[#121212]"
              onChange={handleFileChange}
            />
          </div>

          {selectedFiles.length > 0 ? (
            <div className="space-y-2">
              {selectedFiles.map((file) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818] dark:text-[#E0E0E0]"
                >
                  {file.name} · {formatFileSize(file.size)}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={uploading || !selectedFiles.length}>
              {uploading ? "Subiendo..." : "Subir archivos"}
            </button>
          </div>
        </form>

        <div className="mt-6">
          {!attachments.length ? (
            <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              No hay archivos adjuntos en esta ficha.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {attachments.map((attachment, index) => {
                const isImage = String(attachment.contentType || "").startsWith("image/");

                return (
                  <a
                    key={`${attachment.path || attachment.url || index}`}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md dark:border-[#444444] dark:bg-[#1A1A1A]"
                  >
                    {isImage ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name || `Adjunto ${index + 1}`}
                        className="h-44 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-slate-50 text-sm font-medium text-slate-500 transition-colors duration-300 dark:bg-[#181818] dark:text-[#B0B0B0]">
                        PDF / Archivo
                      </div>
                    )}

                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                        {attachment.name || `Archivo ${index + 1}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </article>

      <div>
        <Link to={ROUTES.ADMIN_TECHNICAL_REPORTS} className="btn-secondary">
          Volver al listado
        </Link>
      </div>
    </section>
  );
}

export default AdminTechnicalReportDetailPage;