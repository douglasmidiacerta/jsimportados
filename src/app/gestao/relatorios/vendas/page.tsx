import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { vendasResumo, vendasPorDia, vendasPorForma } from "@/lib/dados/relatorios";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FiltroPeriodo, BarraProporcional, AvisoCustoIncompleto, resolverPeriodo } from "../_ui";

const FORMA_ROTULO: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  fiado: "Fiado",
};

export default async function RelVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const { de, ate } = resolverPeriodo(sp.de, sp.ate);

  const [resumo, porDia, porForma] = await Promise.all([
    vendasResumo(de, ate),
    vendasPorDia(de, ate),
    vendasPorForma(de, ate),
  ]);
  const maxDia = Math.max(1, ...porDia.map((d) => d.faturamento));
  const maxForma = Math.max(1, ...porForma.map((fx) => fx.faturamento));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro titulo="Vendas por período" voltarHref="/gestao/relatorios" />
        <FiltroPeriodo base="/gestao/relatorios/vendas" de={de} ate={ate} />

        {!resumo.custo_completo && <AvisoCustoIncompleto />}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          <Kpi titulo="Faturamento" valor={formatarBRL(resumo.faturamento)} />
          <Kpi titulo="Lucro" valor={formatarBRL(resumo.lucro)} cor={resumo.lucro >= 0 ? "text-good" : "text-danger"} />
          <Kpi titulo="Ticket médio" valor={formatarBRL(resumo.ticket_medio)} />
          <Kpi titulo="Vendas" valor={String(resumo.n_vendas)} />
        </div>
        {(resumo.desconto > 0 || resumo.juros > 0) && (
          <p className="text-xs text-muted mb-4">
            Descontos {formatarBRL(resumo.desconto)} · Juros de fiado {formatarBRL(resumo.juros)}
          </p>
        )}

        {resumo.n_vendas === 0 ? (
          <p className="text-muted text-center py-10">Sem vendas nesse período.</p>
        ) : (
          <>
            <section className="mb-6">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Por dia</h2>
              <div className="flex flex-col gap-2">
                {porDia.map((d) => (
                  <div key={d.dia}>
                    <div className="flex items-center justify-between text-sm mb-0.5">
                      <span className="text-muted">{formatarData(d.dia)}</span>
                      <span className="text-ink font-semibold tabular-nums">
                        {formatarBRL(d.faturamento)}
                        <span className="text-muted font-normal"> · lucro {formatarBRL(d.lucro)}</span>
                      </span>
                    </div>
                    <BarraProporcional pct={(d.faturamento / maxDia) * 100} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Por forma de pagamento</h2>
              <div className="flex flex-col gap-2">
                {porForma.map((fx) => (
                  <div key={fx.forma} className="rounded-xl border border-line bg-surface p-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold text-ink">{FORMA_ROTULO[fx.forma] ?? fx.forma}</span>
                      <span className="tabular-nums text-ink">
                        {formatarBRL(fx.faturamento)} <span className="text-muted">({fx.n_vendas})</span>
                      </span>
                    </div>
                    <BarraProporcional pct={(fx.faturamento / maxForma) * 100} />
                    <div className="text-xs text-muted mt-1">lucro {formatarBRL(fx.lucro)}</div>
                  </div>
                ))}
              </div>
            </section>

            <Link href={`/gestao/dre`} className="inline-block mt-6 text-sm font-semibold text-accent-ink underline underline-offset-2">
              Ver DRE (com descontos, juros e taxas) →
            </Link>
          </>
        )}
      </main>
    </>
  );
}

function Kpi({ titulo, valor, cor }: { titulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-muted">{titulo}</div>
      <div className={`text-lg font-extrabold tabular-nums mt-0.5 ${cor ?? "text-ink"}`}>{valor}</div>
    </div>
  );
}
