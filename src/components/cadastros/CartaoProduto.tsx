import Link from "next/link";
import { formatarBRL, formatarQtd, urlFoto } from "@/lib/formato";
import type { ProdutoLista } from "@/lib/dados/tipos";

/** Card de produto para grades (balcão e listas visuais). */
export function CartaoProduto({
  produto,
  href,
}: {
  produto: ProdutoLista;
  href?: string;
}) {
  const foto = urlFoto(produto.foto_path);
  const inicial = produto.nome.trim().charAt(0).toUpperCase() || "?";

  const conteudo = (
    <>
      <div className="aspect-square w-full bg-surface-2 overflow-hidden grid place-items-center">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt={produto.nome}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl font-extrabold text-accent/40 select-none">
            {inicial}
          </span>
        )}
      </div>
      <div className="p-3">
        {produto.categoria_nome && (
          <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-soft text-accent-ink mb-1">
            {produto.categoria_nome}
          </span>
        )}
        <p className="font-semibold text-ink leading-tight line-clamp-2">
          {produto.nome}
        </p>
        <p className="mt-1 text-lg font-extrabold text-ink tabular-nums">
          {produto.preco_venda > 0 ? formatarBRL(produto.preco_venda) : "—"}
        </p>
        <p className="mt-0.5 text-xs font-medium">
          {produto.estoque_atual > 0 ? (
            <span className="text-good">
              {formatarQtd(produto.estoque_atual)} em estoque
            </span>
          ) : (
            <span className="text-muted">Sem estoque</span>
          )}
        </p>
      </div>
    </>
  );

  const classe =
    "block rounded-2xl border border-line bg-surface overflow-hidden shadow-[var(--shadow)]";

  if (href) {
    return (
      <Link
        href={href}
        className={`${classe} transition-transform active:scale-[0.99] hover:border-accent/40`}
      >
        {conteudo}
      </Link>
    );
  }
  return <div className={classe}>{conteudo}</div>;
}
