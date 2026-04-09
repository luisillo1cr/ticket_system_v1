/**
 * Clients, systems and client access service layer.
 */

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { db, secondaryAuth } from "../config/firebase";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeId(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapCollectionDocs(snapshot) {
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

function sortByLabel(items, fallbackKey = "id") {
  return [...items].sort((a, b) => {
    const left = String(a.name || a.company || a[fallbackKey] || "").toLowerCase();
    const right = String(b.name || b.company || b[fallbackKey] || "").toLowerCase();
    return left.localeCompare(right);
  });
}

function buildClientPayload(payload) {
  const name = normalizeText(payload.name || payload.company);
  const company = normalizeText(payload.company || payload.name);

  return {
    name,
    company,
    email: normalizeText(payload.email),
    phoneType: normalizeText(payload.phoneType || "national") || "national",
    phone: normalizeText(payload.phone),
    contactPerson: normalizeText(payload.contactPerson),
    idType: normalizeText(payload.idType || "national") || "national",
    idNumber: normalizeText(payload.idNumber),
    status: normalizeText(payload.status || "active") || "active",
    supportPriority:
      normalizeText(payload.supportPriority || "normal") || "normal",
    notes: normalizeText(payload.notes),
  };
}

function buildSystemPayload(payload) {
  return {
    clientId: normalizeText(payload.clientId),
    name: normalizeText(payload.name),
    type: normalizeText(payload.type),
    status: normalizeText(payload.status || "active") || "active",
    accessUrl: normalizeText(payload.accessUrl),
    notes: normalizeText(payload.notes),
  };
}

export function subscribeClients(onData, onError) {
  const clientsRef = collection(db, "clients");

  return onSnapshot(
    clientsRef,
    (snapshot) => {
      onData(sortByLabel(mapCollectionDocs(snapshot)));
    },
    (error) => {
      console.error("Error subscribing clients:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeClientById(clientId, onData, onError) {
  const normalizedClientId = normalizeText(clientId);

  if (!normalizedClientId) {
    onData(null);
    return () => {};
  }

  const clientRef = doc(db, "clients", normalizedClientId);

  return onSnapshot(
    clientRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData({ id: snapshot.id, ...snapshot.data() });
    },
    (error) => {
      console.error("Error subscribing client by id:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeSystems(onData, onError) {
  const systemsRef = collection(db, "systems");

  return onSnapshot(
    systemsRef,
    (snapshot) => {
      onData(sortByLabel(mapCollectionDocs(snapshot)));
    },
    (error) => {
      console.error("Error subscribing systems:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeSystemsByClient(clientId, onData, onError) {
  const normalizedClientId = normalizeText(clientId);

  if (!normalizedClientId) {
    onData([]);
    return () => {};
  }

  const systemsRef = collection(db, "systems");
  const systemsQuery = query(systemsRef, where("clientId", "==", normalizedClientId));

  return onSnapshot(
    systemsQuery,
    (snapshot) => {
      onData(sortByLabel(mapCollectionDocs(snapshot)));
    },
    (error) => {
      console.error("Error subscribing systems by client:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeClientAccessUsers(clientId, onData, onError) {
  const normalizedClientId = normalizeText(clientId);

  if (!normalizedClientId) {
    onData([]);
    return () => {};
  }

  const usersRef = collection(db, "users");
  const usersQuery = query(
    usersRef,
    where("role", "==", "client"),
    where("clientId", "==", normalizedClientId)
  );

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      onData(sortByLabel(mapCollectionDocs(snapshot), "email"));
    },
    (error) => {
      console.error("Error subscribing client access users:", error);
      if (onError) onError(error);
    }
  );
}

export async function createClient(payload) {
  const normalized = buildClientPayload(payload);
  const preferredId = normalizeId(payload.clientId || normalized.company || normalized.name);

  if (!preferredId) {
    throw new Error("El identificador del cliente es obligatorio.");
  }

  const clientRef = doc(db, "clients", preferredId);
  const now = Timestamp.now();

  await setDoc(clientRef, {
    ...normalized,
    createdAt: now,
    updatedAt: now,
  });

  return { id: preferredId, ...normalized, createdAt: now, updatedAt: now };
}

export async function updateClient(clientId, payload) {
  const normalizedClientId = normalizeText(clientId);
  if (!normalizedClientId) throw new Error("Client ID is required.");

  await updateDoc(doc(db, "clients", normalizedClientId), {
    ...buildClientPayload(payload),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteClientCascade(clientId) {
  const normalizedClientId = normalizeText(clientId);
  if (!normalizedClientId) throw new Error("Client ID is required.");

  const systemsQuery = query(collection(db, "systems"), where("clientId", "==", normalizedClientId));
  const usersQuery = query(collection(db, "users"), where("clientId", "==", normalizedClientId));
  const [systemsSnapshot, usersSnapshot] = await Promise.all([getDocs(systemsQuery), getDocs(usersQuery)]);
  const batch = writeBatch(db);

  systemsSnapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  usersSnapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  batch.delete(doc(db, "clients", normalizedClientId));

  await batch.commit();
}

export async function createSystem(payload) {
  const normalized = buildSystemPayload(payload);

  if (!normalized.clientId) throw new Error("El cliente del sistema es obligatorio.");
  if (!normalized.name) throw new Error("El nombre del sistema es obligatorio.");

  const systemId = normalizeId(`${normalized.clientId}_${normalized.name}`);
  const now = Timestamp.now();

  await setDoc(doc(db, "systems", systemId), {
    ...normalized,
    createdAt: now,
    updatedAt: now,
  });

  return { id: systemId, ...normalized, createdAt: now, updatedAt: now };
}

export async function updateSystem(systemId, payload) {
  const normalizedSystemId = normalizeText(systemId);
  if (!normalizedSystemId) throw new Error("System ID is required.");

  await updateDoc(doc(db, "systems", normalizedSystemId), {
    ...buildSystemPayload(payload),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteSystem(systemId) {
  const normalizedSystemId = normalizeText(systemId);
  if (!normalizedSystemId) throw new Error("System ID is required.");

  await deleteDoc(doc(db, "systems", normalizedSystemId));
}

export async function createClientAccessUser(payload, currentUser) {
  const email = normalizeText(payload.email).toLowerCase();
  const password = String(payload.password || "").trim();
  const clientId = normalizeText(payload.clientId);
  const name = normalizeText(payload.name);

  if (!clientId) throw new Error("El cliente asociado es obligatorio.");
  if (!name) throw new Error("El nombre del usuario es obligatorio.");
  if (!email) throw new Error("El correo del usuario es obligatorio.");
  if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");

  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const now = Timestamp.now();

  await setDoc(doc(db, "users", credential.user.uid), {
    name,
    email,
    role: "client",
    clientId,
    active: true,
    createdAt: now,
    updatedAt: now,
    createdByUid: currentUser?.uid || "",
    createdByName: currentUser?.name || currentUser?.email || "Administrador",
  });

  await signOut(secondaryAuth);

  return {
    uid: credential.user.uid,
    name,
    email,
    clientId,
    active: true,
  };
}

export async function updateClientAccessUser(userId, payload) {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) throw new Error("User ID is required.");

  await updateDoc(doc(db, "users", normalizedUserId), {
    name: normalizeText(payload.name),
    active: Boolean(payload.active),
    updatedAt: Timestamp.now(),
  });
}

export async function sendClientAccessResetEmail(email) {
  const normalizedEmail = normalizeText(email).toLowerCase();
  if (!normalizedEmail) throw new Error("El correo es obligatorio.");
  await sendPasswordResetEmail(secondaryAuth, normalizedEmail);
}
