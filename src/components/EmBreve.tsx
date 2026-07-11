import Link from "next/link";

export function EmBreve({
  titulo,
  descricao,
  voltarHref = "/",
}: {
  titulo: string;
  descricao: string;
  voltarHref?: string;
}) {
  return (
    <main className="mx-auto max-w-5xl w-full px-4 py-16 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent-ink grid place-items-center mb-5">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 8v4l3 2" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{titulo}</h1>
      <p className="text-muted mt-2 max-w-md">{descricao}</p>
      <Link
        href={voltarHref}
        className="mt-7 h-12 inline-flex items-center rounded-xl bg-accent px-5 text-white font-bold shadow-[var(--shadow)] active:scale-[0.99] transition-transform"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
