import { formatarBRL, formatarQtd, formatarData } from "@/lib/formato";
import { parcelasBrutas } from "@/lib/vendas/calculo";
import { FORMAS_PAGAMENTO, type VendaDetalhe } from "@/lib/dados/tipos";

function rotuloForma(v: string) {
  return FORMAS_PAGAMENTO.find((f) => f.valor === v)?.rotulo ?? v;
}

/** Recibo da venda (visão operação/cliente): itens + totais + pagamento. SEM custo. */
export function ReciboVenda({ venda }: { venda: VendaDetalhe }) {
  const nParcelas = venda.cartao_parcelas ?? 1;
  const valorParcela = parcelasBrutas(venda.total, nParcelas)[0] ?? venda.total;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="divide-y divide-line">
          {venda.itens.map((it) => (
            <div key={it.id} className="flex items-center justify-between px-4 py-3">
              <span className="min-w-0">
                <span className="block text-ink font-medium truncate">
                  {it.produto_nome ?? "—"}
                </span>
                <span className="block text-sm text-muted">
                  {formatarQtd(it.quantidade)}
                  {it.produto_unidade ? ` ${it.produto_unidade}` : ""} ×{" "}
                  {formatarBRL(it.preco_unitario)}
                </span>
              </span>
              <span className="font-semibold text-ink tabular-nums">
                {formatarBRL(it.subtotal)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface-2 p-4 flex flex-col gap-1.5">
        <Linha rotulo="Subtotal" valor={formatarBRL(venda.subtotal)} />
        {venda.desconto > 0 && (
          <Linha rotulo="Desconto" valor={`− ${formatarBRL(venda.desconto)}`} />
        )}
        {venda.juros > 0 && (
          <Linha rotulo="Juros" valor={`+ ${formatarBRL(venda.juros)}`} />
        )}
        <div className="border-t border-line my-1" />
        <Linha rotulo="Total" valor={formatarBRL(venda.total)} forte />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Pagamento</span>
          <span className="font-semibold text-ink">
            {rotuloForma(venda.forma_pagamento)}
            {venda.forma_pagamento === "cartao" &&
              ` · ${venda.cartao_modalidade === "debito" ? "Débito" : `${nParcelas}x`}`}
          </span>
        </div>
        {venda.forma_pagamento === "cartao" && nParcelas > 1 && (
          <div className="flex justify-between mt-1">
            <span className="text-muted">Parcelas</span>
            <span className="text-ink">{nParcelas}× de {formatarBRL(valorParcela)}</span>
          </div>
        )}
        {venda.forma_pagamento === "fiado" && venda.fiado_vencimento && (
          <div className="flex justify-between mt-1">
            <span className="text-muted">Vence em</span>
            <span className="text-ink">{formatarData(venda.fiado_vencimento)}</span>
          </div>
        )}
        {venda.cliente_nome && (
          <div className="flex justify-between mt-1">
            <span className="text-muted">Cliente</span>
            <span className="text-ink">{venda.cliente_nome}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={forte ? "font-bold text-ink" : "text-muted text-sm"}>{rotulo}</span>
      <span className={`tabular-nums ${forte ? "text-xl font-extrabold text-ink" : "text-ink font-semibold"}`}>
        {valor}
      </span>
    </div>
  );
}
