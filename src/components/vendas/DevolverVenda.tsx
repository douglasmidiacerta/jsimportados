"use client";

import { useMemo, useState, useActionState } from "react";
import { formatarBRL, formatarQtd } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export type ItemDevolvivel = {
  venda_item_id: string;
  produto_nome: string;
  quantidade: number; // vendida (original)
  restante: number; // vendida − já devolvida
  preco_unitario: number;
};

/**
 * Devolver/cancelar venda (Onda 1). Escolhe quantidades por item, se a
 * mercadoria volta ao estoque (revendável) ou é perda, e o motivo.
 * As regras duras (D3, cartão só inteiro, zero recebido) vivem no banco.
 */
export function DevolverVenda({
  vendaId,
  itens,
  formaPagamento,
  action,
}: {
  vendaId: string;
  itens: ItemDevolvivel[];
  formaPagamento: string;
  action: Acao;
}) {
  const [aberto, setAberto] = useState(false);
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [revendavel, setRevendavel] = useState(true);
  const [estado, formAction, enviando] = useActionState(action, {});

  const cartaoOuFiado = formaPagamento === "cartao" || formaPagamento === "fiado";

  const escolhidos = useMemo(
    () =>
      itens
        .map((i) => ({
          venda_item_id: i.venda_item_id,
          quantidade: Math.min(qtds[i.venda_item_id] ?? 0, i.restante),
          revendavel,
        }))
        .filter((i) => i.quantidade > 0),
    [itens, qtds, revendavel],
  );
  const valorDevolver = useMemo(
    () =>
      escolhidos.reduce((s, e) => {
        const it = itens.find((i) => i.venda_item_id === e.venda_item_id)!;
        return s + e.quantidade * it.preco_unitario;
      }, 0),
    [escolhidos, itens],
  );
  const tudo = escolhidos.length > 0 &&
    itens.every((i) => (qtds[i.venda_item_id] ?? 0) >= i.restante);

  function devolverTudo() {
    const n: Record<string, number> = {};
    for (const i of itens) n[i.venda_item_id] = i.restante;
    setQtds(n);
  }

  if (!aberto) {
    return (
      <div className="mt-8 pt-6 border-t border-line">
        <p className="text-sm text-muted mb-2">
          Errou algo ou o cliente devolveu? Dá para devolver itens ou cancelar a
          venda — o estoque, o caixa e os relatórios se acertam sozinhos.
        </p>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="h-11 inline-flex items-center rounded-xl border border-[var(--danger)]/40 text-danger px-4 font-semibold hover:bg-[var(--danger)]/10 transition-colors"
        >
          Devolver / Cancelar venda
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-line">
      <h2 className="text-lg font-bold text-ink tracking-tight mb-3">
        Devolver / Cancelar
      </h2>

      {cartaoOuFiado && (
        <p className="text-xs font-medium text-amber bg-[var(--amber-soft)] border border-[color:var(--amber)]/30 rounded-lg px-3 py-2 mb-3">
          Venda no cartão/fiado só cancela <b>por inteiro</b> — e, se já houve
          recebimento, estorne antes em Contas a receber.
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="venda_id" value={vendaId} />
        <input type="hidden" name="itens" value={JSON.stringify(escolhidos)} />

        <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
          {itens.map((i) => (
            <div key={i.venda_item_id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-ink truncate">{i.produto_nome}</span>
                <span className="block text-xs text-muted">
                  vendido {formatarQtd(i.quantidade)} · restante {formatarQtd(i.restante)} · {formatarBRL(i.preco_unitario)}
                </span>
              </span>
              <input
                type="number"
                min={0}
                max={i.restante}
                step="any"
                value={qtds[i.venda_item_id] ?? 0}
                onChange={(e) =>
                  setQtds((q) => ({ ...q, [i.venda_item_id]: Number(e.target.value) }))
                }
                aria-label={`Quantidade a devolver de ${i.produto_nome}`}
                className="w-24 min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-right text-base text-ink outline-none focus:border-accent tabular-nums"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={devolverTudo}
          className="self-start text-sm font-semibold text-accent-ink hover:underline"
        >
          Devolver tudo (cancelar a venda)
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">A mercadoria volta ao estoque?</span>
            <select
              value={revendavel ? "sim" : "nao"}
              onChange={(e) => setRevendavel(e.target.value === "sim")}
              className="min-h-[48px] rounded-xl border border-line bg-surface-2 px-3 text-base text-ink outline-none focus:border-accent appearance-none"
            >
              <option value="sim">Sim — volta pro estoque (revendável)</option>
              <option value="nao">Não — estragada/perda (não volta)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Motivo *</span>
            <input
              name="motivo"
              required
              placeholder="Ex.: cliente trocou de ideia"
              className="min-h-[48px] rounded-xl border border-line bg-surface-2 px-3 text-base text-ink outline-none focus:border-accent"
            />
          </label>
        </div>

        {estado.erro && (
          <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
            {estado.erro}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="h-12 rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={enviando || escolhidos.length === 0}
            onClick={(e) => {
              const msg = tudo
                ? `CANCELAR a venda inteira (${formatarBRL(valorDevolver)})?`
                : `Devolver ${formatarBRL(valorDevolver)} desta venda?`;
              if (!confirm(msg)) e.preventDefault();
            }}
            className="h-12 rounded-xl bg-[var(--danger)] text-white px-5 font-bold disabled:opacity-50"
          >
            {enviando
              ? "Processando…"
              : tudo
                ? `Cancelar venda (${formatarBRL(valorDevolver)})`
                : `Devolver ${formatarBRL(valorDevolver)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
