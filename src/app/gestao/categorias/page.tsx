import { exigirGestao } from "@/lib/perfil";
import { listarCategorias } from "@/lib/dados/categorias";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";

export default async function CategoriasPage() {
  const perfil = await exigirGestao();
  const categorias = await listarCategorias(true);

  const itens: ItemLista[] = categorias.map((c) => ({
    id: c.id,
    titulo: c.nome,
    arquivado: !c.ativo,
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Categorias"
          descricao="Agrupam os produtos (ex.: Perfumes, Eletrônicos)."
          voltarHref="/gestao/cadastros"
          novoHref="/gestao/categorias/novo"
          novoTexto="Nova categoria"
        />
        <ListaCadastro
          itens={itens}
          hrefBase="/gestao/categorias"
          placeholder="Buscar categoria…"
          vazioTexto="Nenhuma categoria ainda."
        />
      </main>
    </>
  );
}
