import { exigirGestao } from "@/lib/perfil";
import { listarProdutos } from "@/lib/dados/produtos";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";
import { TabelaProdutos } from "@/components/cadastros/TabelaProdutos";

export default async function ProdutosPage() {
  const perfil = await exigirGestao();
  const produtos = await listarProdutos(undefined, true);

  const itens: ItemLista[] = produtos.map((p) => ({
    id: p.id,
    titulo: p.nome,
    subtitulo: p.categoria_nome ?? "Sem categoria",
    extra: p.preco_venda > 0 ? formatarBRL(p.preco_venda) : "—",
    arquivado: !p.ativo,
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-none w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Produtos"
          descricao={`${produtos.filter((p) => p.ativo).length} produto(s) ativo(s)`}
          voltarHref="/gestao/cadastros"
          novoHref="/gestao/produtos/novo"
          novoTexto="Novo produto"
        />

        {/* Celular: cards simples (como sempre) */}
        <div className="lg:hidden">
          <ListaCadastro
            itens={itens}
            hrefBase="/gestao/produtos"
            placeholder="Buscar produto…"
            vazioTexto="Nenhum produto cadastrado ainda. Toque em “Novo produto”."
          />
        </div>

        {/* Computador: grade densa padrão FPQ */}
        <div className="hidden lg:block">
          {produtos.length === 0 ? (
            <p className="text-muted text-center py-10">
              Nenhum produto cadastrado ainda. Clique em “Novo produto”.
            </p>
          ) : (
            <TabelaProdutos produtos={produtos} />
          )}
        </div>
      </main>
    </>
  );
}
