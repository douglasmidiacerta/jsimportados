import Link from "next/link";

/** Cabeçalho padrão das telas de cadastro: voltar + título + ação opcional. */
export function CabecalhoCadastro({
  titulo,
  descricao,
  voltarHref,
  novoHref,
  novoTexto,
}: {
  titulo: string;
  descricao?: string;
  voltarHref: string;
  novoHref?: string;
  novoTexto?: string;
}) {
  return (
    <div className="mb-6">
      <Link
        href={voltarHref}
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors mb-3"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Voltar
      </Link>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            {titulo}
          </h1>
          {descricao && <p className="text-muted mt-1">{descricao}</p>}
        </div>

        {novoHref && (
          <Link
            href={novoHref}
            className="h-12 inline-flex items-center gap-2 rounded-xl bg-accent px-4 text-white font-bold shadow-[var(--shadow)] active:scale-[0.99] transition-transform"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {novoTexto ?? "Novo"}
          </Link>
        )}
      </div>
    </div>
  );
}
