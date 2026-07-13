import { exigirGestao } from "@/lib/perfil";
import { listarMaquininhas } from "@/lib/dados/maquininhas";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioConta } from "@/components/financeiro/FormularioConta";
import { criarConta } from "../actions";

export default async function NovaContaPage() {
  const perfil = await exigirGestao();
  const maquininhas = await listarMaquininhas();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Nova conta"
          descricao="Banco (que recebe Pix), maquininha (adquirente) ou outra conta."
          voltarHref="/gestao/contas"
        />
        <FormularioConta action={criarConta} maquininhas={maquininhas} />
      </main>
    </>
  );
}
