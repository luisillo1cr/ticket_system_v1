/**
 * Build quote prefill data from a technical report.
 */

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeStringArray(values) {
  return Array.from(
    new Set((values || []).map((item) => normalizeText(item)).filter(Boolean))
  );
}

function findCatalogItemByName(name, catalogItems) {
  const normalizedName = normalizeText(name).toLowerCase();

  if (!normalizedName) {
    return null;
  }

  return (
    (catalogItems || []).find(
      (item) => normalizeText(item.name).toLowerCase() === normalizedName
    ) || null
  );
}

function getCatalogPrice(item, pricingMode = "informal") {
  if (!item) {
    return 0;
  }

  if (pricingMode === "formal") {
    return Number(item.priceFormal ?? item.defaultPrice ?? 0);
  }

  return Number(item.priceInformal ?? item.defaultPrice ?? 0);
}

function buildDeviceLabel(seed) {
  return [seed.deviceType, seed.brand, seed.model]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildQuoteNotes(seed) {
  const lines = [
    seed.reportNumber
      ? `Cotización prellenada desde la ficha técnica ${seed.reportNumber}.`
      : "Cotización prellenada desde una ficha técnica.",
  ];

  if (seed.receivedCondition) {
    lines.push(`Condición de ingreso: ${seed.receivedCondition}`);
  }

  if (seed.diagnosticsSummary) {
    lines.push(`Resumen diagnóstico: ${seed.diagnosticsSummary}`);
  }

  if (seed.workPerformedSummary) {
    lines.push(`Trabajo realizado: ${seed.workPerformedSummary}`);
  }

  if (seed.recommendationsSummary) {
    lines.push(`Resumen de recomendaciones: ${seed.recommendationsSummary}`);
  }

  const recommendations = normalizeStringArray(seed.recommendations);
  if (recommendations.length) {
    lines.push(`Recomendaciones clave: ${recommendations.join(", ")}`);
  }

  return lines.filter(Boolean).join("\n\n");
}

export function buildQuoteSeedFromTechnicalReport(report, client = null) {
  return {
    reportId: normalizeText(report?.id),
    reportNumber: normalizeText(report?.reportNumber),
    clientId: normalizeText(report?.clientId),
    clientDisplayName: normalizeText(
      client?.name || client?.company || report?.clientId || ""
    ),
    clientEmail: normalizeText(client?.email),
    clientIdNumber: normalizeText(client?.idNumber),
    quoteId: normalizeText(report?.quoteId),
    deviceType: normalizeText(report?.deviceType),
    brand: normalizeText(report?.brand),
    model: normalizeText(report?.model),
    serialNumber: normalizeText(report?.serialNumber),
    receivedCondition: normalizeText(report?.receivedCondition),
    diagnosticsSummary: normalizeText(report?.diagnosticsSummary),
    workPerformedSummary: normalizeText(report?.workPerformedSummary),
    recommendationsSummary: normalizeText(report?.recommendationsSummary),
    symptoms: normalizeStringArray(report?.symptoms),
    diagnostics: normalizeStringArray(report?.diagnostics),
    procedures: normalizeStringArray(report?.procedures),
    materialsUsed: normalizeStringArray(report?.materialsUsed),
    recommendations: normalizeStringArray(report?.recommendations),
  };
}

export function buildQuotePrefillFromTechnicalReport(
  seed,
  catalogItems = [],
  pricingMode = "informal"
) {
  const equipmentGroup = normalizeText(seed?.deviceType) || "Equipo";
  const deviceLabel = buildDeviceLabel(seed);
  const lineItems = [];

  normalizeStringArray(seed?.procedures).forEach((procedureName) => {
    const catalogItem = findCatalogItemByName(procedureName, catalogItems);

    lineItems.push({
      equipmentGroup,
      type: catalogItem?.type === "material" ? "material" : "procedure",
      name: normalizeText(catalogItem?.name || procedureName),
      description: normalizeText(catalogItem?.description),
      quantity: 1,
      unitPrice: getCatalogPrice(catalogItem, pricingMode),
    });
  });

  normalizeStringArray(seed?.materialsUsed).forEach((materialName) => {
    const catalogItem = findCatalogItemByName(materialName, catalogItems);

    lineItems.push({
      equipmentGroup,
      type: "material",
      name: normalizeText(catalogItem?.name || materialName),
      description: normalizeText(catalogItem?.description),
      quantity: 1,
      unitPrice: getCatalogPrice(catalogItem, pricingMode),
    });
  });

  if (!lineItems.length) {
    lineItems.push({
      equipmentGroup,
      type: "service",
      name: "Servicio técnico general",
      description:
        normalizeText(seed?.workPerformedSummary) ||
        normalizeText(seed?.diagnosticsSummary) ||
        "Servicio prellenado desde ficha técnica.",
      quantity: 1,
      unitPrice: 0,
    });
  }

  return {
    header: {
      clientId: normalizeText(seed?.clientId),
      clientDisplayName: normalizeText(seed?.clientDisplayName),
      clientIdNumber: normalizeText(seed?.clientIdNumber),
      clientEmail: normalizeText(seed?.clientEmail),
      title: deviceLabel
        ? `Proforma de servicios técnicos - ${deviceLabel}`
        : "Proforma de servicios técnicos",
      status: "draft",
      currency: "CRC",
      pricingMode,
      taxPercent: 13,
      validUntil: "",
      paymentTerms: "",
      warrantyTerms: "",
      notes: buildQuoteNotes(seed),
    },
    lineItems,
    sourceMeta: {
      reportId: normalizeText(seed?.reportId),
      reportNumber: normalizeText(seed?.reportNumber),
    },
  };
}