/**
 * Public authentication layout.
 */

import ThemeToggleButton from "../../components/shared/ThemeToggleButton";

function AuthLayout({ children }) {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
              MOONFORGE DIGITAL
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
              Portal de Soporte
            </h1>
            <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
              Acceso seguro para clientes y administración.
            </p>
          </div>

          <ThemeToggleButton />
        </div>

        <div className="card-base p-6 sm:p-8">{children}</div>
      </section>
    </main>
  );
}

export default AuthLayout;