/**
 * Technical reports service layer.
 */

import {
  Timestamp,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../config/firebase";

function mapReportDocument(documentSnapshot) {
  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  };
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeStringArray(values) {
  return Array.from(
    new Set((values || []).map((item) => String(item).trim()).filter(Boolean))
  );
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadTechnicalReportAttachments(reportId, files) {
  const normalizedFiles = Array.from(files || []);

  if (normalizedFiles.length === 0) {
    return [];
  }

  const uploaded = await Promise.all(
    normalizedFiles.map(async (file, index) => {
      const safeName = sanitizeFileName(file.name);
      const filePath = `technical-reports/${reportId}/${Date.now()}-${index}-${safeName}`;
      const fileRef = ref(storage, filePath);

      await uploadBytes(fileRef, file, {
        contentType: file.type,
      });

      const url = await getDownloadURL(fileRef);

      return {
        name: file.name,
        url,
        path: filePath,
        contentType: file.type,
        size: file.size,
      };
    })
  );

  return uploaded;
}

export function subscribeAdminTechnicalReports(onData, onError) {
  const reportsRef = collection(db, "technical_reports");
  const reportsQuery = query(reportsRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      const reports = snapshot.docs.map(mapReportDocument);
      onData(reports);
    },
    (error) => {
      console.error("Error subscribing technical reports:", error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export function subscribeClientTechnicalReports(clientId, onData, onError) {
  const normalizedClientId = normalizeText(clientId);

  if (!normalizedClientId) {
    onData([]);
    return () => {};
  }

  const reportsRef = collection(db, "technical_reports");
  const reportsQuery = query(reportsRef, where("clientId", "==", normalizedClientId));

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      const reports = snapshot.docs
        .map(mapReportDocument)
        .sort((left, right) => {
          const leftTime = typeof left.updatedAt?.toMillis === "function" ? left.updatedAt.toMillis() : 0;
          const rightTime = typeof right.updatedAt?.toMillis === "function" ? right.updatedAt.toMillis() : 0;
          return rightTime - leftTime;
        });
      onData(reports);
    },
    (error) => {
      console.error("Error subscribing client technical reports:", error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export function subscribeTechnicalReportById(reportId, onData, onError) {
  const reportRef = doc(db, "technical_reports", reportId);

  return onSnapshot(
    reportRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData(mapReportDocument(snapshot));
    },
    (error) => {
      console.error("Error subscribing technical report detail:", error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export function subscribeTechnicalReportsBySourceTicketId(ticketId, onData, onError) {
  const reportsRef = collection(db, "technical_reports");
  const reportsQuery = query(reportsRef, where("sourceTicketId", "==", ticketId));

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      const reports = snapshot.docs
        .map(mapReportDocument)
        .sort((a, b) => {
          const aTime = typeof a.updatedAt?.toMillis === "function" ? a.updatedAt.toMillis() : 0;
          const bTime = typeof b.updatedAt?.toMillis === "function" ? b.updatedAt.toMillis() : 0;
          return bTime - aTime;
        });
      onData(reports);
    },
    (error) => {
      console.error("Error subscribing source-ticket technical reports:", error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export async function getTechnicalReportById(reportId) {
  const reportRef = doc(db, "technical_reports", reportId);
  const reportSnap = await getDoc(reportRef);

  if (!reportSnap.exists()) {
    return null;
  }

  return mapReportDocument(reportSnap);
}

export async function createTechnicalReport(payload, currentUser) {
  if (!currentUser?.uid) {
    throw new Error("Authenticated user is required.");
  }

  const now = Timestamp.now();
  const currentYear = now.toDate().getFullYear();

  const counterRef = doc(db, "system_counters", "technical_reports");
  const reportsCollectionRef = collection(db, "technical_reports");

  return runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);

    let nextSequence = 1;

    if (counterSnap.exists()) {
      const counterData = counterSnap.data();
      const storedYear = Number(counterData?.year ?? currentYear);
      const storedCurrent = Number(counterData?.current ?? 0);

      nextSequence = storedYear === currentYear ? storedCurrent + 1 : 1;
    }

    const reportNumber = `FT-${currentYear}-${String(nextSequence).padStart(4, "0")}`;
    const reportRef = doc(reportsCollectionRef);

    const reportData = {
      reportNumber,
      clientId: normalizeText(payload.clientId),
      quoteId: normalizeText(payload.quoteId),
      deviceType: normalizeText(payload.deviceType),
      brand: normalizeText(payload.brand),
      model: normalizeText(payload.model),
      serialNumber: normalizeText(payload.serialNumber),
      receivedCondition: normalizeText(payload.receivedCondition),
      diagnosticsSummary: normalizeText(payload.diagnosticsSummary),
      workPerformedSummary: normalizeText(payload.workPerformedSummary),
      recommendationsSummary: normalizeText(payload.recommendationsSummary),
      symptoms: normalizeStringArray(payload.symptoms),
      diagnostics: normalizeStringArray(payload.diagnostics),
      procedures: normalizeStringArray(payload.procedures),
      materialsUsed: normalizeStringArray(payload.materialsUsed),
      recommendations: normalizeStringArray(payload.recommendations),
      sourceTicketId: normalizeText(payload.sourceTicketId),
      sourceTicketNumber: normalizeText(payload.sourceTicketNumber),
      sourceTicketSubject: normalizeText(payload.sourceTicketSubject),
      sourceSystemId: normalizeText(payload.sourceSystemId),
      attachments: [],
      status: normalizeText(payload.status || "draft") || "draft",
      createdByUid: currentUser.uid,
      createdByName: currentUser.name || currentUser.email || (currentUser.role === "agent" ? "Agente" : "Administrador"),
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

    transaction.set(reportRef, reportData);

    return {
      id: reportRef.id,
      ...reportData,
    };
  });
}

export async function updateTechnicalReport(reportId, payload) {
  const reportRef = doc(db, "technical_reports", reportId);

  await updateDoc(reportRef, {
    clientId: normalizeText(payload.clientId),
    quoteId: normalizeText(payload.quoteId),
    deviceType: normalizeText(payload.deviceType),
    brand: normalizeText(payload.brand),
    model: normalizeText(payload.model),
    serialNumber: normalizeText(payload.serialNumber),
    receivedCondition: normalizeText(payload.receivedCondition),
    diagnosticsSummary: normalizeText(payload.diagnosticsSummary),
    workPerformedSummary: normalizeText(payload.workPerformedSummary),
    recommendationsSummary: normalizeText(payload.recommendationsSummary),
    symptoms: normalizeStringArray(payload.symptoms),
    diagnostics: normalizeStringArray(payload.diagnostics),
    procedures: normalizeStringArray(payload.procedures),
    materialsUsed: normalizeStringArray(payload.materialsUsed),
    recommendations: normalizeStringArray(payload.recommendations),
    sourceTicketId: normalizeText(payload.sourceTicketId),
    sourceTicketNumber: normalizeText(payload.sourceTicketNumber),
    sourceTicketSubject: normalizeText(payload.sourceTicketSubject),
    sourceSystemId: normalizeText(payload.sourceSystemId),
    status: normalizeText(payload.status || "draft") || "draft",
    updatedAt: Timestamp.now(),
  });
}

export async function addTechnicalReportAttachments(reportId, files) {
  const attachments = await uploadTechnicalReportAttachments(reportId, files);

  if (!attachments.length) {
    return [];
  }

  const reportRef = doc(db, "technical_reports", reportId);
  const now = Timestamp.now();

  return runTransaction(db, async (transaction) => {
    const reportSnap = await transaction.get(reportRef);

    if (!reportSnap.exists()) {
      throw new Error("Technical report not found.");
    }

    const currentData = reportSnap.data();
    const currentAttachments = Array.isArray(currentData.attachments)
      ? currentData.attachments
      : [];

    transaction.update(reportRef, {
      attachments: [...currentAttachments, ...attachments],
      updatedAt: now,
    });

    return attachments;
  });
}


export async function linkQuoteToTechnicalReport(reportId, quoteId) {
  const reportRef = doc(db, "technical_reports", reportId);

  await updateDoc(reportRef, {
    quoteId: normalizeText(quoteId),
    updatedAt: Timestamp.now(),
  });
}

export async function linkTechnicalReportToQuote(reportId, quoteId) {
  return linkQuoteToTechnicalReport(reportId, quoteId);
}
