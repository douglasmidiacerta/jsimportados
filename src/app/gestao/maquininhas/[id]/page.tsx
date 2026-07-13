import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterMaquininha, listarTaxasMaquininha } from "@/lib/dados/maquininhas";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioMaquininha } from "@/components/financeiro/FormularioMaquininha";
import { atualizarMaquininha } from "../actions";

export default async function EditarMaquininhaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await exigirGestao();

  const maquininha = await obterMaquininha(id);
  if (!maquininha) notFound();
  const taxas = await listarTaxasMaquininha(id);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo={maquininha.nome}
          descricao="Ajuste as taxas ou desative a maquininha."
          voltarHref="/gestao/maquininhas"
        />
        <FormularioMaquininha
          action={atualizarMaquininha}
          maquininha={maquininha}
          taxas={taxas}
        />
      </main>
    </>
  );
}
