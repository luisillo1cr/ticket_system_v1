/**
 * Technical report attachment helpers.
 */

export const MAX_REPORT_ATTACHMENT_FILES = 6;
export const MAX_REPORT_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export const ALLOWED_REPORT_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function validateReportAttachmentFiles(fileList) {
  const files = Array.from(fileList || []);

  if (files.length > MAX_REPORT_ATTACHMENT_FILES) {
    return {
      ok: false,
      message: `Solo se permiten hasta ${MAX_REPORT_ATTACHMENT_FILES} archivos por carga.`,
    };
  }

  for (const file of files) {
    if (!ALLOWED_REPORT_ATTACHMENT_TYPES.includes(file.type)) {
      return {
        ok: false,
        message: "Solo se permiten imágenes JPG, PNG, WEBP o archivos PDF.",
      };
    }

    if (file.size > MAX_REPORT_ATTACHMENT_SIZE) {
      return {
        ok: false,
        message: "Cada archivo debe pesar como máximo 5 MB.",
      };
    }
  }

  return {
    ok: true,
    files,
    message: "",
  };
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}