import { exigirGestao } from "@/lib/perfil";
import { listarProdutosPDV } from "@/lib/dados/vendas";
import { listarClientes } from "@/lib/dados/clientes";
import { listarListasPreco, obterListaDefault } from "@/lib/dados/listasPreco";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { VazioComSaida } from "@/components/VazioComSaida";
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
          <VazioComSaida
            icone={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7 12 3 4 7v10l8 4 8-4Z" /><path d="M4 7l8 4 8-4" /><path d="M12 21V11" /></svg>
            }
            titulo="Cadastre um produto primeiro"
            descricao="Um orçamento é uma lista de produtos com preço — então precisa existir pelo menos um produto para montar a proposta."
            acaoHref="/gestao/produtos/novo"
            acaoTexto="Cadastrar produto"
          />
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
