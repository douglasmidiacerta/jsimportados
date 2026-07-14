import { exigirGestao } from "@/lib/perfil";
import { listarVendasGestao } from "@/lib/dados/vendas";
import { formatarBRL, formatarData, numVenda } from "@/lib/formato";
import { FORMAS_PAGAMENTO } from "@/lib/dados/tipos";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";
import { TabelaBusca, type LinhaBusca } from "@/components/TabelaBusca";
import { AbasVendas } from "@/components/vendas/AbasVendas";

function rotuloForma(v: string) {
  return FORMAS_PAGAMENTO.find((f) => f.valor === v)?.rotulo ?? v;
}

export default async function VendasGestaoPage() {
  const perfil = await exigirGestao();
  const vendas = await listarVendasGestao();

  const totalVendido = vendas.reduce((s, v) => s + v.total, 0);
  const custoTotal = vendas.reduce((s, v) => s + v.custo_total, 0);
  const lucroTotal = vendas.reduce((s, v) => s + v.lucro_bruto, 0);
  const margemMedia = totalVendido > 0 ? (lucroTotal / totalVendido) * 100 : 0;

  const itens: ItemLista[] = vendas.map((v) => ({
    id: v.id,
    titulo: `${numVenda(v.numero)} · ${v.cliente_nome ?? "Venda no balcão"}`,
    subtitulo: `${formatarData(v.data_venda)} · ${rotuloForma(v.forma_pagamento)} · lucro ${v.custo_completo ? "" : "~"}${formatarBRL(v.lucro_bruto)}`,
    extra: formatarBRL(v.total),
  }));

  const linhas: LinhaBusca[] = vendas.map((v) => ({
    id: v.id,
    href: `/gestao/vendas/${v.id}`,
    cor:
      v.status === "cancelada"
        ? ("vermelha" as const)
        : v.lucro_bruto < 0
          ? ("vermelha" as const)
          : v.status === "a_receber"
            ? ("amarela" as const)
            : v.status === "devolvida_parcial"
              ? ("amarela" as const)
              : ("verde" as const),
    celulas: [
      numVenda(v.numero),
      v.cliente_nome ?? "Venda no balcão",
      formatarData(v.data_venda),
      v.forma_pagamento === "cartao" && v.cartao_parcelas
        ? `cartão ${v.cartao_parcelas}x`
        : rotuloForma(v.forma_pagamento),
      formatarBRL(v.total),
      `${v.custo_completo ? "" : "~"}${formatarBRL(v.custo_total)}`,
      `${v.custo_completo ? "" : "~"}${formatarBRL(v.lucro_bruto)}`,
      v.total > 0 ? `${((v.lucro_bruto / v.total) * 100).toFixed(1)}%` : "—",
      v.status === "liquidado"
        ? "✓ liquidada"
        : v.status === "cancelada"
          ? "⛔ cancelada"
          : v.status === "devolvida_parcial"
            ? "↩ devolvida em parte"
            : "a receber",
    ],
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-none w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Vendas realizadas"
          descricao={`${vendas.length} venda(s) · Total ${formatarBRL(totalVendido)} · Lucro ${formatarBRL(lucroTotal)}`}
          voltarHref="/gestao"
        />
        <AbasVendas atual="vendas" />
        <div className="lg:hidden">
          <ListaCadastro
            itens={itens}
            hrefBase="/gestao/vendas"
            placeholder="Buscar por cliente…"
            vazioTexto="Nenhuma venda registrada ainda."
          />
        </div>
        <div className="hidden lg:block">
          <TabelaBusca
            colunas={[
              { titulo: "Nº" },
              { titulo: "Cliente" },
              { titulo: "Data" },
              { titulo: "Forma" },
              { titulo: "Total", alinhar: "dir" },
              { titulo: "Custo", alinhar: "dir" },
              { titulo: "Lucro", alinhar: "dir" },
              { titulo: "Margem", alinhar: "dir" },
              { titulo: "Situação" },
            ]}
            linhas={linhas}
            rodape={[
              `${vendas.length} venda(s)`,
              null,
              null,
              null,
              formatarBRL(totalVendido),
              formatarBRL(custoTotal),
              formatarBRL(lucroTotal),
              `${margemMedia.toFixed(1)}%`,
              null,
            ]}
            legenda={[
              { cor: "verde", rotulo: "Liquidada" },
              { cor: "amarela", rotulo: "A receber (cartão/fiado)" },
              { cor: "vermelha", rotulo: "Prejuízo" },
            ]}
            placeholder="Pesquisar por cliente…"
            vazio="Nenhuma venda registrada ainda."
          />
        </div>
      </main>
    </>
  );
}
