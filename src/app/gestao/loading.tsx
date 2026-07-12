/**
 * Esqueleto instantâneo do Modo Gestão: aparece na hora ao navegar, enquanto o
 * servidor monta a página. No desktop o menu lateral (layout) permanece; no
 * mobile mostramos um esqueleto da barra de topo (que é onde a navegação vive).
 */
export default function Loading() {
  return (
    <>
      <div className="lg:hidden sticky top-0 h-16 border-b border-line bg-surface flex items-center px-4">
        <div className="h-9 w-28 rounded-lg bg-surface-2 animate-pulse" />
      </div>
      <main className="mx-auto max-w-5xl w-full px-4 py-6 sm:py-10 flex-1">
        <div className="animate-pulse flex flex-col gap-3">
          <div className="h-4 w-40 rounded bg-surface-2" />
          <div className="h-8 w-64 rounded-lg bg-surface-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl border border-line bg-surface-2" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
