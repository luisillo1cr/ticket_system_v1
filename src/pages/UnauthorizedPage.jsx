/**
 * Unauthorized or incomplete profile page.
 */

function UnauthorizedPage() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="card-base max-w-3xl p-6 sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          Acceso restringido
        </p>
        <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          No fue posible abrir el panel solicitado
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 transition-colors duration-300 dark:text-[#B0B0B0]">
          El usuario autenticado no tiene un perfil válido en Firestore o no cuenta con el rol
          necesario para ingresar a esta sección.
        </p>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 transition-colors duration-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Verifique que exista un documento en <strong>users/{"{uid}"}</strong> con un campo
          <strong> role</strong> válido: <strong>admin</strong> o <strong>client</strong>.
        </div>
      </section>
    </main>
  );
}

export default UnauthorizedPage;