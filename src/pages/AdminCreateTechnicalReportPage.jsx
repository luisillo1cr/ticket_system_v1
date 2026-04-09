/**
 * Admin technical report creation page.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CATALOG_TECHNICAL_TYPES, CATALOG_TYPE_LABELS } from "../constants/catalog";
import {
  TECHNICAL_REPORT_BRANDS,
  TECHNICAL_REPORT_DEVICE_TYPES,
  TECHNICAL_REPORT_SPECIAL_CLIENT_OPTIONS,
} from "../constants/technicalReports";
import {
  ROUTES,
  buildAdminTechnicalReportDetailRoute,
} from "../constants/routes";
import { subscribeServiceCatalog } from "../services/catalogService";
import { subscribeClients } from "../services/clientService";
import {
  createTechnicalReport,
  subscribeAdminTechnicalReports,
} from "../services/technicalReportService";
import { useAuth } from "../hooks/useAuth";

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
      <p className="mb-4 text-sm font-medium text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
        {title}
      </p>

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
  );
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

function CreatableDatalistField({
  label,
  name,
  value,
  onChange,
  options,
  onAddOption,
  placeholder,
  helperText,
  required = false,
}) {
  const listId = `${name}-options`;
  const normalizedOptions = normalizeOptionEntries(options);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      const trimmed = String(value || "").trim();
      if (trimmed) {
        onAddOption(trimmed);
      }
    }
  };

  return (
    <div>
      <label htmlFor={name} className="label-base">
        {label}
      </label>
      <input
        id={name}
        name={name}
        list={listId}
        className="input-base"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
      />
      <datalist id={listId}>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value} label={option.label} />
        ))}
      </datalist>
      {helperText ? (
        <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

function AdminCreateTechnicalReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [catalogItems, setCatalogItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [existingReports, setExistingReports] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [customOptions, setCustomOptions] = useState({
    clientId: [],
    deviceType: [],
    brand: [],
    model: [],
    serialNumber: [],
  });

  const [form, setForm] = useState({
    clientId: "",
    quoteId: "",
    deviceType: "",
    brand: "",
    model: "",
    serialNumber: "",
    receivedCondition: "",
    diagnosticsSummary: "",
    workPerformedSummary: "",
    recommendationsSummary: "",
    symptoms: [],
    diagnostics: [],
    procedures: [],
    materialsUsed: [],
    recommendations: [],
    sourceTicketId: "",
    sourceTicketNumber: "",
    sourceTicketSubject: "",
    sourceSystemId: "",
  });

  useEffect(() => {
    const unsubscribe = subscribeServiceCatalog(
      (data) => {
        setCatalogItems(data);
        setLoadingCatalog(false);
      },
      () => {
        setCatalogError("No fue posible cargar el catálogo técnico.");
        setLoadingCatalog(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeClients(
      (data) => {
        setClients(data);
      },
      () => {
        console.error("No fue posible cargar clientes.");
      }
    );

    return () => unsubscribe();
  }, []);


  useEffect(() => {
    const ticketSeed = location.state?.sourceTicket;

    if (!ticketSeed) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      clientId: prev.clientId || String(ticketSeed.clientId || "").trim(),
      deviceType: prev.deviceType || String(ticketSeed.deviceType || "").trim(),
      brand: prev.brand || String(ticketSeed.brand || "").trim(),
      model: prev.model || String(ticketSeed.model || "").trim(),
      receivedCondition:
        prev.receivedCondition || String(ticketSeed.description || "").trim(),
      sourceTicketId: String(ticketSeed.ticketId || "").trim(),
      sourceTicketNumber: String(ticketSeed.ticketNumber || "").trim(),
      sourceTicketSubject: String(ticketSeed.subject || "").trim(),
      sourceSystemId: String(ticketSeed.systemId || "").trim(),
    }));
  }, [location.state]);

  useEffect(() => {
    const unsubscribe = subscribeAdminTechnicalReports(
      (data) => {
        setExistingReports(data);
      },
      () => {
        console.error("No fue posible cargar fichas previas.");
      }
    );

    return () => unsubscribe();
  }, []);

  const groupedCatalog = useMemo(() => {
    return CATALOG_TECHNICAL_TYPES.reduce((acc, type) => {
      acc[type] = catalogItems.filter((item) => item.type === type && item.active !== false);
      return acc;
    }, {});
  }, [catalogItems]);

  const clientOptions = useMemo(() => {
    const base = clients.map((client) => ({
      value: client.id,
      label: client.name || client.company || client.id,
    }));

    return normalizeOptionEntries([
      ...base,
      ...TECHNICAL_REPORT_SPECIAL_CLIENT_OPTIONS,
      ...customOptions.clientId,
    ]);
  }, [clients, customOptions.clientId]);

  const deviceTypeOptions = useMemo(() => {
    const fromReports = existingReports.map((item) => item.deviceType).filter(Boolean);
    return normalizeOptionEntries([
      ...TECHNICAL_REPORT_DEVICE_TYPES,
      ...fromReports,
      ...customOptions.deviceType,
    ]);
  }, [existingReports, customOptions.deviceType]);

  const brandOptions = useMemo(() => {
    const fromReports = existingReports.map((item) => item.brand).filter(Boolean);
    return normalizeOptionEntries([
      ...TECHNICAL_REPORT_BRANDS,
      ...fromReports,
      ...customOptions.brand,
    ]);
  }, [existingReports, customOptions.brand]);

  const modelOptions = useMemo(() => {
    const fromReports = existingReports.map((item) => item.model).filter(Boolean);
    return normalizeOptionEntries([
      ...fromReports,
      ...customOptions.model,
    ]);
  }, [existingReports, customOptions.model]);

  const serialOptions = useMemo(() => {
    const fromReports = existingReports.map((item) => item.serialNumber).filter(Boolean);
    return normalizeOptionEntries([
      ...fromReports,
      ...customOptions.serialNumber,
    ]);
  }, [existingReports, customOptions.serialNumber]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const registerCustomOption = (fieldName, value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return;
    }

    setCustomOptions((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].includes(trimmed)
        ? prev[fieldName]
        : [...prev[fieldName], trimmed],
    }));

    setForm((prev) => ({
      ...prev,
      [fieldName]: trimmed,
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!form.clientId.trim()) {
      setErrorMessage("El campo Cliente es obligatorio.");
      return;
    }

    if (!form.deviceType.trim()) {
      setErrorMessage("El tipo de equipo es obligatorio.");
      return;
    }

    if (!form.brand.trim()) {
      setErrorMessage("La marca es obligatoria.");
      return;
    }

    if (!form.model.trim()) {
      setErrorMessage("El modelo es obligatorio.");
      return;
    }

    setSubmitting(true);

    try {
      const createdReport = await createTechnicalReport(form, currentUser);
      navigate(buildAdminTechnicalReportDetailRoute(createdReport.id), { replace: true });
    } catch (error) {
      console.error("Error creating technical report:", error);
      setErrorMessage("No fue posible crear la ficha técnica.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          Fichas técnicas
        </p>
        <h2 className="section-title">Nueva ficha técnica</h2>
        <p className="section-subtitle mt-2">
          Registro profesional de diagnóstico, síntomas y procedimientos realizados.
        </p>
      </header>

      {catalogError ? (
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 transition-colors duration-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {catalogError}
        </article>
      ) : null}

      <article className="card-base p-6">
        {form.sourceTicketId ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 transition-colors duration-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            Ficha prellenada desde el ticket {form.sourceTicketNumber || form.sourceTicketId}.
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <CreatableDatalistField
              label="Cliente"
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              onAddOption={(value) => registerCustomOption("clientId", value)}
              options={clientOptions}
              placeholder="Seleccione o escriba un cliente"
              helperText="Puede escribir un cliente y presionar Enter para agregarlo a las opciones."
              required
            />

            <div>
              <label htmlFor="quoteId" className="label-base">
                Cotización relacionada
              </label>
              <input
                id="quoteId"
                name="quoteId"
                type="text"
                className="input-base"
                placeholder="Opcional"
                value={form.quoteId}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <CreatableDatalistField
              label="Tipo de equipo"
              name="deviceType"
              value={form.deviceType}
              onChange={handleChange}
              onAddOption={(value) => registerCustomOption("deviceType", value)}
              options={deviceTypeOptions}
              placeholder="Laptop, Tablet, PC..."
              helperText="Enter para agregar un tipo nuevo."
              required
            />

            <CreatableDatalistField
              label="Marca"
              name="brand"
              value={form.brand}
              onChange={handleChange}
              onAddOption={(value) => registerCustomOption("brand", value)}
              options={brandOptions}
              placeholder="HP, Lenovo, Samsung..."
              helperText="Enter para agregar una marca nueva."
              required
            />

            <CreatableDatalistField
              label="Modelo"
              name="model"
              value={form.model}
              onChange={handleChange}
              onAddOption={(value) => registerCustomOption("model", value)}
              options={modelOptions}
              placeholder="Modelo del equipo"
              helperText="Enter para agregar un modelo nuevo."
              required
            />

            <CreatableDatalistField
              label="Serie"
              name="serialNumber"
              value={form.serialNumber}
              onChange={handleChange}
              onAddOption={(value) => registerCustomOption("serialNumber", value)}
              options={serialOptions}
              placeholder="Número de serie"
              helperText="Enter para guardar una serie nueva en las sugerencias."
            />
          </div>

          <div>
            <label htmlFor="receivedCondition" className="label-base">
              Condición de ingreso
            </label>
            <textarea
              id="receivedCondition"
              name="receivedCondition"
              className="input-base min-h-[120px] resize-y"
              placeholder="Describa cómo ingresó el equipo."
              value={form.receivedCondition}
              onChange={handleChange}
            />
          </div>

          {loadingCatalog ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818] dark:text-[#B0B0B0]">
              Cargando catálogo técnico...
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
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
          )}

          <div>
            <label htmlFor="diagnosticsSummary" className="label-base">
              Resumen de diagnóstico
            </label>
            <textarea
              id="diagnosticsSummary"
              name="diagnosticsSummary"
              className="input-base min-h-[140px] resize-y"
              placeholder="Resumen general del diagnóstico."
              value={form.diagnosticsSummary}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="workPerformedSummary" className="label-base">
              Trabajo realizado
            </label>
            <textarea
              id="workPerformedSummary"
              name="workPerformedSummary"
              className="input-base min-h-[140px] resize-y"
              placeholder="Describa el mantenimiento, reparación o procedimientos realizados."
              value={form.workPerformedSummary}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="recommendationsSummary" className="label-base">
              Recomendaciones finales
            </label>
            <textarea
              id="recommendationsSummary"
              name="recommendationsSummary"
              className="input-base min-h-[140px] resize-y"
              placeholder="Recomendaciones para el cliente."
              value={form.recommendationsSummary}
              onChange={handleChange}
            />
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
              onClick={() => navigate(ROUTES.ADMIN_TECHNICAL_REPORTS)}
              disabled={submitting}
            >
              Cancelar
            </button>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creando ficha..." : "Crear ficha técnica"}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}

export default AdminCreateTechnicalReportPage;