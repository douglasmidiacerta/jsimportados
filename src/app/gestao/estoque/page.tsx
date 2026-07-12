import { exigirGestao } from "@/lib/perfil";
import { listarEstoqueGestao } from "@/lib/dados/estoque";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { TabelaEstoqueGestao } from "@/components/estoque/TabelaEstoqueGestao";

export default async function EstoqueGestaoPage() {
  const perfil = await exigirGestao();
  const itens = await listarEstoqueGestao();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Estoque"
          descricao="Saldo, custo médio e valor parado em cada produto."
          voltarHref="/gestao"
        />
        <TabelaEstoqueGestao itens={itens} />
      </main>
    </>
  );
}
