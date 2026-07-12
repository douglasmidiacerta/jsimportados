"use client";

import { useActionState, useState } from "react";
import { CampoDinheiro } from "./CampoDinheiro";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function MovimentoCaixa({
  tipo,
  action,
  onCancelar,
}: {
  tipo: "sangria" | "suprimento";
  action: Acao;
  onCancelar: () => void;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [valor, setValor] = useState("");
  const v = parseMoedaBR(valor);
  const ehSangria = tipo === "sangria";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-ink">
          {ehSangria ? "Tirar dinheiro" : "Colocar dinheiro"}
        </h2>
        <p className="text-muted mt-1">
          {ehSangria
            ? "Quanto você está tirando da gaveta?"
            : "Quanto você está colocando na gaveta?"}
        </p>
      </div>

      <CampoDinheiro name="valor" value={valor} onChange={setValor} autoFocus />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Motivo (opcional)</span>
        <input
          name="observacoes"
          type="text"
          placeholder={ehSangria ? "Ex.: pagamento de frete" : "Ex.: troco"}
          className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink placeholder:text-muted outline-none focus:border-accent"
        />
      </label>

      {ehSangria && (
        <p className="text-xs text-muted bg-surface-2 border border-line rounded-lg px-3 py-2">
          Confira o dinheiro antes de tirar. Se tirar mais do que tem na gaveta,
          o fechamento vai mostrar a diferença.
        </p>
      )}
      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2 text-center">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="h-14 sm:flex-1 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando || v <= 0}
          className="h-14 sm:flex-1 rounded-xl bg-accent text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
        >
          {enviando ? "Salvando…" : "Confirmar"}
        </button>
      </div>
    </form>
  );
}
