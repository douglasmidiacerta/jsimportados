import Link from "next/link";
import { exigirPerfil } from "@/lib/perfil";
import { listarProdutosBalcao } from "@/lib/dados/produtos";
import { BarraTopo } from "@/components/BarraTopo";
import { GradeProdutos } from "@/components/cadastros/GradeProdutos";

export default async function EstoqueBalcaoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const perfil = await exigirPerfil();
  const { ok } = await searchParams;
  const produtos = await listarProdutosBalcao();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      {ok === "entrada" && (
        <div className="mx-auto max-w-5xl w-full px-4 pt-4">
          <p className="text-sm font-semibold text-good bg-[var(--good)]/10 border border-[var(--good)]/30 rounded-xl px-4 py-3">
            ✅ Entrada registrada! O estoque foi atualizado.
          </p>
        </div>
      )}
      <main className="mx-auto max-w-5xl w-full px-4 py-6 sm:py-10 flex-1">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
          <div>
            <Link
              href="/balcao"
              className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors mb-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              Voltar
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              O que temos na loja
            </h1>
          </div>
          <Link
            href="/balcao/estoque/novo"
            className="h-12 inline-flex items-center gap-2 rounded-xl bg-accent px-4 text-white font-bold shadow-[var(--shadow)] active:scale-[0.99] transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Cadastrar produto
          </Link>
        </div>

        <GradeProdutos produtos={produtos} />
      </main>
    </>
  );
}
