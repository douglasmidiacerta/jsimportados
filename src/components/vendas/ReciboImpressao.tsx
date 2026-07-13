import { formatarBRL, formatarQtd, formatarData, numVenda } from "@/lib/formato";
import { valorPorExtenso } from "@/lib/extenso";
import { parcelasBrutas } from "@/lib/vendas/calculo";
import { FORMAS_PAGAMENTO, type VendaDetalhe, type EmpresaConfig } from "@/lib/dados/tipos";

function rotuloForma(v: string) {
  return FORMAS_PAGAMENTO.find((f) => f.valor === v)?.rotulo ?? v;
}

function enderecoLinha(e: EmpresaConfig): string | null {
  const p = [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.bairro,
    [e.cidade, e.uf].filter(Boolean).join("/"),
  ].filter(Boolean);
  return p.length ? p.join(" · ") : null;
}

/**
 * Recibo imprimível de uma venda (A4/cupom). Fundo branco e texto preto — pensado
 * para impressão. Uma "via" por cópia (empresa.vias). Foco na tela também: fica
 * legível no navegador e imprime limpo (a navegação some via .nao-imprimir).
 */
export function ReciboImpressao({
  venda,
  empresa,
}: {
  venda: VendaDetalhe;
  empresa: EmpresaConfig;
}) {
  const vias = Math.max(1, empresa.vias || 1);
  const nParcelas = venda.cartao_parcelas ?? 1;
  const valorParcela = parcelasBrutas(venda.total, nParcelas)[0] ?? venda.total;
  const endereco = enderecoLinha(empresa);

  const umaVia = (via: number) => (
    <div
      key={via}
      className="recibo-via bg-white text-black rounded-lg border border-neutral-300 p-6 mx-auto"
      style={{ maxWidth: "620px", width: "100%" }}
    >
      {/* Cabeçalho da empresa */}
      <div className="flex items-start justify-between gap-4 border-b border-neutral-300 pb-3">
        <div>
          <div className="text-xl font-extrabold tracking-tight">{empresa.nome}</div>
          {empresa.cnpj && <div className="text-xs text-neutral-600">CNPJ {empresa.cnpj}</div>}
          {endereco && <div className="text-xs text-neutral-600">{endereco}</div>}
          {empresa.telefone && <div className="text-xs text-neutral-600">Tel: {empresa.telefone}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold">RECIBO</div>
          <div className="text-lg font-extrabold tabular-nums">{numVenda(venda.numero)}</div>
          <div className="text-xs text-neutral-600">{formatarData(venda.data_venda)}</div>
          {vias > 1 && <div className="text-[10px] text-neutral-500 mt-1">{via}ª via</div>}
        </div>
      </div>

      {/* Itens */}
      <table className="w-full text-sm mt-3">
        <thead>
          <tr className="text-neutral-500 text-[11px] uppercase tracking-wide border-b border-neutral-200">
            <th className="text-left font-semibold py-1">Produto</th>
            <th className="text-right font-semibold py-1">Qtd</th>
            <th className="text-right font-semibold py-1">Preço</th>
            <th className="text-right font-semibold py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {venda.itens.map((it) => (
            <tr key={it.id} className="border-b border-neutral-100">
              <td className="py-1.5">{it.produto_nome ?? "—"}</td>
              <td className="py-1.5 text-right tabular-nums">
                {formatarQtd(it.quantidade)}
                {it.produto_unidade ? ` ${it.produto_unidade}` : ""}
              </td>
              <td className="py-1.5 text-right tabular-nums">{formatarBRL(it.preco_unitario)}</td>
              <td className="py-1.5 text-right tabular-nums font-medium">{formatarBRL(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totais */}
      <div className="mt-3 flex flex-col gap-0.5 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-600">Subtotal</span>
          <span className="tabular-nums">{formatarBRL(venda.subtotal)}</span>
        </div>
        {venda.desconto > 0 && (
          <div className="flex justify-between">
            <span className="text-neutral-600">Desconto</span>
            <span className="tabular-nums">− {formatarBRL(venda.desconto)}</span>
          </div>
        )}
        {venda.juros > 0 && (
          <div className="flex justify-between">
            <span className="text-neutral-600">Juros</span>
            <span className="tabular-nums">+ {formatarBRL(venda.juros)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-neutral-300 mt-1 pt-1">
          <span className="font-bold">TOTAL</span>
          <span className="tabular-nums text-lg font-extrabold">{formatarBRL(venda.total)}</span>
        </div>
      </div>

      {/* Valor por extenso */}
      <div className="mt-2 text-xs text-neutral-700 italic">
        {capitalizar(valorPorExtenso(venda.total))}.
      </div>

      {/* Pagamento */}
      <div className="mt-3 pt-2 border-t border-neutral-200 text-sm">
        <span className="text-neutral-600">Pagamento: </span>
        <span className="font-semibold">
          {rotuloForma(venda.forma_pagamento)}
          {venda.forma_pagamento === "cartao" &&
            ` · ${venda.cartao_modalidade === "debito" ? "Débito" : `${nParcelas}x de ${formatarBRL(valorParcela)}`}`}
        </span>
        {venda.forma_pagamento === "fiado" && venda.fiado_vencimento && (
          <span className="text-neutral-600"> · vence {formatarData(venda.fiado_vencimento)}</span>
        )}
        {venda.cliente_nome && <div className="text-neutral-600 mt-0.5">Cliente: {venda.cliente_nome}</div>}
      </div>

      {/* Rodapé */}
      {empresa.mensagem_rodape && (
        <div className="mt-4 pt-3 border-t border-neutral-300 text-center text-xs text-neutral-600">
          {empresa.mensagem_rodape}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: vias }, (_, i) => umaVia(i + 1))}
    </div>
  );
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
