/**
 * Attachment helpers for ticket messages and initial ticket creation.
 */

export const MAX_ATTACHMENT_FILES = 5;
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const ACCEPTED_ATTACHMENT_INPUT = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".svg",
  ".pdf",
  ".txt",
  ".csv",
  ".json",
  ".zip",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
].join(",");

const TEXT_LIKE_TYPES = ["text/plain", "text/csv", "application/json"];

export function isImageAttachment(input) {
  return String(input?.contentType || input || "").startsWith("image/");
}

export function isPdfAttachment(input) {
  return String(input?.contentType || input || "") === "application/pdf";
}

export function isTextAttachment(input) {
  return TEXT_LIKE_TYPES.includes(String(input?.contentType || input || ""));
}

export function getAttachmentKind(attachment) {
  if (isImageAttachment(attachment)) return "image";
  if (isPdfAttachment(attachment)) return "pdf";
  if (isTextAttachment(attachment)) return "text";
  return "file";
}

export function getAttachmentExtension(fileName = "") {
  const normalizedName = String(fileName || "").trim();
  const lastDot = normalizedName.lastIndexOf(".");
  if (lastDot === -1) return "FILE";
  return normalizedName.slice(lastDot + 1).toUpperCase();
}

export function getAttachmentKindLabel(contentType = "") {
  const normalizedType = String(contentType || "");
  if (normalizedType.startsWith("image/")) return "Imagen";
  if (normalizedType === "application/pdf") return "PDF";
  if (normalizedType === "text/plain") return "TXT";
  if (normalizedType === "text/csv") return "CSV";
  if (normalizedType === "application/json") return "JSON";
  if (
    normalizedType === "application/zip" ||
    normalizedType === "application/x-zip-compressed"
  ) return "ZIP";
  if (
    normalizedType === "application/msword" ||
    normalizedType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) return "DOC";
  if (
    normalizedType === "application/vnd.ms-excel" ||
    normalizedType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) return "XLS";
  return "Archivo";
}

export function validateAttachmentFiles(fileList) {
  const files = Array.from(fileList || []);

  if (files.length > MAX_ATTACHMENT_FILES) {
    return {
      ok: false,
      message: `Solo se permiten hasta ${MAX_ATTACHMENT_FILES} archivos por mensaje o ticket.`,
    };
  }

  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return {
        ok: false,
        message:
          "Solo se permiten imágenes, PDF, TXT, CSV, JSON, ZIP, DOC/DOCX y XLS/XLSX.",
      };
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return {
        ok: false,
        message: `Cada archivo debe pesar como máximo ${formatFileSize(MAX_ATTACHMENT_SIZE)}.`,
      };
    }
  }

  return { ok: true, files, message: "" };
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
