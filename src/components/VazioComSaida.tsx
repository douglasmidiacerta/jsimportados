import Link from "next/link";

/**
 * Estado vazio que NÃO abandona o usuário.
 *
 * As telas de "nova compra" / "novo orçamento" avisavam "cadastre produtos
 * antes" num texto cinza solto, sem botão nenhum — parecia uma tela quebrada.
 * Aqui o aviso vem com a saída junto.
 */
export function VazioComSaida({
  icone,
  titulo,
  descricao,
  acaoHref,
  acaoTexto,
}: {
  icone?: React.ReactNode;
  titulo: string;
  descricao: string;
  acaoHref: string;
  acaoTexto: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center flex flex-col items-center gap-3">
      {icone && (
        <span className="w-14 h-14 rounded-2xl bg-accent-soft text-accent-ink grid place-items-center">
          {icone}
        </span>
      )}
      <h2 className="text-lg font-bold text-ink tracking-tight">{titulo}</h2>
      <p className="text-muted text-sm max-w-sm">{descricao}</p>
      <Link
        href={acaoHref}
        className="mt-2 h-12 inline-flex items-center gap-2 rounded-xl bg-accent text-white px-5 font-bold shadow-[var(--shadow)] active:scale-[0.99]"
      >
        {acaoTexto}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </Link>
    </div>
  );
}
