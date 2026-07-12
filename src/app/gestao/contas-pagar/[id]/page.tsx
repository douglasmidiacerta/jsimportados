import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterContaPagar } from "@/lib/dados/financeiro";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { PagarConta } from "@/components/financeiro/PagarConta";
import { BotaoEstorno } from "@/components/financeiro/BotaoEstorno";
import {
  pagarContaAction,
  estornarPagamentoAction,
  cancelarContaAction,
} from "../actions";

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

export default async function ContaPagarDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await exigirGestao();
  const conta = await obterContaPagar(id);
  if (!conta) notFound();

  const cancelada = conta.status === "cancelado";
  const podePagar = !cancelada && conta.saldo > 0.005;
  const podeCancelar = !cancelada && conta.valor_pago === 0;
  const pagamentos = conta.pagamentos;
  // ids de pagamentos que já têm uma linha de estorno associada
  const estornados = new Set(
    conta.pagamentos.filter((p) => p.estorno_de).map((p) => p.estorno_de),
  );

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-lg w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo={conta.descricao}
          descricao={
            conta.tipo === "compra" ? "Conta de compra (fornecedor)" : "Despesa"
          }
          voltarHref="/gestao/contas-pagar"
        />

        <div className="rounded-2xl border border-line bg-surface-2 p-4 flex flex-col gap-1.5 mb-5">
          {conta.fornecedor_nome && <Linha rotulo="Fornecedor" valor={conta.fornecedor_nome} />}
          {conta.categoria_nome && <Linha rotulo="Categoria" valor={conta.categoria_nome} />}
          <Linha rotulo="Vencimento" valor={formatarData(conta.vencimento)} />
          <Linha rotulo="Valor" valor={formatarBRL(conta.valor)} />
          {conta.valor_pago > 0 && <Linha rotulo="Já pago" valor={formatarBRL(conta.valor_pago)} />}
          <div className="border-t border-line my-1" />
          {cancelada ? (
            <Linha rotulo="Status" valor="Cancelada" forte />
          ) : conta.saldo > 0.005 ? (
            <Linha rotulo="Falta pagar" valor={formatarBRL(conta.saldo)} forte />
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink">Situação</span>
              <span className="text-lg font-extrabold text-good">✓ Paga</span>
            </div>
          )}
        </div>

        {conta.tipo === "compra" && conta.compra_id && (
          <Link
            href={`/gestao/compras/${conta.compra_id}`}
            className="inline-block text-sm font-semibold text-accent-ink underline underline-offset-2 mb-5"
          >
            Ver a compra que gerou esta conta →
          </Link>
        )}

        {podePagar && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-ink tracking-tight mb-2">Registrar pagamento</h2>
            <PagarConta
              contaId={conta.id}
              saldo={conta.saldo}
              vencimento={conta.vencimento}
              action={pagarContaAction}
            />
          </section>
        )}

        {pagamentos.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-ink tracking-tight mb-2">Pagamentos</h2>
            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {pagamentos.map((p) => {
                const estorno = p.valor < 0;
                const podeEstornar =
                  !estorno && conta.status !== "cancelado" && !estornados.has(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="min-w-0">
                      <span className="block text-ink font-medium">
                        {estorno ? "Estorno" : "Pagamento"}
                        {p.forma_pagamento && !estorno ? ` · ${p.forma_pagamento}` : ""}
                      </span>
                      <span className="block text-xs text-muted">{formatarData(p.data_pagamento)}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className={`tabular-nums font-semibold ${estorno ? "text-danger" : "text-ink"}`}>
                        {estorno ? "−" : "+"}
                        {formatarBRL(Math.abs(p.valor))}
                      </span>
                      {podeEstornar && (
                        <BotaoEstorno
                          action={estornarPagamentoAction}
                          hidden={{ pagamento_id: p.id, conta_id: conta.id }}
                          rotulo="Estornar"
                          confirmar="Estornar este pagamento? Ele volta como saldo em aberto."
                        />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {podeCancelar && (
          <BotaoEstorno
            action={cancelarContaAction}
            hidden={{ conta_id: conta.id }}
            rotulo="Cancelar esta conta"
            confirmar="Cancelar esta conta a pagar? Ela sai do financeiro."
            variante="perigo"
          />
        )}
      </main>
    </>
  );
}
