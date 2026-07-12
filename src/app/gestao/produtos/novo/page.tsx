import { exigirGestao } from "@/lib/perfil";
import { listarCategorias } from "@/lib/dados/categorias";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioProduto } from "@/components/cadastros/FormularioProduto";
import { criarProduto } from "../actions";

export default async function NovoProdutoPage() {
  const perfil = await exigirGestao();
  const categorias = await listarCategorias();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro titulo="Novo produto" voltarHref="/gestao/produtos" />
        <FormularioProduto
          action={criarProduto}
          categorias={categorias}
          voltarHref="/gestao/produtos"
        />
      </main>
    </>
  );
}
