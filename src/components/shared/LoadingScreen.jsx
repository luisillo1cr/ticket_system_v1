/**
 * Full-page loading state.
 */

function LoadingScreen({
  title = "Cargando aplicación",
  message = "Espere un momento...",
}) {
  return (
    <main className="page-shell flex items-center justify-center px-4">
      <section className="card-base w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-slate-200 transition-colors duration-300 dark:bg-[#444444]" />
        <h1 className="text-lg font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
          {message}
        </p>
      </section>
    </main>
  );
}

export default LoadingScreen;