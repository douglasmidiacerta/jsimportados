import { exigirGestao } from "@/lib/perfil";
import { listarVendasGestao } from "@/lib/dados/vendas";
import { formatarBRL, formatarData } from "@/lib/formato";
import { FORMAS_PAGAMENTO } from "@/lib/dados/tipos";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";

function rotuloForma(v: string) {
  return FORMAS_PAGAMENTO.find((f) => f.valor === v)?.rotulo ?? v;
}

export default async function VendasGestaoPage() {
  const perfil = await exigirGestao();
  const vendas = await listarVendasGestao();

  const totalVendido = vendas.reduce((s, v) => s + v.total, 0);
  const lucroTotal = vendas.reduce((s, v) => s + v.lucro_bruto, 0);

  const itens: ItemLista[] = vendas.map((v) => ({
    id: v.id,
    titulo: v.cliente_nome ?? "Venda no balcão",
    subtitulo: `${formatarData(v.data_venda)} · ${rotuloForma(v.forma_pagamento)} · lucro ${v.custo_completo ? "" : "~"}${formatarBRL(v.lucro_bruto)}`,
    extra: formatarBRL(v.total),
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Vendas realizadas"
          descricao={`${vendas.length} venda(s) · Total ${formatarBRL(totalVendido)} · Lucro ${formatarBRL(lucroTotal)}`}
          voltarHref="/gestao"
        />
        <ListaCadastro
          itens={itens}
          hrefBase="/gestao/vendas"
          placeholder="Buscar por cliente…"
          vazioTexto="Nenhuma venda registrada ainda."
        />
      </main>
    </>
  );
}
