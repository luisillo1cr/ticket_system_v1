/**
 * Internal operational board service.
 */

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const BOARD_STATUS_ORDER = ["todo", "in_progress", "in_review", "done"];
const BOARD_PRIORITY_ORDER = ["low", "medium", "high", "urgent"];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value) {
  const normalized = normalizeText(value);
  return BOARD_STATUS_ORDER.includes(normalized) ? normalized : "todo";
}

function normalizePriority(value) {
  const normalized = normalizeText(value).toLowerCase();
  return BOARD_PRIORITY_ORDER.includes(normalized) ? normalized : "medium";
}

function mapTask(documentSnapshot) {
  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  };
}

function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  return new Date(value).getTime();
}

function sortTasks(items) {
  return [...items].sort((a, b) => {
    const statusDelta =
      BOARD_STATUS_ORDER.indexOf(a.status) - BOARD_STATUS_ORDER.indexOf(b.status);
    if (statusDelta !== 0) return statusDelta;

    const orderDelta = Number(a.order ?? 0) - Number(b.order ?? 0);
    if (orderDelta !== 0) return orderDelta;

    return getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt);
  });
}

function getUserDisplayName(currentUser) {
  return (
    normalizeText(currentUser?.name) ||
    normalizeText(currentUser?.displayName) ||
    normalizeText(currentUser?.email) ||
    "Soporte"
  );
}

export function subscribeBoardTasks(onData, onError) {
  const tasksRef = collection(db, "board_tasks");

  return onSnapshot(
    tasksRef,
    (snapshot) => {
      onData(sortTasks(snapshot.docs.map(mapTask)));
    },
    (error) => {
      console.error("Error subscribing board tasks:", error);
      if (onError) onError(error);
    }
  );
}

export async function createBoardTask(payload, currentUser) {
  const taskRef = doc(collection(db, "board_tasks"));
  const now = Timestamp.now();

  const title = normalizeText(payload.title);
  if (!title) {
    throw new Error("El título de la tarea es obligatorio.");
  }

  const task = {
    title,
    description: normalizeText(payload.description),
    status: "todo",
    priority: normalizePriority(payload.priority),
    assigneeUid: normalizeText(payload.assigneeUid),
    assigneeName: normalizeText(payload.assigneeName),
    createdByUid: currentUser?.uid || "",
    createdByName: getUserDisplayName(currentUser),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    completedByUid: null,
    completedByName: null,
    order: Number.isInteger(payload.order) ? payload.order : Date.now(),
  };

  await setDoc(taskRef, task);

  return {
    id: taskRef.id,
    ...task,
  };
}

export async function updateBoardTask(taskId, payload, currentUser) {
  const now = Timestamp.now();
  const updatePayload = {
    updatedAt: now,
  };

  if ("title" in payload) {
    const title = normalizeText(payload.title);
    if (!title) {
      throw new Error("El título de la tarea es obligatorio.");
    }
    updatePayload.title = title;
  }

  if ("description" in payload) {
    updatePayload.description = normalizeText(payload.description);
  }

  if ("priority" in payload) {
    updatePayload.priority = normalizePriority(payload.priority);
  }

  if ("assigneeUid" in payload) {
    updatePayload.assigneeUid = normalizeText(payload.assigneeUid);
  }

  if ("assigneeName" in payload) {
    updatePayload.assigneeName = normalizeText(payload.assigneeName);
  }

  if ("order" in payload) {
    updatePayload.order = Number.isInteger(payload.order)
      ? payload.order
      : Number(payload.order ?? 0);
  }

  if ("status" in payload) {
    const nextStatus = normalizeStatus(payload.status);
    updatePayload.status = nextStatus;

    if (nextStatus === "done") {
      updatePayload.completedAt = now;
      updatePayload.completedByUid = currentUser?.uid || "";
      updatePayload.completedByName = getUserDisplayName(currentUser);
    } else {
      updatePayload.completedAt = null;
      updatePayload.completedByUid = null;
      updatePayload.completedByName = null;
    }
  }

  await updateDoc(doc(db, "board_tasks", taskId), updatePayload);
}

export async function moveBoardTask(taskId, status, order = Date.now(), currentUser = null) {
  const nextStatus = normalizeStatus(status);
  const now = Timestamp.now();

  const payload = {
    status: nextStatus,
    order: Number.isInteger(order) ? order : Number(order || Date.now()),
    updatedAt: now,
  };

  if (nextStatus === "done") {
    payload.completedAt = now;
    payload.completedByUid = currentUser?.uid || "";
    payload.completedByName = getUserDisplayName(currentUser);
  } else {
    payload.completedAt = null;
    payload.completedByUid = null;
    payload.completedByName = null;
  }

  await updateDoc(doc(db, "board_tasks", taskId), payload);
}

export async function deleteBoardTask(taskId) {
  await deleteDoc(doc(db, "board_tasks", taskId));
}

export const BOARD_STATUSES = BOARD_STATUS_ORDER;
export const BOARD_PRIORITIES = BOARD_PRIORITY_ORDER;