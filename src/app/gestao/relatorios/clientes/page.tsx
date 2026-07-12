import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { clientesPeriodo, vendasResumo } from "@/lib/dados/relatorios";
import { classificarABC } from "@/lib/dados/abc";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FiltroPeriodo, BarraProporcional, BadgeClasse, AvisoCustoIncompleto, corBarraClasse, resolverPeriodo } from "../_ui";
import type { ClientePeriodo } from "@/lib/dados/tipos";

export default async function RelClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; base?: string }>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const { de, ate } = resolverPeriodo(sp.de, sp.ate);
  const base: "faturamento" | "lucro" = sp.base === "lucro" ? "lucro" : "faturamento";

  const [rows, resumo] = await Promise.all([
    clientesPeriodo(de, ate),
    vendasResumo(de, ate),
  ]);
  const metrica = (r: ClientePeriodo) => (base === "lucro" ? r.lucro : r.faturamento);
  const { itens } = classificarABC(rows, metrica, (r) => r.nome);
  const positivos = itens.filter((i) => !i.prejuizo && !i.semContribuicao);
  const problematicos = itens.filter((i) => i.prejuizo || i.semContribuicao);
  const temIncompleto = !resumo.custo_completo || rows.some((r) => !r.custo_completo);
  const fatClientes = rows.reduce((s, r) => s + r.faturamento, 0);
  const cobertura = resumo.faturamento > 0 ? (fatClientes / resumo.faturamento) * 100 : 0;
  const q = (b: string) => `/gestao/relatorios/clientes?de=${de}&ate=${ate}&base=${b}`;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro titulo="ABC de clientes" voltarHref="/gestao/relatorios" />
        <FiltroPeriodo base="/gestao/relatorios/clientes" de={de} ate={ate} metrica={base} />

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted">Ranquear por:</span>
          <Toggle ativo={base === "faturamento"} href={q("faturamento")}>Faturamento</Toggle>
          <Toggle ativo={base === "lucro"} href={q("lucro")}>Lucro</Toggle>
        </div>

        {temIncompleto && <AvisoCustoIncompleto />}

        {rows.length === 0 ? (
          <p className="text-muted text-center py-10">Nenhuma compra de cliente identificado nesse período.</p>
        ) : (
          <>
            <p className="text-xs text-muted mb-4">
              Clientes identificados = <b>{cobertura.toFixed(0)}%</b> do faturamento do período (o
              resto é balcão sem cadastro).
            </p>

            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {positivos.map((r) => (
                <Link key={r.cliente_id} href={`/gestao/clientes/${r.cliente_id}`} className="block px-4 py-3 hover:bg-surface-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <BadgeClasse classe={r.classe} />
                      <span className="font-semibold text-ink truncate">{r.nome}</span>
                    </span>
                    <span className="tabular-nums text-ink font-semibold shrink-0">
                      {formatarBRL(base === "lucro" ? r.lucro : r.faturamento)}
                    </span>
                  </div>
                  <div className="mt-1"><BarraProporcional pct={r.pctItem} cor={corBarraClasse(r.classe)} /></div>
                  <div className="mt-1 text-xs text-muted flex flex-wrap gap-x-3">
                    <span>{r.n_compras} compra{r.n_compras > 1 ? "s" : ""}</span>
                    <span>fat. {formatarBRL(r.faturamento)}</span>
                    <span>lucro {formatarBRL(r.lucro)}</span>
                    <span>ticket {formatarBRL(r.ticket_medio)}</span>
                  </div>
                </Link>
              ))}
            </div>

            {problematicos.length > 0 && (
              <section className="mt-5">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">
                  {base === "lucro" ? "Prejuízo / sem lucro" : "Sem faturamento"}
                </h2>
                <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
                  {problematicos.map((r) => (
                    <div key={r.cliente_id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-ink truncate">{r.nome}</span>
                      <span className={`tabular-nums font-semibold ${r.prejuizo ? "text-danger" : "text-muted"}`}>
                        {formatarBRL(base === "lucro" ? r.lucro : r.faturamento)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <Link href="/gestao/crm" className="inline-block mt-5 text-sm font-semibold text-accent-ink underline underline-offset-2">
              Ir para o CRM →
            </Link>
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
