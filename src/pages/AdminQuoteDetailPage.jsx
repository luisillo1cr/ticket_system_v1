/**
 * Admin quote detail page.
 *
 * Fixed:
 * - professional preview export
 * - no cropped PNG
 * - no broken PDF pagination
 * - offscreen render for reliable capture
 * - compact A4-friendly preview
 * - removed ID and pricing mode from exported proforma
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import {
  QUOTE_CURRENCY_OPTIONS,
  QUOTE_LINE_ITEM_TYPE_LABELS,
  QUOTE_PRICING_MODE_LABELS,
  QUOTE_STATUS_LABELS,
} from "../constants/quotes";
import { ROUTES } from "../constants/routes";
import { subscribeClients } from "../services/clientService";
import { subscribeServiceCatalog } from "../services/catalogService";
import {
  addQuoteLineItem,
  applyPricingModeToQuoteLineItems,
  calculateLineItemTotal,
  deleteQuote,
  deleteQuoteLineItem,
  subscribeQuoteById,
  subscribeQuoteLineItems,
  updateQuoteHeader,
  updateQuoteLineItem,
} from "../services/quoteService";
import { useAuth } from "../hooks/useAuth";
import { canDeleteQuoteLineItems, canDeleteQuotes } from "../utils/permissions";

const BRAND_NAME = "Moonforge Digital";
const BRAND_PHONE = "+506 6036 4823";
const BRAND_INSTAGRAM = "moonforge.digitalcr";
const PREVIEW_WIDTH_PX = 794;

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

function parseStoredLineItem(item) {
  const storedName = String(item?.name || "").trim();
  const explicitEquipmentGroup = String(item?.equipmentGroup || "").trim();

  const match = storedName.match(/^\[(.+?)\]\s+(.*)$/);

  if (match) {
    return {
      equipmentGroup: explicitEquipmentGroup || match[1],
      type: item.type || "service",
      name: match[2],
      description: item.description || "",
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? 0,
    };
  }

  return {
    equipmentGroup: explicitEquipmentGroup,
    type: item.type || "service",
    name: storedName,
    description: item.description || "",
    quantity: item.quantity ?? 1,
    unitPrice: item.unitPrice ?? 0,
  };
}

function buildPersistedLineItem(payload) {
  const equipmentGroup = String(payload?.equipmentGroup || "").trim();
  const rawName = String(payload?.name || "").trim();

  const finalName =
    equipmentGroup && rawName && !rawName.startsWith("[")
      ? `[${equipmentGroup}] ${rawName}`
      : rawName;

  return {
    equipmentGroup,
    type: payload.type,
    name: finalName,
    description: payload.description,
    quantity: payload.quantity,
    unitPrice: payload.unitPrice,
  };
}

function groupLineItemsForPreview(items) {
  const groups = new Map();

  (items || []).forEach((item) => {
    const parsed = parseStoredLineItem(item);
    const key = parsed.equipmentGroup || "General";

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(parsed);
  });

  return Array.from(groups.entries()).map(([equipmentGroup, groupItems]) => ({
    equipmentGroup,
    items: groupItems,
    subtotal: groupItems.reduce(
      (acc, item) => acc + calculateLineItemTotal(item),
      0
    ),
  }));
}

function isValidLogoFile(file) {
  if (!file) {
    return false;
  }

  const validTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
  ];

  return validTypes.includes(file.type);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadDataUrl(dataUrl, fileName) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

async function waitForImages(container) {
  const images = Array.from(container.querySelectorAll("img"));

  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const cleanup = () => {
          img.removeEventListener("load", cleanup);
          img.removeEventListener("error", cleanup);
          resolve();
        };

        img.addEventListener("load", cleanup);
        img.addEventListener("error", cleanup);
      });
    })
  );
}

async function renderNodeToPngDataUrl(node) {
  const cloneWrapper = document.createElement("div");
  cloneWrapper.style.position = "fixed";
  cloneWrapper.style.left = "-100000px";
  cloneWrapper.style.top = "0";
  cloneWrapper.style.zIndex = "-1";
  cloneWrapper.style.pointerEvents = "none";
  cloneWrapper.style.background = "#ffffff";
  cloneWrapper.style.padding = "0";
  cloneWrapper.style.margin = "0";
  cloneWrapper.style.overflow = "visible";

  const clone = node.cloneNode(true);
  clone.style.width = `${node.scrollWidth}px`;
  clone.style.maxWidth = "none";
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  clone.style.transform = "none";
  clone.style.margin = "0";

  cloneWrapper.appendChild(clone);
  document.body.appendChild(cloneWrapper);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await waitForImages(clone);

    const dataUrl = await toPng(clone, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      canvasWidth: clone.scrollWidth * 2,
      canvasHeight: clone.scrollHeight * 2,
      style: {
        margin: "0",
        transform: "none",
      },
    });

    return dataUrl;
  } finally {
    document.body.removeChild(cloneWrapper);
  }
}

async function exportNodeToPdf(node, fileName) {
  const dataUrl = await renderNodeToPngDataUrl(node);

  const image = new Image();
  image.src = dataUrl;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const fullImageWidthPx = image.width;
  const fullImageHeightPx = image.height;

  const pixelsPerPoint = fullImageWidthPx / printableWidth;
  const pageSliceHeightPx = Math.floor(printableHeight * pixelsPerPoint);

  let renderedHeightPx = 0;
  let pageIndex = 0;

  while (renderedHeightPx < fullImageHeightPx) {
    const currentSliceHeightPx = Math.min(
      pageSliceHeightPx,
      fullImageHeightPx - renderedHeightPx
    );

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = fullImageWidthPx;
    sliceCanvas.height = currentSliceHeightPx;

    const context = sliceCanvas.getContext("2d");
    context.drawImage(
      image,
      0,
      renderedHeightPx,
      fullImageWidthPx,
      currentSliceHeightPx,
      0,
      0,
      fullImageWidthPx,
      currentSliceHeightPx
    );

    const sliceDataUrl = sliceCanvas.toDataURL("image/png");
    const sliceHeightPt = currentSliceHeightPx / pixelsPerPoint;

    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(
      sliceDataUrl,
      "PNG",
      margin,
      margin,
      printableWidth,
      sliceHeightPt,
      undefined,
      "FAST"
    );

    renderedHeightPx += currentSliceHeightPx;
    pageIndex += 1;
  }

  pdf.save(fileName);
}

function AdminQuoteDetailPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const previewRef = useRef(null);
  const logoInputRef = useRef(null);

  const [quote, setQuote] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const canDeleteLineItems = canDeleteQuoteLineItems(currentUser);
  const canDeleteCurrentQuote = canDeleteQuotes(currentUser);
  const [catalogItems, setCatalogItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [headerForm, setHeaderForm] = useState({
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
  const [lineItemDrafts, setLineItemDrafts] = useState({});
  const [newLineItem, setNewLineItem] = useState(createEmptyLineItem());
  const [previewLogoUrl, setPreviewLogoUrl] = useState("");
  const [previewLogoName, setPreviewLogoName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingLineItemId, setSavingLineItemId] = useState("");
  const [addingLineItem, setAddingLineItem] = useState(false);
  const [deletingLineItemId, setDeletingLineItemId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeQuoteById(
      quoteId,
      (data) => {
        setQuote(data);

        if (data) {
          setHeaderForm({
            clientId: data.clientId || "",
            clientDisplayName: data.clientDisplayName || "",
            clientIdNumber: data.clientIdNumber || "",
            clientEmail: data.clientEmail || "",
            title: data.title || "",
            status: data.status || "draft",
            currency: data.currency || "CRC",
            pricingMode: data.pricingMode || "informal",
            taxPercent: data.taxPercent ?? 13,
            validUntil: data.validUntil || "",
            paymentTerms: data.paymentTerms || "",
            warrantyTerms: data.warrantyTerms || "",
            notes: data.notes || "",
          });
        }

        setLoading(false);
      },
      () => {
        setErrorMessage("No fue posible cargar la cotización.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [quoteId]);

  useEffect(() => {
    const unsubscribe = subscribeQuoteLineItems(
      quoteId,
      (data) => {
        setLineItems(data);

        const mappedDrafts = {};
        data.forEach((item) => {
          mappedDrafts[item.id] = parseStoredLineItem(item);
        });

        setLineItemDrafts(mappedDrafts);
      },
      () => {
        setErrorMessage("No fue posible cargar los line items.");
      }
    );

    return () => unsubscribe();
  }, [quoteId]);

  useEffect(() => {
    const unsubscribe = subscribeServiceCatalog(
      (data) =>
        setCatalogItems(
          data.filter((item) =>
            ["service", "procedure", "material"].includes(item.type)
          )
        ),
      () => console.error("No fue posible cargar catálogo para cotizaciones.")
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeClients(
      (data) => setClients(data),
      () => console.error("No fue posible cargar clientes.")
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!headerForm.clientId) {
      return;
    }

    const matchedClient = clients.find(
      (client) => client.id === headerForm.clientId
    );

    if (!matchedClient) {
      return;
    }

    setHeaderForm((prev) => ({
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
  }, [headerForm.clientId, clients]);

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: client.name || client.company || client.id,
      })),
    [clients]
  );

  const lineItemSuggestions = useMemo(
    () =>
      catalogItems.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        description: item.description,
        defaultPrice: Number(item.defaultPrice ?? 0),
        priceInformal: Number(item.priceInformal ?? item.defaultPrice ?? 0),
        priceFormal: Number(item.priceFormal ?? item.defaultPrice ?? 0),
      })),
    [catalogItems]
  );

  const previewGroups = useMemo(
    () => groupLineItemsForPreview(lineItems),
    [lineItems]
  );
  const getLineItemSuggestionsByType = (type) => {
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
  };


  const getSuggestedPriceByMode = (suggestion, pricingMode = headerForm.pricingMode) => {
    if (pricingMode === "formal") {
      return Number(suggestion.priceFormal ?? suggestion.defaultPrice ?? 0);
    }

    return Number(suggestion.priceInformal ?? suggestion.defaultPrice ?? 0);
  };

  const applyCatalogSuggestion = (payload, pricingMode = headerForm.pricingMode) => {
    const normalizedName = stripEquipmentPrefix(payload.name).toLowerCase();

    if (!normalizedName) {
      return payload;
    }

    const matched = lineItemSuggestions.find(
      (item) => item.name.toLowerCase() === normalizedName
    );

    if (!matched) {
      return payload;
    }

    return {
      ...payload,
      type:
        matched.type === "material"
          ? "material"
          : matched.type === "procedure"
          ? "procedure"
          : payload.type,
      name: matched.name,
      description: payload.description || matched.description || "",
      unitPrice:
        Number(payload.unitPrice || 0) > 0
          ? Number(payload.unitPrice)
          : getSuggestedPriceByMode(matched, pricingMode),
    };
  };

  const handleHeaderChange = (event) => {
    const { name, value } = event.target;

    setHeaderForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveHeader = async (event) => {
    event.preventDefault();
    setSavingHeader(true);
    setErrorMessage("");

    try {
      const pricingModeChanged =
        (quote?.pricingMode || "informal") !== headerForm.pricingMode;

      await updateQuoteHeader(quoteId, headerForm);

      if (pricingModeChanged) {
        await applyPricingModeToQuoteLineItems(
          quoteId,
          headerForm.pricingMode,
          lineItemSuggestions
        );
      }
    } catch (error) {
      console.error("Error updating quote header:", error);
      setErrorMessage("No fue posible actualizar la cotización.");
    } finally {
      setSavingHeader(false);
    }
  };

  const handleDraftChange = (lineItemId, field, value) => {
    setLineItemDrafts((prev) => ({
      ...prev,
      [lineItemId]: {
        ...prev[lineItemId],
        [field]: value,
      },
    }));
  };

  const handleDraftNameBlur = (lineItemId) => {
    setLineItemDrafts((prev) => ({
      ...prev,
      [lineItemId]: applyCatalogSuggestion(prev[lineItemId]),
    }));
  };

  const handleSaveLineItem = async (lineItemId) => {
    const payload = buildPersistedLineItem(
      applyCatalogSuggestion(lineItemDrafts[lineItemId])
    );

    setSavingLineItemId(lineItemId);
    setErrorMessage("");

    try {
      await updateQuoteLineItem(quoteId, lineItemId, payload);
    } catch (error) {
      console.error("Error updating line item:", error);
      setErrorMessage("No fue posible actualizar el line item.");
    } finally {
      setSavingLineItemId("");
    }
  };

  const handleDeleteLineItem = async (lineItemId) => {
    if (!canDeleteLineItems) {
      setErrorMessage("Solo un administrador puede eliminar line items.");
      return;
    }

    setDeletingLineItemId(lineItemId);
    setErrorMessage("");

    try {
      await deleteQuoteLineItem(quoteId, lineItemId);
    } catch (error) {
      console.error("Error deleting line item:", error);
      setErrorMessage("No fue posible eliminar el line item.");
    } finally {
      setDeletingLineItemId("");
    }
  };

  const handleNewLineItemChange = (field, value) => {
    setNewLineItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewLineItemNameBlur = () => {
    setNewLineItem((prev) => applyCatalogSuggestion(prev));
  };

  const handleAddLineItem = async (event) => {
    event.preventDefault();
    setAddingLineItem(true);
    setErrorMessage("");

    try {
      await addQuoteLineItem(
        quoteId,
        buildPersistedLineItem(applyCatalogSuggestion(newLineItem))
      );
      setNewLineItem(createEmptyLineItem());
    } catch (error) {
      console.error("Error adding line item:", error);
      setErrorMessage(error.message || "No fue posible agregar el line item.");
    } finally {
      setAddingLineItem(false);
    }
  };

  const handleDeleteQuote = async () => {
    if (!canDeleteCurrentQuote) {
      setErrorMessage("Solo un administrador puede eliminar cotizaciones.");
      return;
    }

    setDeletingQuote(true);
    setErrorMessage("");

    try {
      await deleteQuote(quoteId);
      navigate(ROUTES.ADMIN_QUOTES, { replace: true });
    } catch (error) {
      console.error("Error deleting quote:", error);
      setErrorMessage("No fue posible eliminar la cotización.");
    } finally {
      setDeletingQuote(false);
    }
  };

  const handleLogoFile = async (file) => {
    if (!isValidLogoFile(file)) {
      setErrorMessage("El logo debe ser PNG, JPG, WEBP o SVG.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreviewLogoUrl(String(dataUrl));
      setPreviewLogoName(file.name || "logo");
      setErrorMessage("");
    } catch (error) {
      console.error("Error reading logo file:", error);
      setErrorMessage("No fue posible cargar el logo para la vista previa.");
    }
  };

  const handleLogoInputChange = async (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) {
      return;
    }

    await handleLogoFile(file);
  };

  const handleLogoDrop = async (event) => {
    event.preventDefault();
    setDragActive(false);

    const [file] = Array.from(event.dataTransfer.files || []);
    if (!file) {
      return;
    }

    await handleLogoFile(file);
  };

  const handleExportImage = async () => {
    if (!previewRef.current) {
      return;
    }

    setExportingImage(true);
    setErrorMessage("");

    try {
      const dataUrl = await renderNodeToPngDataUrl(previewRef.current);
      downloadDataUrl(
        dataUrl,
        `${quote.quoteNumber || "cotizacion"}-proforma.png`
      );
    } catch (error) {
      console.error("Error exporting image:", error);
      setErrorMessage("No fue posible exportar la imagen.");
    } finally {
      setExportingImage(false);
    }
  };

  const handleExportPdf = async () => {
    if (!previewRef.current) {
      return;
    }

    setExportingPdf(true);
    setErrorMessage("");

    try {
      await exportNodeToPdf(
        previewRef.current,
        `${quote.quoteNumber || "cotizacion"}-proforma.pdf`
      );
    } catch (error) {
      console.error("Error exporting PDF:", error);
      setErrorMessage("No fue posible exportar el PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <section className="card-base p-6">
        <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">
          Cargando cotización...
        </p>
      </section>
    );
  }

  if (errorMessage && !quote) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        {errorMessage}
      </section>
    );
  }

  if (!quote) {
    return (
      <section className="card-base p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
          Cotización no encontrada
        </h2>
        <div className="mt-5">
          <Link to={ROUTES.ADMIN_QUOTES} className="btn-secondary">
            Volver al listado
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-[#888888]">
            Cotización
          </p>
          <h2 className="section-title">{quote.title || "Sin título"}</h2>
          <p className="section-subtitle mt-2">{quote.quoteNumber || quote.id}</p>
        </div>

        <div className="text-sm text-slate-500 dark:text-[#B0B0B0]">
          Estado: {QUOTE_STATUS_LABELS[quote.status] || quote.status || "draft"}
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      ) : null}

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">
          Encabezado de cotización
        </h3>

        <form className="mt-5 space-y-5" onSubmit={handleSaveHeader}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="label-base">Cliente</label>
              <input
                list="quote-detail-client-options"
                name="clientId"
                className="input-base"
                value={headerForm.clientId}
                onChange={handleHeaderChange}
              />
              <datalist id="quote-detail-client-options">
                {clientOptions.map((option) => (
                  <option key={option.value} value={option.value} label={option.label} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="label-base">Nombre cliente</label>
              <input
                name="clientDisplayName"
                className="input-base"
                value={headerForm.clientDisplayName}
                onChange={handleHeaderChange}
              />
            </div>

            <div>
              <label className="label-base">Cédula / ID</label>
              <input
                name="clientIdNumber"
                className="input-base"
                value={headerForm.clientIdNumber}
                onChange={handleHeaderChange}
              />
            </div>

            <div>
              <label className="label-base">Correo cliente</label>
              <input
                name="clientEmail"
                type="email"
                className="input-base"
                value={headerForm.clientEmail}
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label-base">Título</label>
              <input
                name="title"
                className="input-base"
                value={headerForm.title}
                onChange={handleHeaderChange}
              />
            </div>

            <div>
              <label className="label-base">Vigencia</label>
              <input
                name="validUntil"
                type="date"
                className="input-base"
                value={headerForm.validUntil}
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="label-base">Moneda</label>
              <select
                name="currency"
                className="input-base"
                value={headerForm.currency}
                onChange={handleHeaderChange}
              >
                {QUOTE_CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-base">Estado</label>
              <select
                name="status"
                className="input-base"
                value={headerForm.status}
                onChange={handleHeaderChange}
              >
                {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-base">Tipo de cliente</label>
              <select
                name="pricingMode"
                className="input-base"
                value={headerForm.pricingMode}
                onChange={handleHeaderChange}
              >
                {Object.entries(QUOTE_PRICING_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
                Si cambia este valor y guarda el encabezado, los line items del
                catálogo se recalculan automáticamente.
              </p>
            </div>

            <div>
              <label className="label-base">Impuesto %</label>
              <input
                name="taxPercent"
                type="number"
                min="0"
                step="0.01"
                className="input-base"
                value={headerForm.taxPercent}
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label-base">Condiciones de pago</label>
              <textarea
                name="paymentTerms"
                className="input-base min-h-[110px] resize-y"
                value={headerForm.paymentTerms}
                onChange={handleHeaderChange}
              />
            </div>

            <div>
              <label className="label-base">Garantía</label>
              <textarea
                name="warrantyTerms"
                className="input-base min-h-[110px] resize-y"
                value={headerForm.warrantyTerms}
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          <div>
            <label className="label-base">Notas</label>
            <textarea
              name="notes"
              className="input-base min-h-[120px] resize-y"
              value={headerForm.notes}
              onChange={handleHeaderChange}
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={savingHeader}>
              {savingHeader ? "Guardando..." : "Guardar encabezado"}
            </button>
          </div>
        </form>
      </article>

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">
          Resumen financiero
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-[#444444] dark:bg-[#181818]">
            <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">Subtotal</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
              {formatCurrency(quote.subtotal, quote.currency)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-[#444444] dark:bg-[#181818]">
            <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">Impuesto</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
              {formatCurrency(quote.tax, quote.currency)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-[#444444] dark:bg-[#181818]">
            <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">Total</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[#E0E0E0]">
              {formatCurrency(quote.total, quote.currency)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-[#444444] dark:bg-[#181818]">
            <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">Actualizado</p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-[#E0E0E0]">
              {formatDateTime(quote.updatedAt)}
            </p>
          </div>
        </div>
      </article>

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">
          Line items
        </h3>

        <div className="mt-5 space-y-4">
          {lineItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">
              No hay line items registrados.
            </p>
          ) : (
            lineItems.map((item) => {
              const draft = lineItemDrafts[item.id] || createEmptyLineItem();

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#444444] dark:bg-[#181818]"
                >
                  <div className="grid gap-4 xl:grid-cols-[180px_160px_minmax(0,2fr)_1fr_1fr_1fr]">
                    <div>
                      <label className="label-base">Equipo</label>
                      <input
                        className="input-base"
                        placeholder="Laptop, Tablet..."
                        value={draft.equipmentGroup}
                        onChange={(event) =>
                          handleDraftChange(
                            item.id,
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
                        value={draft.type}
                        onChange={(event) =>
                          handleDraftChange(item.id, "type", event.target.value)
                        }
                      >
                        {Object.entries(QUOTE_LINE_ITEM_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label-base">Nombre</label>
                      <input
                        list={`quote-detail-line-item-suggestions-${item.id}`}
                        className="input-base"
                        value={draft.name}
                        onChange={(event) =>
                          handleDraftChange(item.id, "name", event.target.value)
                        }
                        onBlur={() => handleDraftNameBlur(item.id)}
                      />
                    </div>

                    <div>
                      <label className="label-base">Cantidad</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input-base"
                        value={draft.quantity}
                        onChange={(event) =>
                          handleDraftChange(item.id, "quantity", event.target.value)
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
                        value={draft.unitPrice}
                        onChange={(event) =>
                          handleDraftChange(item.id, "unitPrice", event.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="label-base">Total</label>
                      <div className="input-base flex items-center text-slate-500 dark:text-[#B0B0B0]">
                        {calculateLineItemTotal(draft).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="label-base">Descripción</label>
                    <textarea
                      className="input-base min-h-[90px] resize-y"
                      value={draft.description}
                      onChange={(event) =>
                        handleDraftChange(item.id, "description", event.target.value)
                      }
                    />
                  </div>

                  <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
{canDeleteLineItems ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDeleteLineItem(item.id)}
                      disabled={deletingLineItemId === item.id}
                    >
                      {deletingLineItemId === item.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  ) : null}

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleSaveLineItem(item.id)}
                      disabled={savingLineItemId === item.id}
                    >
                      {savingLineItemId === item.id ? "Guardando..." : "Guardar line item"}
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {lineItems.map((lineItem) => {
            const draft = lineItemDrafts[lineItem.id] || createEmptyLineItem();

            return (
              <datalist
                key={`quote-detail-line-item-suggestions-${lineItem.id}`}
                id={`quote-detail-line-item-suggestions-${lineItem.id}`}
              >
                {getLineItemSuggestionsByType(draft.type).map((suggestion) => (
                  <option key={`${suggestion.id}-${lineItem.id}`} value={suggestion.name} />
                ))}
              </datalist>
            );
          })}

          <datalist id="quote-detail-line-item-suggestions-new">
            {getLineItemSuggestionsByType(newLineItem.type).map((suggestion) => (
              <option key={`new-${suggestion.id}`} value={suggestion.name} />
            ))}
          </datalist>
        </div>
      </article>

      <article className="card-base p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">
          Agregar line item
        </h3>

        <form className="mt-5 space-y-4" onSubmit={handleAddLineItem}>
          <div className="grid gap-4 xl:grid-cols-[180px_160px_minmax(0,2fr)_1fr_1fr_1fr]">
            <div>
              <label className="label-base">Equipo</label>
              <input
                className="input-base"
                placeholder="Laptop, Tablet..."
                value={newLineItem.equipmentGroup}
                onChange={(event) =>
                  handleNewLineItemChange("equipmentGroup", event.target.value)
                }
              />
            </div>

            <div>
              <label className="label-base">Tipo</label>
              <select
                className="input-base"
                value={newLineItem.type}
                onChange={(event) =>
                  handleNewLineItemChange("type", event.target.value)
                }
              >
                {Object.entries(QUOTE_LINE_ITEM_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-base">Nombre</label>
              <input
                list="quote-detail-line-item-suggestions-new"
                className="input-base"
                value={newLineItem.name}
                onChange={(event) =>
                  handleNewLineItemChange("name", event.target.value)
                }
                onBlur={handleNewLineItemNameBlur}
              />
            </div>

            <div>
              <label className="label-base">Cantidad</label>
              <input
                type="number"
                min="0"
                step="1"
                className="input-base"
                value={newLineItem.quantity}
                onChange={(event) =>
                  handleNewLineItemChange("quantity", event.target.value)
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
                value={newLineItem.unitPrice}
                onChange={(event) =>
                  handleNewLineItemChange("unitPrice", event.target.value)
                }
              />
            </div>

            <div>
              <label className="label-base">Total</label>
              <div className="input-base flex items-center text-slate-500 dark:text-[#B0B0B0]">
                {calculateLineItemTotal(newLineItem).toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <label className="label-base">Descripción</label>
            <textarea
              className="input-base min-h-[90px] resize-y"
              value={newLineItem.description}
              onChange={(event) =>
                handleNewLineItemChange("description", event.target.value)
              }
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={addingLineItem}>
              {addingLineItem ? "Agregando..." : "Agregar line item"}
            </button>
          </div>
        </form>
      </article>

      <article className="card-base p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E0E0E0]">
              Vista previa y exportación
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-[#B0B0B0]">
              Arrastre su logo PNG/SVG/JPG/WEBP y revise la proforma antes de
              exportar.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => logoInputRef.current?.click()}
            >
              Elegir logo
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setPreviewLogoUrl("");
                setPreviewLogoName("");
              }}
            >
              Quitar logo
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleExportImage}
              disabled={exportingImage}
            >
              {exportingImage ? "Exportando..." : "Exportar imagen"}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleExportPdf}
              disabled={exportingPdf}
            >
              {exportingPdf ? "Exportando..." : "Exportar PDF"}
            </button>
          </div>
        </div>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleLogoInputChange}
        />

        <div
          className={`mt-5 rounded-2xl border-2 border-dashed p-5 text-sm transition-colors duration-300 ${
            dragActive
              ? "border-slate-900 bg-slate-50 dark:border-[#E0E0E0] dark:bg-[#181818]"
              : "border-slate-200 bg-white dark:border-[#444444] dark:bg-[#121212]"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleLogoDrop}
        >
          <p className="text-slate-700 dark:text-[#E0E0E0]">
            Arrastre aquí el logo para la proforma.
          </p>
          <p className="mt-2 text-slate-500 dark:text-[#B0B0B0]">
            {previewLogoName
              ? `Logo cargado: ${previewLogoName}`
              : "No hay logo cargado todavía."}
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-[#444444] dark:bg-[#181818]">
          <div
            ref={previewRef}
            className="mx-auto rounded-2xl bg-white text-slate-900 shadow-sm"
            style={{
              width: `${PREVIEW_WIDTH_PX}px`,
              maxWidth: `${PREVIEW_WIDTH_PX}px`,
              padding: "24px",
            }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                {previewLogoUrl ? (
                  <img
                    src={previewLogoUrl}
                    alt="Logo de la proforma"
                    className="h-12 w-auto object-contain"
                  />
                ) : null}

                <div>
                  <h3 className="text-[18px] font-bold leading-tight">{BRAND_NAME}</h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-600">
                    Instagram: {BRAND_INSTAGRAM}
                  </p>
                  <p className="text-[11px] leading-4 text-slate-600">
                    Teléfono: {BRAND_PHONE}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Proforma
                </p>
                <p className="mt-1 text-[14px] font-semibold">
                  {quote.quoteNumber || quote.id}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-600">
                  {quote.title || "Sin título"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-200 py-4 md:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Cliente
                </p>
                <p className="mt-2 text-[14px] font-semibold leading-5">
                  {quote.clientDisplayName || quote.clientId || "No definido"}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-600">
                  Correo: {quote.clientEmail || "No definido"}
                </p>
              </div>

              <div className="md:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Condiciones
                </p>
                <p className="mt-2 text-[11px] leading-4 text-slate-600">
                  Moneda: {quote.currency || "CRC"}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-600">
                  Vigencia: {quote.validUntil || "No definida"}
                </p>
              </div>
            </div>

            <div className="space-y-4 py-4">
              {previewGroups.length === 0 ? (
                <p className="text-[12px] text-slate-600">
                  No hay line items registrados.
                </p>
              ) : (
                previewGroups.map((group) => (
                  <div
                    key={group.equipmentGroup}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                      <h4 className="text-[15px] font-semibold">
                        {group.equipmentGroup}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-600">
                        Subtotal grupo: {formatCurrency(group.subtotal, quote.currency)}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {group.items.map((item, index) => (
                        <div
                          key={`${group.equipmentGroup}-${item.name}-${index}`}
                          className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_90px_110px]"
                        >
                          <div>
                            <p className="text-[13px] font-medium leading-5">
                              {item.name}
                            </p>
                            {item.description ? (
                              <p className="mt-1 text-[11px] leading-4 text-slate-600">
                                {item.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="text-[11px] leading-4 text-slate-700 md:text-right">
                            <p>Cant.: {item.quantity}</p>
                            <p>Unit.: {formatCurrency(item.unitPrice, quote.currency)}</p>
                          </div>

                          <div className="text-[12px] font-semibold leading-4 md:text-right">
                            {formatCurrency(
                              calculateLineItemTotal(item),
                              quote.currency
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Condiciones de pago
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[11px] leading-4 text-slate-700">
                    {quote.paymentTerms || "No definidas"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Garantía
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[11px] leading-4 text-slate-700">
                    {quote.warrantyTerms || "No definida"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Notas
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[11px] leading-4 text-slate-700">
                    {quote.notes || "Sin notas adicionales"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      {formatCurrency(quote.subtotal, quote.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Impuesto</span>
                    <span className="font-medium">
                      {formatCurrency(quote.tax, quote.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[14px] font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(quote.total, quote.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {canDeleteCurrentQuote ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-500/30 dark:bg-rose-500/10">
          <h3 className="text-base font-semibold text-rose-700 dark:text-rose-300">
            Zona de eliminación
          </h3>
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
            Eliminar la cotización borrará también todos sus line items.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {!confirmDelete ? (
              <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(true)}>
                Eliminar cotización
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deletingQuote}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleDeleteQuote}
                  disabled={deletingQuote}
                >
                  {deletingQuote ? "Eliminando..." : "Confirmar eliminación"}
                </button>
              </>
            )}
          </div>
        </article>
      ) : (
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
          <h3 className="text-base font-semibold text-amber-700 dark:text-amber-300">
            Acciones restringidas para agente
          </h3>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Puede editar la cotización y exportarla, pero no eliminarla ni borrar line items existentes.
          </p>
        </article>
      )}

      <div>
        <Link to={ROUTES.ADMIN_QUOTES} className="btn-secondary">
          Volver al listado
        </Link>
      </div>
    </section>
  );
}

export default AdminQuoteDetailPage;