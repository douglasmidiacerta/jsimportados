import Link from "next/link";
import { exigirPerfil } from "@/lib/perfil";
import { listarEstoqueBalcao } from "@/lib/dados/estoque";
import { BarraTopo } from "@/components/BarraTopo";
import { EntradaBalcao } from "@/components/estoque/EntradaBalcao";
import { entradaBalcaoAction } from "./actions";

export default async function EntradaPage() {
  const perfil = await exigirPerfil();
  const produtos = await listarEstoqueBalcao();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <Link
          href="/balcao"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          Voltar
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mb-1">
          Chegou mercadoria
        </h1>
        <p className="text-muted mb-6">
          Escolha o produto e diga quantas unidades chegaram.
        </p>

        <EntradaBalcao produtos={produtos} action={entradaBalcaoAction} />
      </main>
    </>
  );
}
