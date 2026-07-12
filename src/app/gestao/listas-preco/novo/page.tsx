import { exigirGestao } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioLista } from "@/components/precos/FormularioLista";
import { criarListaAction } from "../actions";

export default async function NovaListaPage() {
  const perfil = await exigirGestao();
  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-lg w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Nova lista de preço"
          descricao="Ex.: Atacado, Promoção…"
          voltarHref="/gestao/listas-preco"
        />
        <FormularioLista action={criarListaAction} voltarHref="/gestao/listas-preco" />
      </main>
    </>
  );
}
