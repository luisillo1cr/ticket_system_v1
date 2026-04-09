/**
 * Generic 404 page.
 */

import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes";

function NotFoundPage() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4">
      <section className="card-base w-full max-w-xl p-8 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          Error 404
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          Página no encontrada
        </h1>
        <p className="mt-3 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
          La ruta solicitada no existe dentro del portal de soporte.
        </p>

        <div className="mt-6">
          <Link to={ROUTES.APP} className="btn-primary">
            Volver al panel
          </Link>
        </div>
      </section>
    </main>
  );
}

export default NotFoundPage;