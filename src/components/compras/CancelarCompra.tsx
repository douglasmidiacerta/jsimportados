"use client";

import { useState, useActionState } from "react";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

/** Cancelar compra (Onda 1): reverte o estoque e cancela a conta a pagar. */
export function CancelarCompra({
  compraId,
  action,
}: {
  compraId: string;
  action: Acao;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, enviando] = useActionState(action, {});

  if (!aberto) {
    return (
      <div className="mt-8 pt-6 border-t border-line">
        <p className="text-sm text-muted mb-2">
          Compra errada? Cancelar reverte a entrada no estoque e cancela a conta
          a pagar (se nada foi pago ainda).
        </p>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="h-11 inline-flex items-center rounded-xl border border-[var(--danger)]/40 text-danger px-4 font-semibold hover:bg-[var(--danger)]/10 transition-colors"
        >
          Cancelar compra
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-line">
      <h2 className="text-lg font-bold text-ink tracking-tight mb-2">Cancelar compra</h2>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="compra_id" value={compraId} />
        <input
          name="motivo"
          required
          placeholder="Motivo (ex.: pedido lançado errado)"
          className="min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent"
        />
        {estado.erro && (
          <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
            {estado.erro}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="h-12 rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={enviando}
            onClick={(e) => {
              if (!confirm("Cancelar esta compra? O estoque será revertido.")) e.preventDefault();
            }}
            className="h-12 rounded-xl bg-[var(--danger)] text-white px-5 font-bold disabled:opacity-60"
          >
            {enviando ? "Cancelando…" : "Confirmar cancelamento"}
          </button>
        </div>
      </form>
    </div>
  );
}
