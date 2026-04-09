/**
 * Admin technical report detail page.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AttachmentViewerModal from "../components/shared/AttachmentViewerModal";
import { CATALOG_TECHNICAL_TYPES, CATALOG_TYPE_LABELS } from "../constants/catalog";
import { ROUTES } from "../constants/routes";
import {
  TECHNICAL_REPORT_BRANDS,
  TECHNICAL_REPORT_DEVICE_TYPES,
  TECHNICAL_REPORT_SPECIAL_CLIENT_OPTIONS,
} from "../constants/technicalReports";
import { subscribeClients } from "../services/clientService";
import { subscribeServiceCatalog } from "../services/catalogService";
import {
  addTechnicalReportAttachments,
  subscribeTechnicalReportById,
  updateTechnicalReport,
} from "../services/technicalReportService";
import {
  formatFileSize,
  validateReportAttachmentFiles,
} from "../utils/reportAttachments";

const TECHNICAL_REPORT_STATUS_LABELS = {
  draft: "Borrador",
  in_progress: "En proceso",
  completed: "Completada",
  delivered: "Entregada",
  archived: "Archivada",
};

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

function normalizeOptionEntries(options) {
  const map = new Map();

  (options || []).forEach((item) => {
    if (typeof item === "string") {
      const value = item.trim();
      if (value) {
        map.set(value, { value, label: value });
      }
      return;
    }

    const value = String(item?.value ?? "").trim();
    const label = String(item?.label ?? value).trim();

    if (value) {
      map.set(value, { value, label });
    }
  });

  return Array.from(map.values());
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
    <div>
      <div className={shouldScroll ? "max-h-[220px] overflow-y-auto pr-1" : ""}>
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

function CatalogCheckboxGroup({ title, items, selectedValues, onToggle }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
        <p className="text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          {title}
        </p>
        <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
          No hay ítems cargados en el catálogo para esta categoría.
        </p>
      </div>
    );
  }

  const shouldScroll = items.length > 3;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
      <p className="mb-4 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
        {title}
      </p>

      <div className={shouldScroll ? "max-h-[248px] overflow-y-auto pr-1" : ""}>
        <div className="grid gap-3">
          {items.map((item) => {
            const checked = selectedValues.includes(item.name);

            return (
              <label
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 transition-colors duration-300 dark:border-[#444444] dark:bg-[#1A1A1A]"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  onChange={() => onToggle(item.name)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                    {item.name}
                  </span>
                  {item.description ? (
                    <span className="mt-1 block text-xs text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {shouldScroll ? (
        <p className="mt-3 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          Deslice dentro de la card para ver más elementos.
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

function createFormFromReport(report) {
  return {
    clientId: report?.clientId || "",
    quoteId: report?.quoteId || "",
    deviceType: report?.deviceType || "",
    brand: report?.brand || "",
    model: report?.model || "",
    serialNumber: report?.serialNumber || "",
    receivedCondition: report?.receivedCondition || "",
    diagnosticsSummary: report?.diagnosticsSummary || "",
    workPerformedSummary: report?.workPerformedSummary || "",
    recommendationsSummary: report?.recommendationsSummary || "",
    symptoms: Array.isArray(report?.symptoms) ? report.symptoms : [],
    diagnostics: Array.isArray(report?.diagnostics) ? report.diagnostics : [],
    procedures: Array.isArray(report?.procedures) ? report.procedures : [],
    materialsUsed: Array.isArray(report?.materialsUsed) ? report.materialsUsed : [],
    recommendations: Array.isArray(report?.recommendations) ? report.recommendations : [],
    status: report?.status || "draft",
  };
}

function AdminTechnicalReportDetailPage() {
  const { reportId } = useParams();
  const fileInputRef = useRef(null);

  const [report, setReport] = useState(null);
  const [clients, setClients] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("receipt");
  const [form, setForm] = useState(createFormFromReport(null));
  const [viewedAttachment, setViewedAttachment] = useState(null);

  useEffect(() => {
    const unsubscribeReport = subscribeTechnicalReportById(
      reportId,
      (data) => {
        setReport(data);
        setForm(createFormFromReport(data));
        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar la ficha técnica.");
        setLoading(false);
      }
    );

    const unsubscribeClients = subscribeClients(
      (data) => setClients(data),
      () => console.error("No fue posible cargar clientes para la ficha técnica.")
    );

    const unsubscribeCatalog = subscribeServiceCatalog(
      (data) => setCatalogItems(data),
      () => console.error("No fue posible cargar catálogo técnico para la ficha.")
    );

    return () => {
      unsubscribeReport();
      unsubscribeClients();
      unsubscribeCatalog();
    };
  }, [reportId]);

  const groupedCatalog = useMemo(() => {
    return CATALOG_TECHNICAL_TYPES.reduce((acc, type) => {
      acc[type] = catalogItems.filter((item) => item.type === type && item.active !== false);
      return acc;
    }, {});
  }, [catalogItems]);

  const clientLabelById = useMemo(() => {
    return clients.reduce((acc, client) => {
      acc[client.id] = client.name || client.company || client.id;
      return acc;
    }, {});
  }, [clients]);

  const clientOptions = useMemo(() => {
    const base = clients.map((client) => ({
      value: client.id,
      label: client.name || client.company || client.id,
    }));

    return normalizeOptionEntries([...base, ...TECHNICAL_REPORT_SPECIAL_CLIENT_OPTIONS]);
  }, [clients]);

  const deviceTypeOptions = useMemo(() => normalizeOptionEntries(TECHNICAL_REPORT_DEVICE_TYPES), []);
  const brandOptions = useMemo(() => normalizeOptionEntries(TECHNICAL_REPORT_BRANDS), []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleArrayItem = (fieldName, value) => {
    setForm((prev) => {
      const exists = prev[fieldName].includes(value);

      return {
        ...prev,
        [fieldName]: exists
          ? prev[fieldName].filter((item) => item !== value)
          : [...prev[fieldName], value],
      };
    });
  };

  const handleResetForm = () => {
    setForm(createFormFromReport(report));
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSaveReport = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!String(form.clientId || "").trim()) {
        throw new Error("El cliente es obligatorio.");
      }

      if (!String(form.deviceType || "").trim()) {
        throw new Error("El tipo de equipo es obligatorio.");
      }

      await updateTechnicalReport(reportId, form);
      setSuccessMessage("La ficha técnica se actualizó correctamente.");
    } catch (error) {
      console.error("Error updating technical report:", error);
      setErrorMessage(error.message || "No fue posible actualizar la ficha técnica.");
    } finally {
      setSaving(false);
    }
  };

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

  const handleRemoveSelectedFile = (fileName) => {
    const nextFiles = selectedFiles.filter((file) => file.name !== fileName);
    setSelectedFiles(nextFiles);

    if (!nextFiles.length && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadAttachments = async (event) => {
    event.preventDefault();

    if (!selectedFiles.length) {
      return;
    }

    setUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await addTechnicalReportAttachments(reportId, selectedFiles);
      setSelectedFiles([]);
      setSuccessMessage("Los archivos se subieron correctamente.");

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

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 transition-colors duration-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      <article className="card-base p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Información general
            </h3>
            <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Vista rápida de la ficha y su estado actual.
            </p>
          </div>
          <span className="badge-neutral">{TECHNICAL_REPORT_STATUS_LABELS[report.status] || report.status || "Borrador"}</span>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="Cliente" value={clientLabelById[report.clientId] || report.clientId} />
          <InfoItem label="Cotización relacionada" value={report.quoteId} />
          <InfoItem label="Tipo de equipo" value={report.deviceType} />
          <InfoItem label="Marca" value={report.brand} />
          <InfoItem label="Modelo" value={report.model} />
          <InfoItem label="Serie" value={report.serialNumber} />
          <InfoItem label="Estado" value={TECHNICAL_REPORT_STATUS_LABELS[report.status] || report.status || "draft"} />
          <InfoItem label="Creado por" value={report.createdByName} />
          <InfoItem label="Creado" value={formatDateTime(report.createdAt)} />
          <InfoItem label="Actualizado" value={formatDateTime(report.updatedAt)} />
        </div>
      </article>

      <article className="card-base p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Editar ficha técnica
            </h3>
            <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Actualice datos generales, estado y contenido técnico usando el catálogo base.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={handleResetForm}>
            Restablecer cambios
          </button>
        </div>

        <form className="mt-5 space-y-6" onSubmit={handleSaveReport}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="technicalReportClientId" className="label-base">
                Cliente
              </label>
              <input
                id="technicalReportClientId"
                name="clientId"
                list="technical-report-client-options"
                className="input-base"
                value={form.clientId}
                onChange={handleChange}
                required
              />
              <datalist id="technical-report-client-options">
                {clientOptions.map((option) => (
                  <option key={option.value} value={option.value} label={option.label} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="technicalReportQuoteId" className="label-base">
                Cotización relacionada
              </label>
              <input
                id="technicalReportQuoteId"
                name="quoteId"
                className="input-base"
                value={form.quoteId}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="technicalReportDeviceType" className="label-base">
                Tipo de equipo
              </label>
              <input
                id="technicalReportDeviceType"
                name="deviceType"
                list="technical-report-device-options"
                className="input-base"
                value={form.deviceType}
                onChange={handleChange}
                required
              />
              <datalist id="technical-report-device-options">
                {deviceTypeOptions.map((option) => (
                  <option key={option.value} value={option.value} label={option.label} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="technicalReportStatus" className="label-base">
                Estado
              </label>
              <select
                id="technicalReportStatus"
                name="status"
                className="input-base"
                value={form.status}
                onChange={handleChange}
              >
                {Object.entries(TECHNICAL_REPORT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="technicalReportBrand" className="label-base">
                Marca
              </label>
              <input
                id="technicalReportBrand"
                name="brand"
                list="technical-report-brand-options"
                className="input-base"
                value={form.brand}
                onChange={handleChange}
              />
              <datalist id="technical-report-brand-options">
                {brandOptions.map((option) => (
                  <option key={option.value} value={option.value} label={option.label} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="technicalReportModel" className="label-base">
                Modelo
              </label>
              <input
                id="technicalReportModel"
                name="model"
                className="input-base"
                value={form.model}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="technicalReportSerial" className="label-base">
                Serie
              </label>
              <input
                id="technicalReportSerial"
                name="serialNumber"
                className="input-base"
                value={form.serialNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="technicalReportReceivedCondition" className="label-base">
              Condición de ingreso
            </label>
            <textarea
              id="technicalReportReceivedCondition"
              name="receivedCondition"
              className="input-base min-h-[110px] resize-y"
              value={form.receivedCondition}
              onChange={handleChange}
            />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <CatalogCheckboxGroup
              title={CATALOG_TYPE_LABELS.symptom}
              items={groupedCatalog.symptom || []}
              selectedValues={form.symptoms}
              onToggle={(value) => toggleArrayItem("symptoms", value)}
            />
            <CatalogCheckboxGroup
              title={CATALOG_TYPE_LABELS.diagnostic}
              items={groupedCatalog.diagnostic || []}
              selectedValues={form.diagnostics}
              onToggle={(value) => toggleArrayItem("diagnostics", value)}
            />
            <CatalogCheckboxGroup
              title={CATALOG_TYPE_LABELS.procedure}
              items={groupedCatalog.procedure || []}
              selectedValues={form.procedures}
              onToggle={(value) => toggleArrayItem("procedures", value)}
            />
            <CatalogCheckboxGroup
              title={CATALOG_TYPE_LABELS.material}
              items={groupedCatalog.material || []}
              selectedValues={form.materialsUsed}
              onToggle={(value) => toggleArrayItem("materialsUsed", value)}
            />
            <CatalogCheckboxGroup
              title={CATALOG_TYPE_LABELS.recommendation}
              items={groupedCatalog.recommendation || []}
              selectedValues={form.recommendations}
              onToggle={(value) => toggleArrayItem("recommendations", value)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label htmlFor="technicalReportDiagnosticsSummary" className="label-base">
                Resumen de diagnóstico
              </label>
              <textarea
                id="technicalReportDiagnosticsSummary"
                name="diagnosticsSummary"
                className="input-base min-h-[130px] resize-y"
                value={form.diagnosticsSummary}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="technicalReportWorkPerformedSummary" className="label-base">
                Trabajo realizado
              </label>
              <textarea
                id="technicalReportWorkPerformedSummary"
                name="workPerformedSummary"
                className="input-base min-h-[130px] resize-y"
                value={form.workPerformedSummary}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="technicalReportRecommendationsSummary" className="label-base">
                Recomendaciones finales
              </label>
              <textarea
                id="technicalReportRecommendationsSummary"
                name="recommendationsSummary"
                className="input-base min-h-[130px] resize-y"
                value={form.recommendationsSummary}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar ficha técnica"}
            </button>
          </div>
        </form>
      </article>

      <article className="card-base p-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <TabButton active={activeTab === "receipt"} onClick={() => setActiveTab("receipt")} label="Ingreso" icon={<ReceiptIcon />} />
          <TabButton active={activeTab === "diagnostics"} onClick={() => setActiveTab("diagnostics")} label="Diagnóstico" icon={<SearchIcon />} />
          <TabButton active={activeTab === "procedures"} onClick={() => setActiveTab("procedures")} label="Procedimientos" icon={<WrenchIcon />} />
          <TabButton active={activeTab === "materials"} onClick={() => setActiveTab("materials")} label="Materiales" icon={<CubeIcon />} />
          <TabButton active={activeTab === "recommendations"} onClick={() => setActiveTab("recommendations")} label="Recomendaciones" icon={<LightbulbIcon />} />
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
                const isPdf = String(attachment.contentType || "") === "application/pdf";

                return (
                  <button
                    key={`${attachment.path || attachment.url || index}`}
                    type="button"
                    onClick={() => setViewedAttachment(attachment)}
                    className="block overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:shadow-md dark:border-[#444444] dark:bg-[#1A1A1A]"
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
                        {isPdf ? "PDF" : "Archivo"}
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
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </article>

      {viewedAttachment ? (
        <AttachmentViewerModal attachment={viewedAttachment} onClose={() => setViewedAttachment(null)} />
      ) : null}

      <div>
        <Link to={ROUTES.ADMIN_TECHNICAL_REPORTS} className="btn-secondary">
          Volver al listado
        </Link>
      </div>
    </section>
  );
}

export default AdminTechnicalReportDetailPage;
