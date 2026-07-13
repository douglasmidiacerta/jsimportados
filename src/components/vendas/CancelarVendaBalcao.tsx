"use client";

import { useState, useActionState } from "react";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

/**
 * Cancelar a venda pelo balcão (linguagem simples). Cancela a venda INTEIRA;
 * a mercadoria volta pro estoque e o dinheiro sai do caixa como devolução.
 * Devolução de só uma parte é na Gestão.
 */
export function CancelarVendaBalcao({
  vendaId,
  action,
}: {
  vendaId: string;
  action: Acao;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, enviando] = useActionState(action, {});

  if (!aberto) {
    return (
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="text-sm font-semibold text-muted underline decoration-dotted underline-offset-4 hover:text-danger"
        >
          Errou algo? Cancelar esta venda
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-4">
      <h2 className="font-bold text-ink mb-1">Cancelar esta venda</h2>
      <p className="text-sm text-muted mb-3">
        A venda inteira é desfeita: os produtos voltam pro estoque e o dinheiro
        sai do caixa como devolução. Escreva o que aconteceu:
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="venda_id" value={vendaId} />
        <input
          name="motivo"
          required
          placeholder="Ex.: cliente desistiu / marquei o item errado"
          className="min-h-[52px] rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:border-accent"
        />
        {estado.erro && (
          <p className="text-sm text-danger font-medium">{estado.erro}</p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="h-12 flex-1 rounded-xl border border-line font-semibold text-ink hover:bg-surface-2"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={enviando}
            onClick={(e) => {
              if (!confirm("Cancelar a venda inteira?")) e.preventDefault();
            }}
            className="h-12 flex-1 rounded-xl bg-[var(--danger)] text-white font-bold disabled:opacity-60"
          >
            {enviando ? "Cancelando…" : "Cancelar venda"}
          </button>
        </div>
      </form>
    </div>
  );
}
