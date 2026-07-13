import { exigirGestao } from "@/lib/perfil";
import { listarCompras } from "@/lib/dados/compras";
import { formatarBRL, formatarData, numCompra } from "@/lib/formato";
import { simboloMoeda } from "@/lib/dados/tipos";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";
import { TabelaBusca, type LinhaBusca } from "@/components/TabelaBusca";

export default async function ComprasPage() {
  const perfil = await exigirGestao();
  const compras = await listarCompras();

  const totalItens = compras.reduce((s, c) => s + c.total_itens_brl, 0);
  const totalDespesas = compras.reduce((s, c) => s + c.total_despesas_brl, 0);
  const totalGeral = compras.reduce((s, c) => s + c.total_geral_brl, 0);

  const itens: ItemLista[] = compras.map((c) => ({
    id: c.id,
    titulo: `${numCompra(c.numero)} · ${c.fornecedor_nome ?? "Compra sem fornecedor"}`,
    subtitulo: `${formatarData(c.data_compra)} · ${simboloMoeda(c.moeda)}`,
    extra: formatarBRL(c.total_geral_brl),
  }));

  const linhas: LinhaBusca[] = compras.map((c) => ({
    id: c.id,
    href: `/gestao/compras/${c.id}`,
    celulas: [
      numCompra(c.numero),
      c.fornecedor_nome ?? "Sem fornecedor",
      formatarData(c.data_compra),
      c.moeda === "BRL"
        ? "R$"
        : `${simboloMoeda(c.moeda)} · câmbio ${c.cambio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
      formatarBRL(c.total_itens_brl),
      formatarBRL(c.total_despesas_brl),
      formatarBRL(c.total_geral_brl),
    ],
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-none w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Compras / Importação"
          descricao="Suas compras no Paraguai, com custo real calculado."
          voltarHref="/gestao"
          novoHref="/gestao/compras/nova"
          novoTexto="Nova compra"
        />
        <div className="lg:hidden">
          <ListaCadastro
            itens={itens}
            hrefBase="/gestao/compras"
            placeholder="Buscar por fornecedor…"
            vazioTexto="Nenhuma compra registrada ainda. Toque em “Nova compra”."
          />
        </div>
        <div className="hidden lg:block">
          <TabelaBusca
            colunas={[
              { titulo: "Nº" },
              { titulo: "Fornecedor" },
              { titulo: "Data" },
              { titulo: "Moeda / Câmbio" },
              { titulo: "Itens (R$)", alinhar: "dir" },
              { titulo: "Despesas (R$)", alinhar: "dir" },
              { titulo: "Total (R$)", alinhar: "dir" },
            ]}
            linhas={linhas}
            rodape={[
              `${compras.length} compra(s)`,
              null,
              null,
              null,
              formatarBRL(totalItens),
              formatarBRL(totalDespesas),
              formatarBRL(totalGeral),
            ]}
            placeholder="Pesquisar por fornecedor…"
            vazio="Nenhuma compra registrada ainda."
          />
        </div>
      </main>
    </>
  );
}
