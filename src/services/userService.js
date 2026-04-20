/**
 * Internal users and roles service layer.
 */

import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
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

function mapCollectionDocs(snapshot) {
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

function sortUsers(items) {
  return [...items].sort((a, b) => {
    const left = String(a.name || a.email || a.id || "").toLowerCase();
    const right = String(b.name || b.email || b.id || "").toLowerCase();
    return left.localeCompare(right);
  });
}

export function subscribeInternalUsers(onData, onError) {
  const usersRef = collection(db, "users");
  const usersQuery = query(usersRef, where("role", "in", ["admin", "agent"]));

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      onData(sortUsers(mapCollectionDocs(snapshot)));
    },
    (error) => {
      console.error("Error subscribing internal users:", error);
      if (onError) onError(error);
    }
  );
}

export async function createInternalUser(payload, currentUser) {
  const email = normalizeText(payload.email).toLowerCase();
  const password = String(payload.password || "").trim();
  const name = normalizeText(payload.name);
  const role = normalizeText(payload.role || "agent") || "agent";

  if (!name) throw new Error("El nombre del usuario es obligatorio.");
  if (!email) throw new Error("El correo del usuario es obligatorio.");
  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }
  if (!["admin", "agent"].includes(role)) {
    throw new Error("El rol interno debe ser admin o agent.");
  }

  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const now = Timestamp.now();

  await setDoc(doc(db, "users", credential.user.uid), {
    name,
    email,
    role,
    active: payload.active !== false,
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
    role,
    active: payload.active !== false,
  };
}

export async function updateInternalUser(userId, payload) {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) throw new Error("User ID is required.");

  const role = normalizeText(payload.role || "agent") || "agent";
  if (!["admin", "agent"].includes(role)) {
    throw new Error("El rol interno debe ser admin o agent.");
  }

  await updateDoc(doc(db, "users", normalizedUserId), {
    name: normalizeText(payload.name),
    role,
    active: payload.active !== false,
    updatedAt: Timestamp.now(),
  });
}

export async function sendInternalUserResetEmail(email) {
  const normalizedEmail = normalizeText(email).toLowerCase();
  if (!normalizedEmail) throw new Error("El correo es obligatorio.");
  await sendPasswordResetEmail(secondaryAuth, normalizedEmail);
}
