"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

/**
 * Botão que confirma e dispara uma Server Action com campos escondidos.
 * Usado para estornar pagamento/recebimento e cancelar conta.
 */
export function BotaoEstorno({
  action,
  hidden,
  rotulo,
  confirmar,
  variante = "sutil",
}: {
  action: Acao;
  hidden: Record<string, string>;
  rotulo: string;
  confirmar: string;
  variante?: "sutil" | "perigo";
}) {
  const [estado, formAction, enviando] = useActionState(action, {});

  const classe =
    variante === "perigo"
      ? "h-11 px-4 rounded-xl border border-[var(--danger)]/40 text-danger font-semibold hover:bg-[var(--danger)]/10"
      : "text-xs font-semibold text-muted hover:text-danger underline decoration-dotted underline-offset-2";

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmar)) e.preventDefault();
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" disabled={enviando} className={classe}>
        {enviando ? "…" : rotulo}
      </button>
      {estado.erro && <span className="text-[11px] text-danger">{estado.erro}</span>}
    </form>
  );
}
