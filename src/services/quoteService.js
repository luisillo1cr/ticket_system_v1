/**
 * Quotes service layer.
 */

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapQuoteDocument(documentSnapshot) {
  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  };
}

function stripEquipmentPrefix(name) {
  const normalizedName = normalizeText(name);
  const match = normalizedName.match(/^\[(.+?)\]\s+(.*)$/);

  return match ? normalizeText(match[2]) : normalizedName;
}

function buildStoredLineItemName(item) {
  const rawName = normalizeText(item.name);
  const equipmentGroup = normalizeText(item.equipmentGroup);

  if (!rawName) {
    return "";
  }

  if (rawName.startsWith("[")) {
    return rawName;
  }

  return equipmentGroup ? `[${equipmentGroup}] ${rawName}` : rawName;
}

function findCatalogMatchForLineItemName(lineItemName, catalogItems = []) {
  const normalizedName = stripEquipmentPrefix(lineItemName).toLowerCase();

  if (!normalizedName) {
    return null;
  }

  return (
    catalogItems.find(
      (item) => normalizeText(item.name).toLowerCase() === normalizedName
    ) || null
  );
}

function getSuggestedCatalogPrice(catalogItem, pricingMode) {
  if (!catalogItem) {
    return null;
  }

  if (pricingMode === "formal") {
    return normalizeNumber(
      catalogItem.priceFormal,
      normalizeNumber(catalogItem.defaultPrice, 0)
    );
  }

  return normalizeNumber(
    catalogItem.priceInformal,
    normalizeNumber(catalogItem.defaultPrice, 0)
  );
}

export function calculateLineItemTotal(item) {
  const quantity = normalizeNumber(item.quantity, 0);
  const unitPrice = normalizeNumber(item.unitPrice, 0);

  return roundCurrency(quantity * unitPrice);
}

export function calculateQuoteTotals(lineItems, taxPercent = 0) {
  const subtotal = roundCurrency(
    (lineItems || []).reduce((acc, item) => acc + calculateLineItemTotal(item), 0)
  );

  const normalizedTaxPercent = normalizeNumber(taxPercent, 0);
  const tax = roundCurrency(subtotal * (normalizedTaxPercent / 100));
  const total = roundCurrency(subtotal + tax);

  return {
    subtotal,
    tax,
    total,
  };
}

function normalizeLineItemPayload(item, sortOrder = 0) {
  const quantity = normalizeNumber(item.quantity, 1);
  const unitPrice = normalizeNumber(item.unitPrice, 0);
  const equipmentGroup = normalizeText(item.equipmentGroup);
  const storedName = buildStoredLineItemName(item);

  return {
    equipmentGroup,
    type: normalizeText(item.type || "service") || "service",
    name: storedName,
    description: normalizeText(item.description),
    quantity,
    unitPrice,
    total: calculateLineItemTotal({ quantity, unitPrice }),
    sortOrder,
  };
}

async function getQuoteLineItems(quoteId) {
  const lineItemsRef = collection(db, "quotes", quoteId, "lineItems");
  const snapshot = await getDocs(lineItemsRef);

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
}

async function recalculateQuoteTotals(quoteId, taxPercentOverride) {
  const quoteRef = doc(db, "quotes", quoteId);
  const quoteSnap = await getDoc(quoteRef);

  if (!quoteSnap.exists()) {
    throw new Error("Quote not found.");
  }

  const quoteData = quoteSnap.data();
  const lineItems = await getQuoteLineItems(quoteId);
  const taxPercent =
    taxPercentOverride !== undefined
      ? normalizeNumber(taxPercentOverride, 0)
      : normalizeNumber(quoteData.taxPercent, 0);

  const totals = calculateQuoteTotals(lineItems, taxPercent);

  await updateDoc(quoteRef, {
    taxPercent,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    updatedAt: Timestamp.now(),
  });

  return totals;
}

