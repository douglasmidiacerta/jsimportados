import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterContaReceber } from "@/lib/dados/contasReceber";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { BaixarReceber } from "@/components/financeiro/BaixarReceber";
import { BotaoEstorno } from "@/components/financeiro/BotaoEstorno";
import { baixarReceberAction, estornarRecebimentoAction } from "../actions";

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

export default async function ContaReceberDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await exigirGestao();
  const conta = await obterContaReceber(id);
  if (!conta) notFound();

  const cancelada = conta.status === "cancelado";
  const podeBaixar = !cancelada && conta.saldo > 0.005;
  const titulo =
    conta.cliente_nome ?? (conta.tipo === "cartao" ? "Cartão" : "Fiado");
  const recebimentos = conta.recebimentos;
  // ids de recebimentos que já têm uma linha de estorno associada
  const estornados = new Set(
    recebimentos.filter((r) => r.estorno_de).map((r) => r.estorno_de),
  );

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-lg w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo={titulo}
          descricao={
            conta.tipo === "cartao"
              ? `Cartão · parcela ${conta.parcela_num}/${conta.parcela_total}`
              : "Fiado"
          }
          voltarHref="/gestao/contas-receber"
        />

        <div className="rounded-2xl border border-line bg-surface-2 p-4 flex flex-col gap-1.5 mb-5">
          <Linha rotulo="Vencimento" valor={formatarData(conta.vencimento)} />
          <Linha rotulo="Valor bruto" valor={formatarBRL(conta.valor_bruto)} />
          {conta.valor_taxa > 0 && (
            <Linha rotulo="Taxa do cartão (MDR)" valor={`- ${formatarBRL(conta.valor_taxa)}`} />
          )}
          <Linha rotulo="Líquido a receber" valor={formatarBRL(conta.valor_liquido)} />
          {conta.valor_recebido > 0 && (
            <Linha rotulo="Já recebido" valor={formatarBRL(conta.valor_recebido)} />
          )}
          <div className="border-t border-line my-1" />
          {cancelada ? (
            <Linha rotulo="Status" valor="Cancelada" forte />
          ) : conta.saldo > 0.005 ? (
            <Linha rotulo="Falta receber" valor={formatarBRL(conta.saldo)} forte />
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink">Situação</span>
              <span className="text-lg font-extrabold text-good">✓ Recebida</span>
            </div>
          )}
        </div>

        <Link
          href={`/gestao/vendas/${conta.venda_id}`}
          className="inline-block text-sm font-semibold text-accent-ink underline underline-offset-2 mb-5"
        >
          Ver a venda →
        </Link>

        {podeBaixar && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-ink tracking-tight mb-2">Dar baixa</h2>
            <BaixarReceber
              contaId={conta.id}
              tipo={conta.tipo}
              saldo={conta.saldo}
              vencimento={conta.vencimento}
              action={baixarReceberAction}
            />
          </section>
        )}

        {recebimentos.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-ink tracking-tight mb-2">Recebimentos</h2>
            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {recebimentos.map((r) => {
                const estorno = r.valor < 0;
                const podeEstornar =
                  !estorno && conta.status !== "cancelado" && !estornados.has(r.id);
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="min-w-0">
                      <span className="block text-ink font-medium">
                        {estorno ? "Estorno" : "Recebimento"}
                        {r.forma_pagamento && !estorno ? ` · ${r.forma_pagamento}` : ""}
                      </span>
                      <span className="block text-xs text-muted">{formatarData(r.data_recebimento)}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className={`tabular-nums font-semibold ${estorno ? "text-danger" : "text-ink"}`}>
                        {estorno ? "−" : "+"}
                        {formatarBRL(Math.abs(r.valor))}
                      </span>
                      {podeEstornar && (
                        <BotaoEstorno
                          action={estornarRecebimentoAction}
                          hidden={{ recebimento_id: r.id, conta_id: conta.id }}
                          rotulo="Estornar"
                          confirmar="Estornar este recebimento? Ele volta como saldo a receber."
                        />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
