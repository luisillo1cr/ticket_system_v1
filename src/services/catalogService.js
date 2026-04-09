/**
 * Service catalog service layer.
 */

import {
  Timestamp,
  collection,
  doc,
  getDocs,
  onSnapshot,
  writeBatch,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { BASE_SERVICE_CATALOG } from "../constants/catalog";

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeItems(items) {
  return [...items].sort((a, b) => {
    const typeCompare = String(a.type || "").localeCompare(String(b.type || ""));
    if (typeCompare !== 0) {
      return typeCompare;
    }

    const orderA = Number(a.sortOrder ?? 0);
    const orderB = Number(b.sortOrder ?? 0);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function normalizeCatalogId(type, name) {
  return `${type}-${name}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePayload(payload) {
  const priceInformal = normalizeNumber(payload.priceInformal, 0);
  const priceFormal = normalizeNumber(payload.priceFormal, priceInformal);
  const defaultPrice = normalizeNumber(payload.defaultPrice, priceInformal);

  return {
    type: String(payload.type ?? "").trim(),
    name: String(payload.name ?? "").trim(),
    description: String(payload.description ?? "").trim(),
    defaultPrice,
    priceInformal,
    priceFormal,
    active: Boolean(payload.active),
    sortOrder: normalizeNumber(payload.sortOrder, 0),
  };
}

export function subscribeServiceCatalog(onData, onError) {
  const catalogRef = collection(db, "service_catalog");

  return onSnapshot(
    catalogRef,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      onData(normalizeItems(items));
    },
    (error) => {
      console.error("Error subscribing service catalog:", error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export async function replaceServiceCatalogWithBase() {
  const catalogRef = collection(db, "service_catalog");
  const snapshot = await getDocs(catalogRef);
  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  const now = Timestamp.now();

  BASE_SERVICE_CATALOG.forEach((item) => {
    const docId = normalizeCatalogId(item.type, item.name);
    const itemRef = doc(catalogRef, docId);

    batch.set(itemRef, {
      ...item,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
}

export async function createCatalogItem(payload) {
  const normalized = normalizePayload(payload);
  const catalogRef = collection(db, "service_catalog");
  const docId = normalizeCatalogId(normalized.type, normalized.name);
  const itemRef = doc(catalogRef, docId);
  const now = Timestamp.now();

  await setDoc(itemRef, {
    ...normalized,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCatalogItem(itemId, payload) {
  const normalized = normalizePayload(payload);
  const itemRef = doc(db, "service_catalog", itemId);

  await updateDoc(itemRef, {
    ...normalized,
    updatedAt: Timestamp.now(),
  });
}