export function subscribeAdminQuotes(onData, onError) {
  const quotesRef = collection(db, "quotes");
  const quotesQuery = query(quotesRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    quotesQuery,
    (snapshot) => {
      const quotes = snapshot.docs.map(mapQuoteDocument);
      onData(quotes);
    },
    (error) => {
      console.error("Error subscribing quotes:", error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export function subscribeQuoteById(quoteId, onData, onError) {
  const quoteRef = doc(db, "quotes", quoteId);

  return onSnapshot(
    quoteRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData(mapQuoteDocument(snapshot));
    },
    (error) => {
      console.error("Error subscribing quote detail:", error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export function subscribeQuoteLineItems(quoteId, onData, onError) {
  const lineItemsRef = collection(db, "quotes", quoteId, "lineItems");
  const lineItemsQuery = query(lineItemsRef, orderBy("sortOrder", "asc"));

  return onSnapshot(
    lineItemsQuery,
    (snapshot) => {
      const lineItems = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      onData(lineItems);
    },
    (error) => {
      console.error("Error subscribing quote line items:", error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export async function createQuote(payload, lineItems, currentUser) {
  if (!currentUser?.uid) {
    throw new Error("Authenticated user is required.");
  }

  const normalizedLineItems = (lineItems || [])
    .map((item, index) => normalizeLineItemPayload(item, index + 1))
    .filter((item) => item.name);

  if (!normalizedLineItems.length) {
    throw new Error("Debe agregar al menos un line item.");
  }

  const now = Timestamp.now();
  const currentYear = now.toDate().getFullYear();

  const counterRef = doc(db, "system_counters", "quotes");
  const quotesCollectionRef = collection(db, "quotes");

  return runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);

    let nextSequence = 1;

    if (counterSnap.exists()) {
      const counterData = counterSnap.data();
      const storedYear = Number(counterData?.year ?? currentYear);
      const storedCurrent = Number(counterData?.current ?? 0);

      nextSequence = storedYear === currentYear ? storedCurrent + 1 : 1;
    }

    const quoteNumber = `COT-${currentYear}-${String(nextSequence).padStart(4, "0")}`;
    const quoteRef = doc(quotesCollectionRef);
    const lineItemsRef = collection(quoteRef, "lineItems");
    const taxPercent = normalizeNumber(payload.taxPercent, 0);
    const totals = calculateQuoteTotals(normalizedLineItems, taxPercent);

    const quoteData = {
      quoteNumber,
      clientId: normalizeText(payload.clientId),
      clientDisplayName: normalizeText(payload.clientDisplayName),
      clientIdNumber: normalizeText(payload.clientIdNumber),
      clientEmail: normalizeText(payload.clientEmail),
      title: normalizeText(payload.title),
      status: normalizeText(payload.status || "draft") || "draft",
      currency: normalizeText(payload.currency || "CRC") || "CRC",
      pricingMode: normalizeText(payload.pricingMode || "informal") || "informal",
      validUntil: normalizeText(payload.validUntil),
      paymentTerms: normalizeText(payload.paymentTerms),
      warrantyTerms: normalizeText(payload.warrantyTerms),
      notes: normalizeText(payload.notes),
      taxPercent,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      createdByUid: currentUser.uid,
      createdByName: currentUser.name || currentUser.email || "Administrador",
      createdAt: now,
      updatedAt: now,
    };

    transaction.set(
      counterRef,
      {
        year: currentYear,
        current: nextSequence,
        updatedAt: now,
      },
      { merge: true }
    );

    transaction.set(quoteRef, quoteData);

    normalizedLineItems.forEach((item) => {
      const lineItemRef = doc(lineItemsRef);

      transaction.set(lineItemRef, {
        ...item,
        createdAt: now,
        updatedAt: now,
      });
    });

    return {
      id: quoteRef.id,
      ...quoteData,
    };
  });
}

export async function updateQuoteHeader(quoteId, payload) {
  const quoteRef = doc(db, "quotes", quoteId);
  const currentLineItems = await getQuoteLineItems(quoteId);
  const taxPercent = normalizeNumber(payload.taxPercent, 0);
  const totals = calculateQuoteTotals(currentLineItems, taxPercent);

  await updateDoc(quoteRef, {
    clientId: normalizeText(payload.clientId),
    clientDisplayName: normalizeText(payload.clientDisplayName),
    clientIdNumber: normalizeText(payload.clientIdNumber),
    clientEmail: normalizeText(payload.clientEmail),
    title: normalizeText(payload.title),
    status: normalizeText(payload.status || "draft") || "draft",
    currency: normalizeText(payload.currency || "CRC") || "CRC",
    pricingMode: normalizeText(payload.pricingMode || "informal") || "informal",
    validUntil: normalizeText(payload.validUntil),
    paymentTerms: normalizeText(payload.paymentTerms),
    warrantyTerms: normalizeText(payload.warrantyTerms),
    notes: normalizeText(payload.notes),
    taxPercent,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    updatedAt: Timestamp.now(),
  });
}

export async function addQuoteLineItem(quoteId, payload) {
  const quoteRef = doc(db, "quotes", quoteId);
  const lineItemsRef = collection(quoteRef, "lineItems");
  const currentLineItems = await getQuoteLineItems(quoteId);
  const nextSortOrder =
    currentLineItems.reduce((acc, item) => Math.max(acc, Number(item.sortOrder ?? 0)), 0) + 1;

  const normalized = normalizeLineItemPayload(payload, nextSortOrder);

  if (!normalized.name) {
    throw new Error("El nombre del line item es obligatorio.");
  }

  const lineItemRef = doc(lineItemsRef);
  const now = Timestamp.now();

  await setDoc(lineItemRef, {
    ...normalized,
    createdAt: now,
    updatedAt: now,
  });

  await recalculateQuoteTotals(quoteId);
}

export async function updateQuoteLineItem(quoteId, lineItemId, payload) {
  const lineItemRef = doc(db, "quotes", quoteId, "lineItems", lineItemId);
  const currentSnap = await getDoc(lineItemRef);

  if (!currentSnap.exists()) {
    throw new Error("Line item not found.");
  }

  const currentData = currentSnap.data();
  const normalized = normalizeLineItemPayload(payload, Number(currentData.sortOrder ?? 0));

  if (!normalized.name) {
    throw new Error("El nombre del line item es obligatorio.");
  }

  await updateDoc(lineItemRef, {
    ...normalized,
    updatedAt: Timestamp.now(),
  });

  await recalculateQuoteTotals(quoteId);
}

export async function applyPricingModeToQuoteLineItems(
  quoteId,
  pricingMode,
  catalogItems = []
) {
  const normalizedPricingMode =
    normalizeText(pricingMode || "informal") || "informal";

  const currentLineItems = await getQuoteLineItems(quoteId);

  if (!currentLineItems.length || !catalogItems.length) {
    return 0;
  }

  const now = Timestamp.now();
  const batch = writeBatch(db);
  let updatedCount = 0;

  currentLineItems.forEach((item) => {
    const matchedCatalogItem = findCatalogMatchForLineItemName(
      item.name,
      catalogItems
    );

    if (!matchedCatalogItem) {
      return;
    }

    const nextUnitPrice = getSuggestedCatalogPrice(
      matchedCatalogItem,
      normalizedPricingMode
    );

    const nextType =
      matchedCatalogItem.type === "material"
        ? "material"
        : matchedCatalogItem.type === "procedure"
        ? "procedure"
        : item.type || "service";

    const currentUnitPrice = normalizeNumber(item.unitPrice, 0);
    const nextTotal = calculateLineItemTotal({
      quantity: item.quantity,
      unitPrice: nextUnitPrice,
    });

    const currentTotal = normalizeNumber(item.total, 0);

    if (
      currentUnitPrice === nextUnitPrice &&
      currentTotal === nextTotal &&
      (item.type || "service") === nextType
    ) {
      return;
    }

    const lineItemRef = doc(db, "quotes", quoteId, "lineItems", item.id);

    batch.update(lineItemRef, {
      type: nextType,
      unitPrice: nextUnitPrice,
      total: nextTotal,
      updatedAt: now,
    });

    updatedCount += 1;
  });

  if (!updatedCount) {
    return 0;
  }

  await batch.commit();
  await recalculateQuoteTotals(quoteId);

  return updatedCount;
}

export async function deleteQuoteLineItem(quoteId, lineItemId) {
  const lineItemRef = doc(db, "quotes", quoteId, "lineItems", lineItemId);
  await deleteDoc(lineItemRef);
  await recalculateQuoteTotals(quoteId);
}

export async function deleteQuote(quoteId) {
  const quoteRef = doc(db, "quotes", quoteId);
  const lineItemsRef = collection(db, "quotes", quoteId, "lineItems");
  const lineItemsSnapshot = await getDocs(lineItemsRef);
  const batch = writeBatch(db);

  lineItemsSnapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  batch.delete(quoteRef);

  await batch.commit();
}