import { exigirGestao } from "@/lib/perfil";
import { estoqueParado } from "@/lib/dados/relatorios";
import { classificarABC } from "@/lib/dados/abc";
import { formatarBRL, formatarQtd } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { BarraProporcional, BadgeClasse, corBarraClasse } from "../_ui";
import type { EstoqueParado } from "@/lib/dados/tipos";

export default async function RelEstoquePage() {
  const perfil = await exigirGestao();
  const rows = await estoqueParado();
  const { itens, resumo } = classificarABC(
    rows,
    (r: EstoqueParado) => r.valor_parado,
    (r) => r.nome,
  );
  const comValor = itens.filter((i) => !i.semContribuicao && !i.prejuizo);
  const negativos = itens.filter((i) => i.prejuizo); // estoque negativo (vendido além do saldo)
  const semCusto = rows.filter((r) => r.custo_ausente);
  const total = rows.reduce((s, r) => s + r.valor_parado, 0);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="ABC de estoque"
          descricao="Onde está o dinheiro parado (estoque × custo médio)."
          voltarHref="/gestao/relatorios"
        />

        <div className="rounded-2xl border border-accent/30 bg-accent-soft/50 p-4 mb-4">
          <div className="text-sm text-accent-ink font-semibold">Total imobilizado em estoque</div>
          <div className="text-3xl font-extrabold text-ink tabular-nums">{formatarBRL(total)}</div>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted text-center py-10">Nenhum produto com estoque.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {(["A", "B", "C"] as const).map((c) => (
                <div key={c} className="rounded-xl border border-line bg-surface p-3 text-center">
                  <div className="text-xs text-muted">Classe {c}</div>
                  <div className="text-ink font-extrabold tabular-nums">{resumo[c].n}</div>
                  <div className="text-[11px] text-muted">{resumo[c].pct.toFixed(0)}%</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {comValor.map((r) => (
                <div key={r.produto_id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <BadgeClasse classe={r.classe} />
                      <span className="font-semibold text-ink truncate">{r.nome}</span>
                    </span>
                    <span className="tabular-nums text-ink font-semibold shrink-0">{formatarBRL(r.valor_parado)}</span>
                  </div>
                  <div className="mt-1"><BarraProporcional pct={r.pctItem} cor={corBarraClasse(r.classe)} /></div>
                  <div className="mt-1 text-xs text-muted">
                    {formatarQtd(r.estoque_atual)} un · custo {formatarBRL(r.custo ?? 0)}
                  </div>
                </div>
              ))}
            </div>

            {negativos.length > 0 && (
              <section className="mt-5">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Estoque negativo</h2>
                <p className="text-xs text-muted mb-2">Vendido além do saldo — ajuste o estoque (uma entrada) para regularizar.</p>
                <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
                  {negativos.map((r) => (
                    <div key={r.produto_id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-ink truncate">{r.nome}</span>
                      <span className="text-xs text-danger font-semibold tabular-nums">{formatarQtd(r.estoque_atual)} un · {formatarBRL(r.valor_parado)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {semCusto.length > 0 && (
              <section className="mt-5">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Custo não cadastrado</h2>
                <p className="text-xs text-muted mb-2">Sem custo, não dá pra calcular o valor parado. Cadastre o custo (numa compra) para aparecerem aqui.</p>
                <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
                  {semCusto.map((r) => (
                    <div key={r.produto_id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-ink truncate">{r.nome}</span>
                      <span className="text-xs text-muted">{formatarQtd(r.estoque_atual)} un</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
