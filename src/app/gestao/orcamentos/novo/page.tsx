import { exigirGestao } from "@/lib/perfil";
import { listarProdutosPDV } from "@/lib/dados/vendas";
import { listarClientes } from "@/lib/dados/clientes";
import { listarListasPreco, obterListaDefault } from "@/lib/dados/listasPreco";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { OrcamentoBuilder } from "@/components/vendas/OrcamentoBuilder";
import { criarOrcamentoAction } from "../actions";

export default async function NovoOrcamentoPage() {
  const perfil = await exigirGestao();
  const [produtos, clientes, listas, listaDefault] = await Promise.all([
    listarProdutosPDV(),
    listarClientes(),
    listarListasPreco(),
    obterListaDefault(),
  ]);
  const listaDefaultId = listaDefault?.id ?? listas.find((l) => l.is_default)?.id ?? "";

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Novo orçamento"
          descricao="Monte a proposta. Não mexe no estoque nem no caixa — só quando virar venda."
          voltarHref="/gestao/orcamentos"
        />
        {produtos.length === 0 ? (
          <p className="text-muted">Cadastre produtos antes de fazer um orçamento.</p>
        ) : (
          <OrcamentoBuilder
            produtos={produtos}
            clientes={clientes}
            listas={listas}
            listaDefaultId={listaDefaultId}
            action={criarOrcamentoAction}
          />
        )}
      </main>
    </>
  );
}
