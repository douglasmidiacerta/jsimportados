import { exigirGestao } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioCategoria } from "@/components/cadastros/FormularioCategoria";
import { criarCategoria } from "../actions";

export default async function NovaCategoriaPage() {
  const perfil = await exigirGestao();
  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Nova categoria"
          voltarHref="/gestao/categorias"
        />
        <FormularioCategoria
          action={criarCategoria}
          voltarHref="/gestao/categorias"
        />
      </main>
    </>
  );
}
