import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterOrcamento } from "@/lib/dados/orcamentos";
import { listarMaquininhasAtivas } from "@/lib/dados/maquininhas";
import { formatarBRL, formatarData, formatarQtd, numOrcamento } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ConverterOrcamento } from "@/components/vendas/ConverterOrcamento";
import { converterOrcamentoAction, cancelarOrcamentoAction } from "../actions";

const MSG_ERRO: Record<string, string> = {
  caixa: "Abra o caixa antes de transformar o orçamento em venda.",
  maquininha: "Escolha a maquininha que passou o cartão.",
  cliente: "Fiado precisa de cliente — edite o orçamento.",
  cancelar: "Não deu para cancelar. Tente de novo.",
  erro: "Não deu para concluir. Tente de novo.",
};

export default async function OrcamentoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const perfil = await exigirGestao();

  const orc = await obterOrcamento(id);
  if (!orc) notFound();
  const maquininhas = orc.status === "aberto" ? await listarMaquininhasAtivas() : [];

  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const vencido = orc.status === "aberto" && orc.validade != null && orc.validade < hoje;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo={`Orçamento ${numOrcamento(orc.numero)}`}
          descricao={`${formatarData(orc.criado_em.slice(0, 10))} · ${orc.cliente_nome ?? "Sem cliente"}`}
          voltarHref="/gestao/orcamentos"
        />

        {erro && (
          <p className="mb-4 text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
            {MSG_ERRO[erro] ?? MSG_ERRO.erro}
          </p>
        )}

        {/* Status */}
        {orc.status === "convertido" && orc.venda_id && (
          <p className="mb-4 text-sm text-good font-medium bg-[var(--good)]/10 border border-[var(--good)]/30 rounded-lg px-3 py-2">
            ✓ Este orçamento virou venda.{" "}
            <Link href={`/gestao/vendas/${orc.venda_id}`} className="underline font-semibold">Ver a venda</Link>.
          </p>
        )}
        {orc.status === "cancelado" && (
          <p className="mb-4 text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
            ⛔ Orçamento cancelado{orc.cancelado_motivo ? ` — ${orc.cancelado_motivo}` : ""}.
          </p>
        )}
        {vencido && (
          <p className="mb-4 text-sm text-amber font-medium bg-[var(--amber-soft)] border border-[color:var(--amber)]/30 rounded-lg px-3 py-2">
            ⏰ Passou da validade ({formatarData(orc.validade!)}). Ainda dá para converter — confira os preços.
          </p>
        )}

        {/* Itens */}
        <div className="rounded-2xl border border-line bg-surface overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                <th className="text-left font-semibold px-4 py-2.5">Produto</th>
                <th className="text-right font-semibold px-4 py-2.5">Qtd</th>
                <th className="text-right font-semibold px-4 py-2.5">Preço</th>
                <th className="text-right font-semibold px-4 py-2.5">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {orc.itens.map((it) => (
                <tr key={it.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink font-medium">{it.produto_nome ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatarQtd(it.quantidade)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatarBRL(it.preco_unitario)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatarBRL(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-line bg-surface-2 p-4 flex flex-col gap-1.5 mb-6">
          <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="tabular-nums text-ink">{formatarBRL(orc.subtotal)}</span></div>
          {orc.desconto > 0 && <div className="flex justify-between text-sm"><span className="text-muted">Desconto</span><span className="tabular-nums text-danger">− {formatarBRL(orc.desconto)}</span></div>}
          <div className="flex justify-between"><span className="font-bold text-ink">Total</span><span className="tabular-nums text-xl font-extrabold text-ink">{formatarBRL(orc.total)}</span></div>
          {orc.observacoes && <p className="text-xs text-muted mt-1">{orc.observacoes}</p>}
        </div>

        {/* Ações (só se aberto) */}
        {orc.status === "aberto" && (
          <>
            <section className="rounded-2xl border border-accent/40 bg-surface p-4 mb-4">
              <ConverterOrcamento
                orcamentoId={orc.id}
                temCliente={orc.cliente_id != null}
                maquininhas={maquininhas}
                action={converterOrcamentoAction}
              />
            </section>
            <details className="group">
              <summary className="cursor-pointer text-center text-sm font-semibold text-muted underline decoration-dotted underline-offset-4 hover:text-danger list-none">
                Não vai fechar? Cancelar este orçamento
              </summary>
              <form action={cancelarOrcamentoAction} className="mt-3 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-4 flex flex-col gap-3">
                <input type="hidden" name="id" value={orc.id} />
                <input
                  name="motivo"
                  placeholder="Motivo (opcional): cliente desistiu, preço mudou…"
                  className="min-h-[48px] rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:border-accent"
                />
                <button type="submit" className="h-12 rounded-xl bg-[var(--danger)] text-white font-bold active:scale-[0.99]">
                  Cancelar orçamento
                </button>
              </form>
            </details>
          </>
        )}
      </main>
    </>
  );
}
