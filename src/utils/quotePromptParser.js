/**
 * Quote prompt parser.
 *
 * Parses structured text returned from another chat using this fixed format:
 *
 * ENCABEZADO
 * clientId:
 * clientDisplayName:
 * ...
 *
 * LINE_ITEMS
 * - type:
 *   name:
 *   description:
 *   quantity:
 *   unitPrice:
 */

function normalizeValue(value) {
  return String(value ?? "").trim();
}

function parseLineItemName(name) {
  const normalizedName = normalizeValue(name);
  const match = normalizedName.match(/^\[(.+?)\]\s+(.*)$/);

  if (!match) {
    return {
      equipmentGroup: "",
      cleanName: normalizedName,
    };
  }

  return {
    equipmentGroup: normalizeValue(match[1]),
    cleanName: normalizeValue(match[2]),
  };
}

function parseNumber(value, fallback = 0) {
  const cleaned = normalizeValue(value)
    .replace(/[₡,$]/g, "")
    .replace(/\s+/g, "");

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseHeaderLine(line) {
  const match = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.*)$/);

  if (!match) {
    return null;
  }

  return {
    key: normalizeValue(match[1]),
    value: normalizeValue(match[2]),
  };
}

export function parseQuotePromptText(rawText) {
  const text = String(rawText ?? "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  const header = {
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
  };

  const lineItems = [];

  let mode = "";
  let currentItem = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.toUpperCase() === "ENCABEZADO") {
      mode = "header";
      continue;
    }

    if (line.toUpperCase() === "LINE_ITEMS") {
      if (currentItem) {
        lineItems.push(currentItem);
        currentItem = null;
      }

      mode = "items";
      continue;
    }

    if (mode === "header") {
      const parsed = parseHeaderLine(line);

      if (!parsed) {
        continue;
      }

      const { key, value } = parsed;

      if (key === "taxPercent") {
        header.taxPercent = parseNumber(value, 13);
      } else if (key === "pricingMode") {
        header.pricingMode = value || "informal";
      } else if (key in header) {
        header[key] = value;
      }

      continue;
    }

    if (mode === "items") {
      if (line.startsWith("- ")) {
        if (currentItem) {
          lineItems.push(currentItem);
        }

        currentItem = {
          equipmentGroup: "",
          type: "service",
          name: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
        };

        const firstLine = line.slice(2).trim();
        const parsed = parseHeaderLine(firstLine);

        if (parsed) {
          if (parsed.key === "quantity") {
            currentItem.quantity = parseNumber(parsed.value, 1);
          } else if (parsed.key === "unitPrice") {
            currentItem.unitPrice = parseNumber(parsed.value, 0);
          } else if (parsed.key === "name") {
            const nameParts = parseLineItemName(parsed.value);
            currentItem.name = nameParts.cleanName;
            currentItem.equipmentGroup = nameParts.equipmentGroup;
          } else {
            currentItem[parsed.key] = parsed.value;
          }
        }

        continue;
      }

      if (!currentItem) {
        continue;
      }

      const parsed = parseHeaderLine(line);

      if (!parsed) {
        continue;
      }

      if (parsed.key === "quantity") {
        currentItem.quantity = parseNumber(parsed.value, 1);
      } else if (parsed.key === "unitPrice") {
        currentItem.unitPrice = parseNumber(parsed.value, 0);
      } else if (parsed.key === "name") {
        const nameParts = parseLineItemName(parsed.value);
        currentItem.name = nameParts.cleanName;
        currentItem.equipmentGroup = nameParts.equipmentGroup;
      } else {
        currentItem[parsed.key] = parsed.value;
      }
    }
  }

  if (currentItem) {
    lineItems.push(currentItem);
  }

  return {
    header,
    lineItems: lineItems.filter((item) => normalizeValue(item.name)),
  };
}