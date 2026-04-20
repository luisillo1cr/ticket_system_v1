/**
 * Ticket service layer.
 */

import {
  Timestamp,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../config/firebase";

const AUTO_CLOSE_RESOLVED_AFTER_DAYS = 7;

function mapTicketDocument(documentSnapshot) {
  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  };
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeTimestampToMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  return new Date(value).getTime();
}

function sortTicketsDesc(items) {
  return [...items].sort(
    (a, b) =>
      normalizeTimestampToMillis(b.createdAt) -
      normalizeTimestampToMillis(a.createdAt)
  );
}

function buildTicketMetrics(tickets) {
  return {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "open").length,
    inReview: tickets.filter((ticket) => ticket.status === "in_review").length,
    waitingClient: tickets.filter((ticket) => ticket.status === "waiting_client").length,
    resolved: tickets.filter(
      (ticket) => ticket.status === "resolved" || ticket.status === "closed_resolved"
    ).length,
  };
}

function sanitizeFileName(fileName) {
  return String(fileName || "archivo").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getSupportRole(currentUser) {
  return currentUser?.role === "agent" ? "agent" : "admin";
}

function getSupportFallbackName(currentUser) {
  return currentUser?.role === "agent" ? "Agente" : "Administrador";
}

function getTicketTypeFallback(currentUser) {
  return currentUser?.role === "client" ? "request" : "task";
}

function getMessageFallbackName(senderRole) {
  return senderRole === "client" ? "Cliente" : senderRole === "agent" ? "Agente" : "Administrador";
}

async function uploadTicketAttachments(ticketId, files) {
  const normalizedFiles = Array.from(files || []);
  if (!normalizedFiles.length) return [];

  const uploaded = [];

  for (const [index, file] of normalizedFiles.entries()) {
    const safeName = sanitizeFileName(file.name);
    const filePath = `tickets/${ticketId}/${Date.now()}-${index}-${safeName}`;
    const fileRef = ref(storage, filePath);

    await uploadBytes(fileRef, file, { contentType: file.type });
    const url = await getDownloadURL(fileRef);

    uploaded.push({
      name: file.name,
      url,
      path: filePath,
      contentType: file.type,
      size: file.size,
    });
  }

  return uploaded;
}

async function getNextTicketSequence(transaction, now) {
  const currentYear = now.toDate().getFullYear();
  const counterRef = doc(db, "system_counters", "tickets");
  const counterSnap = await transaction.get(counterRef);

  let nextSequence = 1;

  if (counterSnap.exists()) {
    const counterData = counterSnap.data();
    const storedYear = Number(counterData?.year ?? currentYear);
    const storedCurrent = Number(counterData?.current ?? 0);
    nextSequence = storedYear === currentYear ? storedCurrent + 1 : 1;
  }

  transaction.set(
    counterRef,
    { year: currentYear, current: nextSequence, updatedAt: now },
    { merge: true }
  );

  return { currentYear, nextSequence };
}

function isResolvedTicketReadyToAutoClose(ticket, days = AUTO_CLOSE_RESOLVED_AFTER_DAYS) {
  if (!ticket || ticket.status !== "resolved") return false;

  const baseTime =
    normalizeTimestampToMillis(ticket.updatedAt) ||
    normalizeTimestampToMillis(ticket.lastMessageAt);

  if (!baseTime) return false;

  return Date.now() - baseTime >= days * 24 * 60 * 60 * 1000;
}

export async function autoCloseResolvedTickets(days = AUTO_CLOSE_RESOLVED_AFTER_DAYS) {
  const ticketsRef = collection(db, "tickets");
  const resolvedQuery = query(ticketsRef, where("status", "==", "resolved"));
  const snapshot = await getDocs(resolvedQuery);
  const staleTickets = snapshot.docs.filter((docSnap) =>
    isResolvedTicketReadyToAutoClose({ id: docSnap.id, ...docSnap.data() }, days)
  );

  if (!staleTickets.length) return 0;

  const batch = writeBatch(db);
  const now = Timestamp.now();

  staleTickets.forEach((docSnap) => {
    batch.update(doc(db, "tickets", docSnap.id), {
      status: "closed_resolved",
      updatedAt: now,
    });
  });

  await batch.commit();
  return staleTickets.length;
}

export function subscribeAdminTickets(onData, onError) {
  const ticketsRef = collection(db, "tickets");
  const ticketsQuery = query(ticketsRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    ticketsQuery,
    (snapshot) => onData(snapshot.docs.map(mapTicketDocument)),
    (error) => {
      console.error("Error subscribing admin tickets:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeClientTickets(clientId, onData, onError) {
  const ticketsRef = collection(db, "tickets");
  const ticketsQuery = query(ticketsRef, where("clientId", "==", clientId));

  return onSnapshot(
    ticketsQuery,
    (snapshot) => onData(sortTicketsDesc(snapshot.docs.map(mapTicketDocument))),
    (error) => {
      console.error("Error subscribing client tickets:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeAdminTicketMetrics(onData, onError) {
  const ticketsRef = collection(db, "tickets");
  return onSnapshot(
    ticketsRef,
    (snapshot) => onData(buildTicketMetrics(snapshot.docs.map(mapTicketDocument))),
    (error) => {
      console.error("Error subscribing admin ticket metrics:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeClientTicketMetrics(clientId, onData, onError) {
  const ticketsRef = collection(db, "tickets");
  const ticketsQuery = query(ticketsRef, where("clientId", "==", clientId));

  return onSnapshot(
    ticketsQuery,
    (snapshot) => onData(buildTicketMetrics(snapshot.docs.map(mapTicketDocument))),
    (error) => {
      console.error("Error subscribing client ticket metrics:", error);
      if (onError) onError(error);
    }
  );
}


export function subscribeRelatedAdminTickets(clientId, currentTicketId, onData, onError) {
  const normalizedClientId = normalizeText(clientId);

  if (!normalizedClientId) {
    onData([]);
    return () => {};
  }

  const ticketsRef = collection(db, "tickets");
  const ticketsQuery = query(ticketsRef, where("clientId", "==", normalizedClientId));

  return onSnapshot(
    ticketsQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map(mapTicketDocument)
        .filter((item) => item.id !== currentTicketId)
        .sort(
          (a, b) =>
            normalizeTimestampToMillis(b.updatedAt || b.lastMessageAt || b.createdAt) -
            normalizeTimestampToMillis(a.updatedAt || a.lastMessageAt || a.createdAt)
        );

      onData(items);
    },
    (error) => {
      console.error("Error subscribing related admin tickets:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeTicketById(ticketId, onData, onError) {
  const ticketRef = doc(db, "tickets", ticketId);
  return onSnapshot(
    ticketRef,
    (snapshot) => onData(snapshot.exists() ? mapTicketDocument(snapshot) : null),
    (error) => {
      console.error("Error subscribing ticket detail:", error);
      if (onError) onError(error);
    }
  );
}

export function subscribeTicketMessages(ticketId, onData, onError) {
  const messagesRef = collection(db, "ticket_messages");
  const messagesQuery = query(messagesRef, where("ticketId", "==", ticketId));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort(
          (a, b) =>
            normalizeTimestampToMillis(a.createdAt) -
            normalizeTimestampToMillis(b.createdAt)
        );
      onData(messages);
    },
    (error) => {
      console.error("Error subscribing ticket messages:", error);
      if (onError) onError(error);
    }
  );
}

async function createTicketInternal(ticketData, currentUser, senderRole, files = []) {
  const now = Timestamp.now();
  const ticketsCollectionRef = collection(db, "tickets");
  const messagesCollectionRef = collection(db, "ticket_messages");

  const createdTicket = await runTransaction(db, async (transaction) => {
    const { currentYear, nextSequence } = await getNextTicketSequence(transaction, now);
    const ticketNumber = `TCK-${currentYear}-${String(nextSequence).padStart(4, "0")}`;
    const ticketRef = doc(ticketsCollectionRef);

    transaction.set(ticketRef, {
      ...ticketData,
      ticketNumber,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    });

    return { id: ticketRef.id, ticketNumber };
  });

  const attachments = await uploadTicketAttachments(createdTicket.id, files);
  const initialMessageRef = doc(messagesCollectionRef);

  await setDoc(initialMessageRef, {
    ticketId: createdTicket.id,
    senderId: currentUser.uid,
    senderName: currentUser.name || currentUser.email || getMessageFallbackName(senderRole),
    senderRole,
    message: normalizeText(ticketData.description),
    attachments,
    createdAt: now,
  });

  return {
    id: createdTicket.id,
    ...ticketData,
    ticketNumber: createdTicket.ticketNumber,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
  };
}

export async function createAdminTicket(payload, currentUser, files = []) {
  if (!currentUser?.uid) throw new Error("Authenticated user is required to create a ticket.");

  const assignedToUid = normalizeText(payload.assignedToUid) || currentUser.uid;
  const assignedToName = normalizeText(payload.assignedToName) || currentUser.name || currentUser.email || getSupportFallbackName(currentUser);

  return createTicketInternal(
    {
      type: normalizeText(payload.type) || getTicketTypeFallback(currentUser),
      parentTicketId: normalizeText(payload.parentTicketId),
      parentTicketNumber: normalizeText(payload.parentTicketNumber),
      clientId: normalizeText(payload.clientId),
      systemId: normalizeText(payload.systemId),
      subject: normalizeText(payload.subject),
      category: normalizeText(payload.category),
      priority: normalizeText(payload.priority),
      status: "open",
      description: normalizeText(payload.description),
      createdByUid: currentUser.uid,
      createdByName: currentUser.name || currentUser.email || getSupportFallbackName(currentUser),
      assignedToUid,
      assignedToName,
    },
    currentUser,
    getSupportRole(currentUser),
    files
  );
}

export async function createClientTicket(payload, currentUser, files = []) {
  if (!currentUser?.uid || !currentUser?.clientId) {
    throw new Error("Authenticated client user is required to create a ticket.");
  }

  return createTicketInternal(
    {
      type: normalizeText(payload.type) || getTicketTypeFallback(currentUser),
      parentTicketId: normalizeText(payload.parentTicketId),
      parentTicketNumber: normalizeText(payload.parentTicketNumber),
      clientId: currentUser.clientId,
      systemId: normalizeText(payload.systemId),
      subject: normalizeText(payload.subject),
      category: normalizeText(payload.category),
      priority: normalizeText(payload.priority),
      status: "open",
      description: normalizeText(payload.description),
      createdByUid: currentUser.uid,
      createdByName: currentUser.name || currentUser.email || "Cliente",
      assignedToUid: "",
      assignedToName: "",
    },
    currentUser,
    "client",
    files
  );
}

async function addTicketMessageInternal(ticketId, message, currentUser, senderRole, files = []) {
  if (!currentUser?.uid) throw new Error("Authenticated user is required to reply to a ticket.");

  const trimmedMessage = normalizeText(message);
  if (!trimmedMessage && (!files || files.length === 0)) {
    throw new Error("Debe escribir un mensaje o adjuntar al menos un archivo.");
  }

  const attachments = await uploadTicketAttachments(ticketId, files);
  const now = Timestamp.now();
  const ticketRef = doc(db, "tickets", ticketId);
  const messagesCollectionRef = collection(db, "ticket_messages");
  const messageRef = doc(messagesCollectionRef);

  return runTransaction(db, async (transaction) => {
    const ticketSnap = await transaction.get(ticketRef);
    if (!ticketSnap.exists()) throw new Error("Ticket not found.");

    const messageData = {
      ticketId,
      senderId: currentUser.uid,
      senderName: currentUser.name || currentUser.email || getMessageFallbackName(senderRole),
      senderRole,
      message: trimmedMessage,
      attachments,
      createdAt: now,
    };

    transaction.set(messageRef, messageData);
    transaction.update(ticketRef, { updatedAt: now, lastMessageAt: now });

    return { id: messageRef.id, ...messageData };
  });
}

export function addAdminTicketMessage(ticketId, message, currentUser, files = []) {
  return addTicketMessageInternal(ticketId, message, currentUser, getSupportRole(currentUser), files);
}

export function addClientTicketMessage(ticketId, message, currentUser, files = []) {
  return addTicketMessageInternal(ticketId, message, currentUser, "client", files);
}

export async function updateTicketStatus(ticketId, status) {
  const normalizedStatus = normalizeText(status);
  if (!normalizedStatus) throw new Error("A valid status is required.");
  await updateDoc(doc(db, "tickets", ticketId), {
    status: normalizedStatus,
    updatedAt: Timestamp.now(),
  });
}
