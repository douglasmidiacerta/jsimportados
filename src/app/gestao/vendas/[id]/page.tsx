import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterVendaGestao, devolvidoPorItem } from "@/lib/dados/vendas";
import { formatarBRL, formatarQtd, formatarData, numVenda } from "@/lib/formato";
import { FORMAS_PAGAMENTO } from "@/lib/dados/tipos";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { DevolverVenda, type ItemDevolvivel } from "@/components/vendas/DevolverVenda";
import { devolverVendaAction } from "../actions";

function rotuloForma(v: string) {
  return FORMAS_PAGAMENTO.find((f) => f.valor === v)?.rotulo ?? v;
}

export default async function VendaGestaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await exigirGestao();
  const [venda, devolvido] = await Promise.all([
    obterVendaGestao(id),
    devolvidoPorItem(id),
  ]);
  if (!venda) notFound();

  const itensDevolviveis: ItemDevolvivel[] = venda.itens
    .filter((it) => it.quantidade > 0)
    .map((it) => ({
      venda_item_id: it.id,
      produto_nome: it.produto_nome ?? "Produto",
      quantidade: it.quantidade,
      restante: Math.max(0, it.quantidade - (devolvido[it.id] ?? 0)),
      preco_unitario: it.preco_unitario,
    }))
    .filter((it) => it.restante > 0);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo={`Venda ${numVenda(venda.numero)}`}
          descricao={`${formatarData(venda.data_venda)} · ${rotuloForma(venda.forma_pagamento)}${venda.cliente_nome ? ` · ${venda.cliente_nome}` : ""}`}
          voltarHref="/gestao/vendas"
        />

        <div className="mb-5">
          <Link
            href={`/gestao/vendas/${venda.id}/recibo`}
            className="inline-flex items-center gap-2 h-10 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>
            Recibo / imprimir
          </Link>
        </div>

        {venda.status === "cancelada" && (
          <p className="mb-4 text-sm font-semibold text-danger bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-xl px-4 py-3">
            ⛔ Venda CANCELADA{venda.observacoes ? "" : ""} — estoque, caixa e
            relatórios já foram acertados.
          </p>
        )}
        {venda.status === "devolvida_parcial" && (
          <p className="mb-4 text-sm font-semibold text-amber bg-[var(--amber-soft)] border border-[color:var(--amber)]/30 rounded-xl px-4 py-3">
            ↩️ Esta venda teve devolução parcial (linhas em vermelho abaixo).
          </p>
        )}

        {/* Itens com margem */}
        <div className="rounded-2xl border border-line bg-surface overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                  <th className="text-left font-semibold px-4 py-3">Produto</th>
                  <th className="text-right font-semibold px-4 py-3">Qtd</th>
                  <th className="text-right font-semibold px-4 py-3">Preço</th>
                  <th className="text-right font-semibold px-4 py-3">Custo</th>
                  <th className="text-right font-semibold px-4 py-3">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {venda.itens.map((it) => (
                  <tr
                    key={it.id}
                    className={`border-b border-line last:border-0 ${it.quantidade < 0 ? "linha-vermelha" : ""}`}
                  >
                    <td className="px-4 py-3 text-ink font-medium">
                      {it.produto_nome ?? "—"}
                      {it.quantidade < 0 && (
                        <span className="ml-2 text-[10px] font-mono uppercase tracking-wide text-danger">devolução</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatarQtd(it.quantidade)}
                      {it.produto_unidade ? ` ${it.produto_unidade}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{formatarBRL(it.preco_unitario)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {it.custo_unitario == null ? "—" : formatarBRL(it.custo_unitario)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink font-semibold">{formatarBRL(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totais + margem */}
        <div className="rounded-2xl border border-line bg-surface-2 p-4 flex flex-col gap-1.5 mb-5">
          <Linha rotulo="Subtotal" valor={formatarBRL(venda.subtotal)} />
          {venda.desconto > 0 && <Linha rotulo="Desconto" valor={`− ${formatarBRL(venda.desconto)}`} />}
          {venda.juros > 0 && <Linha rotulo="Juros (fiado)" valor={`+ ${formatarBRL(venda.juros)}`} />}
          <Linha rotulo="Total" valor={formatarBRL(venda.total)} forte />
          <div className="border-t border-line my-1" />
          <Linha rotulo="Custo (COGS)" valor={formatarBRL(venda.custo_total)} />
          <Linha
            rotulo={`Lucro bruto ${venda.custo_completo ? "" : "(parcial)"}`}
            valor={formatarBRL(venda.lucro_bruto)}
            forte
          />
          {!venda.custo_completo && (
            <p className="text-xs text-amber mt-1">
              ⚠️ Algum produto não tem custo registrado — a margem está superestimada.
            </p>
          )}
        </div>

        {/* Contas a receber (cartão/fiado) */}
        {venda.contas.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-ink tracking-tight mb-2">A receber</h2>
            <div className="rounded-2xl border border-line bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                      <th className="text-left font-semibold px-4 py-3">Parcela</th>
                      <th className="text-left font-semibold px-4 py-3">Vence</th>
                      <th className="text-right font-semibold px-4 py-3">Bruto</th>
                      <th className="text-right font-semibold px-4 py-3">Taxa</th>
                      <th className="text-right font-semibold px-4 py-3">Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venda.contas.map((c) => (
                      <tr key={c.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 text-ink">{c.parcela_num}/{c.parcela_total}</td>
                        <td className="px-4 py-3 text-muted">{formatarData(c.vencimento)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatarBRL(c.valor_bruto)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-danger">
                          {c.valor_taxa > 0 ? `− ${formatarBRL(c.valor_taxa)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink font-semibold">{formatarBRL(c.valor_liquido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Devolver / Cancelar (Onda 1) */}
        {venda.status !== "cancelada" && itensDevolviveis.length > 0 && (
          <DevolverVenda
            vendaId={venda.id}
            itens={itensDevolviveis}
            formaPagamento={venda.forma_pagamento}
            action={devolverVendaAction}
          />
        )}
      </main>
    </>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={forte ? "font-bold text-ink" : "text-muted text-sm"}>{rotulo}</span>
      <span className={`tabular-nums ${forte ? "text-lg font-extrabold text-ink" : "text-ink font-semibold"}`}>
        {valor}
      </span>
    </div>
  );
}
