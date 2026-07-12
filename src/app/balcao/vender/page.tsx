import Link from "next/link";
import { exigirPerfil } from "@/lib/perfil";
import { listarProdutosPDV } from "@/lib/dados/vendas";
import { listarClientes } from "@/lib/dados/clientes";
import { listarListasPreco, obterListaDefault } from "@/lib/dados/listasPreco";
import { BarraTopo } from "@/components/BarraTopo";
import { PDV } from "@/components/vendas/PDV";
import { registrarVendaAction } from "./actions";

export default async function VenderPage() {
  const perfil = await exigirPerfil();
  const [produtos, clientes, listas, listaDefault] = await Promise.all([
    listarProdutosPDV(),
    listarClientes(),
    listarListasPreco(),
    obterListaDefault(),
  ]);
  const listaDefaultId = listaDefault?.id ?? listas.find((l) => l.is_default)?.id ?? "";

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 flex-1">
        <Link
          href="/balcao"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          Voltar
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mb-4">
          Vender
        </h1>

        {produtos.length === 0 ? (
          <p className="text-muted">
            Nenhum produto cadastrado ainda. Cadastre produtos antes de vender.
          </p>
        ) : (
          <PDV
            produtos={produtos}
            clientes={clientes}
            listas={listas}
            listaDefaultId={listaDefaultId}
            podeEditarPreco={perfil.papel === "gestao"}
            action={registrarVendaAction}
          />
        )}
      </main>
    </>
  );
}
