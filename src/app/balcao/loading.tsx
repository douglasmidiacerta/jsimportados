/** Esqueleto instantâneo do Modo Operação (balcão) ao navegar. */
export default function Loading() {
  return (
    <>
      <div className="sticky top-0 h-16 border-b border-line bg-surface flex items-center px-4">
        <div className="h-9 w-28 rounded-lg bg-surface-2 animate-pulse" />
      </div>
      <main className="flex-1 grid place-items-center p-8">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-2" />
          <div className="h-4 w-40 rounded bg-surface-2" />
          <div className="h-3 w-28 rounded bg-surface-2" />
        </div>
      </main>
    </>
  );
}
