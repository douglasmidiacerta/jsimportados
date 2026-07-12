import { exigirGestao } from "@/lib/perfil";
import { listarCompras } from "@/lib/dados/compras";
import { formatarBRL, formatarData } from "@/lib/formato";
import { simboloMoeda } from "@/lib/dados/tipos";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";

export default async function ComprasPage() {
  const perfil = await exigirGestao();
  const compras = await listarCompras();

  const itens: ItemLista[] = compras.map((c) => ({
    id: c.id,
    titulo: c.fornecedor_nome ?? "Compra sem fornecedor",
    subtitulo: `${formatarData(c.data_compra)} · ${simboloMoeda(c.moeda)}`,
    extra: formatarBRL(c.total_geral_brl),
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Compras / Importação"
          descricao="Suas compras no Paraguai, com custo real calculado."
          voltarHref="/gestao"
          novoHref="/gestao/compras/nova"
          novoTexto="Nova compra"
        />
        <ListaCadastro
          itens={itens}
          hrefBase="/gestao/compras"
          placeholder="Buscar por fornecedor…"
          vazioTexto="Nenhuma compra registrada ainda. Toque em “Nova compra”."
        />
      </main>
    </>
  );
}
