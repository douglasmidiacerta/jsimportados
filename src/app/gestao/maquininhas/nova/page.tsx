import { exigirGestao } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioMaquininha } from "@/components/financeiro/FormularioMaquininha";
import { criarMaquininha } from "../actions";

export default async function NovaMaquininhaPage() {
  const perfil = await exigirGestao();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Nova maquininha"
          descricao="Depois de salvar, a venda no cartão vai pedir para escolher a maquininha."
          voltarHref="/gestao/maquininhas"
        />
        <FormularioMaquininha action={criarMaquininha} />
      </main>
    </>
  );
}
