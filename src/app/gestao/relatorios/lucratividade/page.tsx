import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { lucratividadeProdutos } from "@/lib/dados/relatorios";
import { classificarABC } from "@/lib/dados/abc";
import { formatarBRL, formatarQtd } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import {
  FiltroPeriodo,
  BarraProporcional,
  BadgeClasse,
  AvisoCustoIncompleto,
  corBarraClasse,
  resolverPeriodo,
} from "../_ui";
import type { ProdutoLucro } from "@/lib/dados/tipos";

export default async function RelLucratividadePage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; base?: string }>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const { de, ate } = resolverPeriodo(sp.de, sp.ate);
  const base: "faturamento" | "lucro" = sp.base === "lucro" ? "lucro" : "faturamento";

  const rows = await lucratividadeProdutos(de, ate);
  const metrica = (r: ProdutoLucro) => (base === "lucro" ? r.lucro : r.faturamento);
  const { itens, resumo } = classificarABC(rows, metrica, (r) => r.nome);
  const positivos = itens.filter((i) => !i.prejuizo && !i.semContribuicao);
  const problematicos = itens.filter((i) => i.prejuizo || i.semContribuicao);
  const temIncompleto = rows.some((r) => r.custo_incompleto);
  const q = (b: string) => `/gestao/relatorios/lucratividade?de=${de}&ate=${ate}&base=${b}`;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro titulo="Lucratividade + Curva ABC" voltarHref="/gestao/relatorios" />
        <FiltroPeriodo base="/gestao/relatorios/lucratividade" de={de} ate={ate} metrica={base} />

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted">Curva ABC por:</span>
          <Toggle ativo={base === "faturamento"} href={q("faturamento")}>Faturamento</Toggle>
          <Toggle ativo={base === "lucro"} href={q("lucro")}>Lucro</Toggle>
        </div>

        {temIncompleto && <AvisoCustoIncompleto />}

        {rows.length === 0 ? (
          <p className="text-muted text-center py-10">Sem vendas nesse período.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {(["A", "B", "C"] as const).map((c) => (
                <div key={c} className="rounded-xl border border-line bg-surface p-3 text-center">
                  <div className="text-xs text-muted">Classe {c}</div>
                  <div className="text-ink font-extrabold tabular-nums">{resumo[c].n}</div>
                  <div className="text-[11px] text-muted">{formatarBRL(resumo[c].valor)} · {resumo[c].pct.toFixed(0)}%</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {positivos.map((r) => (
                <div key={r.produto_id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <BadgeClasse classe={r.classe} />
                      <span className="font-semibold text-ink truncate">{r.nome}</span>
                      {r.custo_incompleto && <span className="text-[10px] text-amber shrink-0">custo estimado</span>}
                    </span>
                    <span className="tabular-nums text-ink font-semibold shrink-0">
                      {formatarBRL(base === "lucro" ? r.lucro : r.faturamento)}
                    </span>
                  </div>
                  <div className="mt-1"><BarraProporcional pct={r.pctItem} cor={corBarraClasse(r.classe)} /></div>
                  <div className="mt-1 text-xs text-muted flex flex-wrap gap-x-3">
                    <span>{formatarQtd(r.quantidade)} vend.</span>
                    <span>fat. {formatarBRL(r.faturamento)}</span>
                    <span>lucro {formatarBRL(r.lucro)}</span>
                    <span>margem {(r.margem * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>

            {problematicos.length > 0 && (
              <section className="mt-5">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">
                  {base === "lucro" ? "Prejuízo / sem lucro" : "Sem faturamento"}
                </h2>
                <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
                  {problematicos.map((r) => (
                    <div key={r.produto_id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-ink truncate">{r.nome}</span>
                      <span className={`tabular-nums font-semibold ${r.prejuizo ? "text-danger" : "text-muted"}`}>
                        {formatarBRL(base === "lucro" ? r.lucro : r.faturamento)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="text-xs text-muted mt-5 border-t border-line pt-3">
              O faturamento por produto <b>não</b> desconta o desconto dado na venda, então a
              soma dos lucros aqui fica acima do lucro bruto da DRE (pela soma dos descontos).
              Para o resultado com descontos, juros e taxas, veja a{" "}
              <Link href="/gestao/dre" className="text-accent-ink underline">DRE</Link>.
            </p>
          </>
        )}
      </main>
    </>
  );
}

function Toggle({ ativo, href, children }: { ativo: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`px-3 py-1 rounded-full text-sm font-semibold border ${ativo ? "bg-accent text-white border-accent" : "bg-surface text-muted border-line hover:text-ink"}`}>
      {children}
    </Link>
  );
}
