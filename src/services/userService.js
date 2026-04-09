/**
 * Internal staff users and role management service layer.
 */

import { Timestamp, collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { db, secondaryAuth } from "../config/firebase";

const INTERNAL_ROLE_VALUES = new Set(["admin", "agent"]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isInternalRole(value) {
  return INTERNAL_ROLE_VALUES.has(normalizeText(value).toLowerCase());
}

function normalizeRole(value) {
  const normalized = normalizeText(value).toLowerCase();
  return isInternalRole(normalized) ? normalized : "agent";
}

function mapCollectionDocs(snapshot) {
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

function sortInternalUsers(users) {
  const roleRank = { admin: 0, agent: 1 };

  return [...users].sort((left, right) => {
    const leftRank = roleRank[left.role] ?? 99;
    const rightRank = roleRank[right.role] ?? 99;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return String(left.name || left.email || left.id || "")
      .toLowerCase()
      .localeCompare(String(right.name || right.email || right.id || "").toLowerCase());
  });
}

export function subscribeInternalUsers(onData, onError) {
  const usersRef = collection(db, "users");

  return onSnapshot(
    usersRef,
    (snapshot) => {
      const internalUsers = mapCollectionDocs(snapshot).filter((user) =>
        isInternalRole(user.role)
      );

      onData(sortInternalUsers(internalUsers));
    },
    (error) => {
      console.error("Error subscribing internal users:", error);
      if (onError) onError(error);
    }
  );
}

export async function createInternalUser(payload, currentUser) {
  const name = normalizeText(payload.name);
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "").trim();
  const role = normalizeRole(payload.role);
  const active = payload.active !== false;

  if (!name) throw new Error("El nombre del usuario interno es obligatorio.");
  if (!email) throw new Error("El correo del usuario interno es obligatorio.");
  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const now = Timestamp.now();

  await setDoc(doc(db, "users", credential.user.uid), {
    name,
    email,
    role,
    active,
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
    active,
  };
}

export async function updateInternalUser(userId, payload) {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    throw new Error("El identificador del usuario es obligatorio.");
  }

  await updateDoc(doc(db, "users", normalizedUserId), {
    name: normalizeText(payload.name),
    role: normalizeRole(payload.role),
    active: Boolean(payload.active),
    updatedAt: Timestamp.now(),
  });
}

export async function sendInternalUserResetEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("El correo es obligatorio.");
  }

  await sendPasswordResetEmail(secondaryAuth, normalizedEmail);
}
