import { exigirGestao } from "@/lib/perfil";
import { lerResultadoGeral } from "@/lib/dados/resultado";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ExportarCSV } from "@/components/ExportarCSV";
import { FiltroPeriodo, AvisoCustoIncompleto, resolverPeriodo } from "../relatorios/_ui";

export default async function ResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const { de, ate } = resolverPeriodo(sp.de, sp.ate);
  const r = await lerResultadoGeral(de, ate);

  const csvLinhas: (string | number)[][] = [
    ["Receita de vendas", r.receita],
    ["(−) Custo dos produtos (CMV)", -r.cmv],
    ["= Lucro bruto", r.lucro_bruto],
    ["(−) Taxas de cartão", -r.taxas_cartao],
    ...r.despesas.map((d) => [`(−) Despesa: ${d.categoria}`, -d.total] as (string | number)[]),
    ["(−) Despesas total", -r.despesas_total],
    ["(+) Juros de fiado", r.juros_fiado],
    ["= Resultado", r.resultado],
  ];

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Resultado geral"
          descricao="O resultado do negócio no período: vendas, custos, despesas e o que sobrou."
          voltarHref="/gestao/financeiro"
        />
        <FiltroPeriodo base="/gestao/resultado" de={de} ate={ate} />

        {!r.cmv_completo && <AvisoCustoIncompleto />}

        <div className="flex justify-end mb-3">
          <ExportarCSV nomeArquivo={`resultado_${de}_a_${ate}`} colunas={["Linha", "Valor"]} linhas={csvLinhas} />
        </div>

        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <Linha rotulo="Receita de vendas" valor={r.receita} />
          <Linha rotulo="(−) Custo dos produtos (CMV)" valor={-r.cmv} vermelho />
          <Linha rotulo="Lucro bruto" valor={r.lucro_bruto} forte />

          <Linha rotulo="(−) Taxas de cartão" valor={-r.taxas_cartao} vermelho />

          {/* Despesas com detalhamento */}
          <div className="px-4 pt-3 pb-1 bg-surface-2/40">
            <span className="text-xs font-bold text-muted uppercase tracking-wide">Despesas</span>
          </div>
          {r.despesas.length === 0 ? (
            <div className="px-4 py-2 text-sm text-muted">Nenhuma despesa no período.</div>
          ) : (
            r.despesas.map((d) => (
              <div key={d.categoria} className="flex items-center justify-between px-4 py-2 text-sm border-b border-line last:border-0">
                <span className="text-muted pl-3">{d.categoria}</span>
                <span className="tabular-nums text-danger">− {formatarBRL(d.total)}</span>
              </div>
            ))
          )}
          <Linha rotulo="(−) Despesas total" valor={-r.despesas_total} vermelho />

          <Linha rotulo="(+) Juros de fiado" valor={r.juros_fiado} />

          <div className="flex items-center justify-between px-4 py-4 bg-surface-2 border-t-2 border-line">
            <span className="font-extrabold text-ink text-lg">Resultado</span>
            <span className={`tabular-nums text-2xl font-extrabold ${r.resultado >= 0 ? "text-good" : "text-danger"}`}>
              {formatarBRL(r.resultado)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted mt-3">
          Regime de competência (a venda/despesa conta no período em que aconteceu, mesmo
          que o pagamento caia depois). É a mesma base da DRE — só que consolidada no
          período que você escolher, com as despesas abertas por categoria.
        </p>
      </main>
    </>
  );
}

function Linha({
  rotulo,
  valor,
  forte,
  vermelho,
}: {
  rotulo: string;
  valor: number;
  forte?: boolean;
  vermelho?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-line ${forte ? "bg-surface-2/40" : ""}`}>
      <span className={forte ? "font-bold text-ink" : "text-ink"}>{rotulo}</span>
      <span className={`tabular-nums ${forte ? "font-extrabold text-ink" : vermelho ? "text-danger" : "text-ink"}`}>
        {formatarBRL(valor)}
      </span>
    </div>
  );
}
