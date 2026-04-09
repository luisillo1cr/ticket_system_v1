import { useEffect, useState } from "react";
import {
  formatFileSize,
  getAttachmentKind,
  isTextAttachment,
} from "../../utils/attachments";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5H19.5V10.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 13.5 19.5 4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5V18A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5H10.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v10.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 18.75h15" />
    </svg>
  );
}

function AttachmentViewerModal({ attachment, onClose }) {
  const [textContent, setTextContent] = useState("");
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState("");

  useEffect(() => {
    if (!attachment || !isTextAttachment(attachment)) {
      setTextContent("");
      setLoadingText(false);
      setTextError("");
      return;
    }

    let cancelled = false;

    const loadText = async () => {
      setLoadingText(true);
      setTextError("");

      try {
        const response = await fetch(attachment.url);
        const text = await response.text();

        if (!cancelled) {
          setTextContent(text);
        }
      } catch (error) {
        console.error("Error loading attachment text:", error);
        if (!cancelled) {
          setTextError("No fue posible cargar el contenido del archivo.");
        }
      } finally {
        if (!cancelled) {
          setLoadingText(false);
        }
      }
    };

    loadText();

    return () => {
      cancelled = true;
    };
  }, [attachment]);

  if (!attachment) {
    return null;
  }

  const kind = getAttachmentKind(attachment);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex h-[min(90vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-colors duration-300 dark:border-[#444444] dark:bg-[#121212]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 transition-colors duration-300 dark:border-[#444444]">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              {attachment.name || "Adjunto"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
              {attachment.contentType || "Archivo"}
              {attachment.size ? ` · ${formatFileSize(attachment.size)}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="icon-button"
              title="Abrir en otra pestaña"
              aria-label="Abrir en otra pestaña"
            >
              <ExternalIcon />
            </a>

            <a
              href={attachment.url}
              download={attachment.name || "archivo"}
              className="icon-button"
              title="Descargar archivo"
              aria-label="Descargar archivo"
            >
              <DownloadIcon />
            </a>

            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              title="Cerrar visor"
              aria-label="Cerrar visor"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-4 transition-colors duration-300 dark:bg-[#181818]">
          {kind === "image" ? (
            <div className="flex min-h-full items-center justify-center">
              <img
                src={attachment.url}
                alt={attachment.name || "Adjunto"}
                className="max-h-full max-w-full rounded-2xl border border-slate-200 bg-white object-contain shadow-sm dark:border-[#444444] dark:bg-[#121212]"
              />
            </div>
          ) : null}

          {kind === "pdf" ? (
            <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#444444] dark:bg-[#121212]">
              <iframe
                src={attachment.url}
                title={attachment.name || "Documento PDF"}
                className="h-full min-h-[640px] w-full"
              />
            </div>
          ) : null}

          {kind === "text" ? (
            <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#444444] dark:bg-[#121212]">
              {loadingText ? (
                <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-slate-500 dark:text-[#B0B0B0]">
                  Cargando contenido...
                </div>
              ) : textError ? (
                <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-sm text-rose-600 dark:text-rose-300">
                  {textError}
                </div>
              ) : (
                <pre className="h-full min-h-[320px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-sm text-slate-800 dark:text-[#E0E0E0]">
                  {textContent}
                </pre>
              )}
            </div>
          ) : null}

          {kind === "file" ? (
            <div className="flex min-h-full items-center justify-center">
              <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-colors duration-300 dark:border-[#444444] dark:bg-[#121212]">
                <p className="text-base font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
                  Vista previa no disponible para este tipo de archivo.
                </p>
                <p className="mt-3 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
                  Puede abrirlo en otra pestaña o descargarlo desde los botones superiores.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AttachmentViewerModal;
