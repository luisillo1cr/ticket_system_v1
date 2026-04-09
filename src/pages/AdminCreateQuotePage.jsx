/**
 * Admin quote creation page.
 *
 * Fixed quote format:
 * - Stable header fields
 * - Pricing mode: informal / formal
 * - Line items with optional equipment grouping
 * - Automatic totals
 * - Catalog-aware suggested pricing
 * - Import from structured text
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  QUOTE_CURRENCY_OPTIONS,
  QUOTE_LINE_ITEM_TYPE_LABELS,
  QUOTE_PRICING_MODE_LABELS,
} from "../constants/quotes";
import { ROUTES, buildAdminQuoteDetailRoute } from "../constants/routes";
import { subscribeServiceCatalog } from "../services/catalogService";
import { subscribeClients } from "../services/clientService";
import {
  calculateLineItemTotal,
  calculateQuoteTotals,
  createQuote,
} from "../services/quoteService";
import { useAuth } from "../hooks/useAuth";
import { parseQuotePromptText } from "../utils/quotePromptParser";
import { buildQuotePrefillFromTechnicalReport } from "../utils/technicalReportToQuote";
import { linkTechnicalReportToQuote } from "../services/technicalReportService";

function createEmptyLineItem() {
  return {
    equipmentGroup: "",
    type: "service",
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function formatCurrency(value, currency = "CRC") {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: currency || "CRC",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function stripEquipmentPrefix(name) {
  const normalized = String(name || "").trim();
  const match = normalized.match(/^\[(.+?)\]\s+(.*)$/);

  return match ? String(match[2] || "").trim() : normalized;
}

function buildPersistedLineItems(items) {
  return (items || []).map((item) => {
    const equipmentGroup = String(item.equipmentGroup ?? "").trim();
    const name = String(item.name ?? "").trim();

    const finalName =
      equipmentGroup && name && !name.startsWith("[")
        ? `[${equipmentGroup}] ${name}`
        : name;

    return {
      equipmentGroup,
      type: item.type,
      name: finalName,
      description: item.description,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    };
  });
}

function AdminCreateQuotePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const prefillAppliedRef = useRef(false);

  const [catalogItems, setCatalogItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const [form, setForm] = useState({
    clientId: "",
    clientDisplayName: "",
    clientIdNumber: "",
    clientEmail: "",
    title: "",
    status: "draft",
    currency: "CRC",
    pricingMode: "informal",
    taxPercent: 13,
    validUntil: "",
    paymentTerms: "",
    warrantyTerms: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState([createEmptyLineItem()]);

  useEffect(() => {
    const unsubscribe = subscribeServiceCatalog(
      (data) => {
        setCatalogItems(
          data.filter((item) =>
            ["service", "procedure", "material"].includes(item.type)
          )
        );
      },
      () => {
        console.error("No fue posible cargar el catálogo para cotizaciones.");
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
    const reportSeed = location.state?.prefillFromTechnicalReport;

    if (!reportSeed || prefillAppliedRef.current) {
      return;
    }

    if (!catalogItems.length) {
      return;
    }

    const prefill = buildQuotePrefillFromTechnicalReport(
      reportSeed,
      catalogItems,
      form.pricingMode || "informal"
    );

    setForm((prev) => ({
      ...prev,
      ...prefill.header,
      pricingMode: prefill.header.pricingMode || prev.pricingMode,
    }));

    setLineItems(prefill.lineItems);
    prefillAppliedRef.current = true;
  }, [catalogItems, form.pricingMode, location.state]);
  useEffect(() => {
    if (!form.clientId) {
      return;
    }

    const matchedClient = clients.find((client) => client.id === form.clientId);

    if (!matchedClient) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      clientDisplayName:
        prev.clientDisplayName ||
        matchedClient.name ||
        matchedClient.company ||
        matchedClient.id ||
        "",
      clientIdNumber:
        prev.clientIdNumber ||
        matchedClient.idNumber ||
        matchedClient.identification ||
        matchedClient.cedula ||
        "",
      clientEmail: prev.clientEmail || matchedClient.email || "",
    }));
  }, [form.clientId, clients]);

  const clientOptions = useMemo(() => {
    return clients.map((client) => ({
      value: client.id,
      label: client.name || client.company || client.id,
      email: client.email || "",
      idNumber:
        client.idNumber || client.identification || client.cedula || "",
    }));
  }, [clients]);

  const lineItemSuggestions = useMemo(() => {
    return catalogItems.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      description: item.description,
      defaultPrice: Number(item.defaultPrice ?? 0),
      priceInformal: Number(item.priceInformal ?? item.defaultPrice ?? 0),
      priceFormal: Number(item.priceFormal ?? item.defaultPrice ?? 0),
    }));
  }, [catalogItems]);

  const getLineItemSuggestionsByType = useCallback((type) => {
    const normalizedType = String(type || "service").trim();

    return lineItemSuggestions.filter((item) => {
      if (normalizedType === "procedure") {
        return item.type === "procedure";
      }

      if (normalizedType === "material") {
        return item.type === "material";
      }

      return item.type === "service";
    });
  }, [lineItemSuggestions]);

  const persistedPreviewItems = useMemo(() => {
    return buildPersistedLineItems(lineItems).filter((item) =>
      String(item.name || "").trim()
    );
  }, [lineItems]);

  const totals = useMemo(() => {
    return calculateQuoteTotals(persistedPreviewItems, form.taxPercent);
  }, [persistedPreviewItems, form.taxPercent]);

  const getSuggestedPriceByMode = useCallback((suggestion, pricingMode) => {
    if (pricingMode === "formal") {
      return Number(suggestion.priceFormal ?? suggestion.defaultPrice ?? 0);
    }

    return Number(suggestion.priceInformal ?? suggestion.defaultPrice ?? 0);
  }, []);

  const applyCatalogSuggestion = useCallback(
    (payload, pricingMode = form.pricingMode) => {
      const normalizedName = stripEquipmentPrefix(payload.name).toLowerCase();

      if (!normalizedName) {
        return payload;
      }

      const matchedItem = lineItemSuggestions.find(
        (item) => item.name.toLowerCase() === normalizedName
      );

      if (!matchedItem) {
        return payload;
      }

      return {
        ...payload,
        type:
          matchedItem.type === "material"
            ? "material"
            : matchedItem.type === "procedure"
            ? "procedure"
            : payload.type,
        name: matchedItem.name,
        description: payload.description || matchedItem.description || "",
        unitPrice:
          Number(payload.unitPrice || 0) > 0
            ? Number(payload.unitPrice)
            : getSuggestedPriceByMode(matchedItem, pricingMode),
      };
    },
    [form.pricingMode, getSuggestedPriceByMode, lineItemSuggestions]
  );

  useEffect(() => {
    if (!lineItemSuggestions.length) {
      return;
    }

    setLineItems((prev) =>
      prev.map((item) => {
        const normalizedName = stripEquipmentPrefix(item.name);

        if (!normalizedName) {
          return item;
        }

        const matchedItem = lineItemSuggestions.find(
          (suggestion) =>
            suggestion.name.toLowerCase() === normalizedName.toLowerCase()
        );

        if (!matchedItem) {
          return item;
        }

        return {
          ...item,
          type:
            matchedItem.type === "material"
              ? "material"
              : matchedItem.type === "procedure"
              ? "procedure"
              : item.type,
          unitPrice: getSuggestedPriceByMode(matchedItem, form.pricingMode),
        };
      })
    );
  }, [form.pricingMode, getSuggestedPriceByMode, lineItemSuggestions]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    setLineItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "quantity" || field === "unitPrice" ? value : value,
            }
          : item
      )
    );
  };

  const handleLineItemNameBlur = (index) => {
    setLineItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? applyCatalogSuggestion(item) : item
      )
    );
  };

  const addLineItemRow = () => {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  };

  const removeLineItemRow = (index) => {
    setLineItems((prev) => {
      if (prev.length === 1) {
        return [createEmptyLineItem()];
      }

      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleImportPrompt = () => {
    setImportError("");
    setImportSuccess("");
    setErrorMessage("");

    try {
      if (!String(importText || "").trim()) {
        setImportError("Pegue primero el texto estructurado para importar.");
        return;
      }

      const parsed = parseQuotePromptText(importText);

      if (!parsed.lineItems.length) {
        setImportError("No se detectaron line items válidos en el texto.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        ...parsed.header,
        taxPercent:
          parsed.header.taxPercent === undefined ||
          parsed.header.taxPercent === null
            ? prev.taxPercent
            : parsed.header.taxPercent,
      }));

      setLineItems(
        parsed.lineItems.map((item) => ({
          equipmentGroup: item.equipmentGroup || "",
          type: item.type || "service",
          name: item.name || "",
          description: item.description || "",
          quantity: Number(item.quantity ?? 1),
          unitPrice: Number(item.unitPrice ?? 0),
        }))
      );

      setImportSuccess("La cotización se importó correctamente al formulario.");
    } catch (error) {
      console.error("Error importing quote prompt:", error);
      setImportError("No fue posible interpretar el texto pegado.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!form.clientId.trim()) {
      setErrorMessage("El cliente es obligatorio.");
      return;
    }

    if (!form.clientDisplayName.trim()) {
      setErrorMessage("El nombre del cliente es obligatorio.");
      return;
    }

    if (!form.title.trim()) {
      setErrorMessage("El título es obligatorio.");
      return;
    }

    const validLineItems = buildPersistedLineItems(lineItems).filter((item) =>
      String(item.name || "").trim()
    );

    if (!validLineItems.length) {
      setErrorMessage("Debe agregar al menos un line item válido.");
      return;
    }

    setSubmitting(true);

    try {
      const createdQuote = await createQuote(form, validLineItems, currentUser);

      const reportSeed = location.state?.prefillFromTechnicalReport;
      if (reportSeed?.reportId) {
        await linkTechnicalReportToQuote(reportSeed.reportId, createdQuote.id);
      }

      navigate(buildAdminQuoteDetailRoute(createdQuote.id), { replace: true });
    } catch (error) {
      console.error("Error creating quote:", error);
      setErrorMessage(error.message || "No fue posible crear la cotización.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          Cotizaciones
        </p>
        <h2 className="section-title">Nueva cotización</h2>
        <p className="section-subtitle mt-2">
          Formato fijo profesional para proforma y PDF posterior.
        </p>
      </header>

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          Importar desde texto estructurado
        </h3>
        <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
          Pegue aquí la salida del otro chat con formato ENCABEZADO / LINE_ITEMS para rellenar la cotización automáticamente.
        </p>

        <div className="mt-5 space-y-4">
          <textarea
            className="input-base min-h-[260px] resize-y font-mono text-sm"
            placeholder="Pegue aquí el bloque completo..."
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />

          {importError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {importError}
            </div>
          ) : null}

          {importSuccess ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 transition-colors duration-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {importSuccess}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleImportPrompt}
            >
              Importar al formulario
            </button>
          </div>
        </div>
      </article>

      <article className="card-base p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="quoteClientId" className="label-base">
                Cliente
              </label>
              <input
                id="quoteClientId"
                name="clientId"
                list="quote-client-options"
                className="input-base"
                placeholder="Seleccione o escriba el cliente"
                value={form.clientId}
                onChange={handleFormChange}
                required
              />
              <datalist id="quote-client-options">
                {clientOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    label={option.label}
                  />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="quoteClientDisplayName" className="label-base">
                Nombre cliente
              </label>
              <input
                id="quoteClientDisplayName"
                name="clientDisplayName"
                type="text"
                className="input-base"
                value={form.clientDisplayName}
                onChange={handleFormChange}
                required
              />
            </div>

            <div>
              <label htmlFor="quoteClientIdNumber" className="label-base">
                Cédula / ID
              </label>
              <input
                id="quoteClientIdNumber"
                name="clientIdNumber"
                type="text"
                className="input-base"
                value={form.clientIdNumber}
                onChange={handleFormChange}
              />
            </div>

            <div>
              <label htmlFor="quoteClientEmail" className="label-base">
                Correo cliente
              </label>
              <input
                id="quoteClientEmail"
                name="clientEmail"
                type="email"
                className="input-base"
                value={form.clientEmail}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="quoteTitle" className="label-base">
                Título
              </label>
              <input
                id="quoteTitle"
                name="title"
                type="text"
                className="input-base"
                placeholder="Ejemplo: Proforma mantenimiento y optimización"
                value={form.title}
                onChange={handleFormChange}
                required
              />
            </div>

            <div>
              <label htmlFor="quoteValidUntil" className="label-base">
                Vigencia
              </label>
              <input
                id="quoteValidUntil"
                name="validUntil"
                type="date"
                className="input-base"
                value={form.validUntil}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="quoteCurrency" className="label-base">
                Moneda
              </label>
              <select
                id="quoteCurrency"
                name="currency"
                className="input-base"
                value={form.currency}
                onChange={handleFormChange}
              >
                {QUOTE_CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quoteStatus" className="label-base">
                Estado
              </label>
              <select
                id="quoteStatus"
                name="status"
                className="input-base"
                value={form.status}
                onChange={handleFormChange}
              >
                <option value="draft">Borrador</option>
                <option value="sent">Enviada</option>
                <option value="approved">Aprobada</option>
                <option value="rejected">Rechazada</option>
              </select>
            </div>

            <div>
              <label htmlFor="quotePricingMode" className="label-base">
                Tipo de cliente
              </label>
              <select
                id="quotePricingMode"
                name="pricingMode"
                className="input-base"
                value={form.pricingMode}
                onChange={handleFormChange}
              >
                {Object.entries(QUOTE_PRICING_MODE_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
              <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Al cambiar este valor, los line items del catálogo recalculan su
                precio automáticamente.
              </p>
            </div>

            <div>
              <label htmlFor="quoteTaxPercent" className="label-base">
                Impuesto %
              </label>
              <input
                id="quoteTaxPercent"
                name="taxPercent"
                type="number"
                min="0"
                step="0.01"
                className="input-base"
                value={form.taxPercent}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="quotePaymentTerms" className="label-base">
                Condiciones de pago
              </label>
              <textarea
                id="quotePaymentTerms"
                name="paymentTerms"
                className="input-base min-h-[110px] resize-y"
                placeholder="Ejemplo: 50% por adelantado y 50% contra entrega."
                value={form.paymentTerms}
                onChange={handleFormChange}
              />
            </div>

            <div>
              <label htmlFor="quoteWarrantyTerms" className="label-base">
                Garantía
              </label>
              <textarea
                id="quoteWarrantyTerms"
                name="warrantyTerms"
                className="input-base min-h-[110px] resize-y"
                placeholder="Ejemplo: 30 días sobre mano de obra."
                value={form.warrantyTerms}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="quoteNotes" className="label-base">
              Notas
            </label>
            <textarea
              id="quoteNotes"
              name="notes"
              className="input-base min-h-[120px] resize-y"
              placeholder="Observaciones generales de la proforma."
              value={form.notes}
              onChange={handleFormChange}
            />
          </div>

          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors duration-300 dark:border-[#444444] dark:bg-[#181818]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                  Line items
                </h3>
                <p className="mt-1 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                  Use el campo “Equipo” para luego agrupar la proforma por
                  dispositivo.
                </p>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={addLineItemRow}
              >
                Agregar fila
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div
                  key={`quote-line-item-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-[#444444] dark:bg-[#1A1A1A]"
                >
                  <div className="grid gap-4 xl:grid-cols-[180px_160px_minmax(0,2fr)_1fr_1fr_1fr_auto]">
                    <div>
                      <label className="label-base">Equipo</label>
                      <input
                        className="input-base"
                        placeholder="Laptop, Tablet..."
                        value={item.equipmentGroup}
                        onChange={(event) =>
                          handleLineItemChange(
                            index,
                            "equipmentGroup",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="label-base">Tipo</label>
                      <select
                        className="input-base"
                        value={item.type}
                        onChange={(event) =>
                          handleLineItemChange(index, "type", event.target.value)
                        }
                      >
                        {Object.entries(QUOTE_LINE_ITEM_TYPE_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="label-base">Nombre</label>
                      <input
                        list={`quote-line-item-suggestions-${index}`}
                        className="input-base"
                        value={item.name}
                        onChange={(event) =>
                          handleLineItemChange(index, "name", event.target.value)
                        }
                        onBlur={() => handleLineItemNameBlur(index)}
                        placeholder="Servicio, procedimiento o material"
                      />
                    </div>

                    <div>
                      <label className="label-base">Cantidad</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input-base"
                        value={item.quantity}
                        onChange={(event) =>
                          handleLineItemChange(index, "quantity", event.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="label-base">Precio unitario</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input-base"
                        value={item.unitPrice}
                        onChange={(event) =>
                          handleLineItemChange(
                            index,
                            "unitPrice",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="label-base">Total</label>
                      <div className="input-base flex items-center text-slate-500 dark:text-[#B0B0B0]">
                        {calculateLineItemTotal(item).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        className="btn-secondary px-3 py-2"
                        onClick={() => removeLineItemRow(index)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="label-base">Descripción</label>
                    <textarea
                      className="input-base min-h-[90px] resize-y"
                      value={item.description}
                      onChange={(event) =>
                        handleLineItemChange(
                          index,
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Detalle del line item"
                    />
                  </div>
                </div>
              ))}
            </div>

            {lineItems.map((item, index) => (
              <datalist
                key={`quote-line-item-suggestions-list-${index}`}
                id={`quote-line-item-suggestions-${index}`}
              >
                {getLineItemSuggestionsByType(item.type).map((suggestion) => (
                  <option key={`${suggestion.id}-${index}`} value={suggestion.name} />
                ))}
              </datalist>
            ))}
          </article>

          <article className="card-base p-5">
            <h3 className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Resumen
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-[#444444] dark:bg-[#181818]">
                <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">
                  Subtotal
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
                  {formatCurrency(totals.subtotal, form.currency)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-[#444444] dark:bg-[#181818]">
                <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">
                  Impuesto
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
                  {formatCurrency(totals.tax, form.currency)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-[#444444] dark:bg-[#181818]">
                <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">
                  Total
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
                  {formatCurrency(totals.total, form.currency)}
                </p>
              </div>
            </div>
          </article>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(ROUTES.ADMIN_QUOTES)}
              disabled={submitting}
            >
              Cancelar
            </button>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creando cotización..." : "Crear cotización"}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}

export default AdminCreateQuotePage;