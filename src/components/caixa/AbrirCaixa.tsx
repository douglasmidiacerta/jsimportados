"use client";

import { useActionState, useState } from "react";
import { CampoDinheiro } from "./CampoDinheiro";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function AbrirCaixa({ action }: { action: Acao }) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [valor, setValor] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-soft text-accent-ink grid place-items-center mb-3">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
        </div>
        <h2 className="text-xl font-extrabold text-ink">Abrir o caixa</h2>
        <p className="text-muted mt-1">
          Quanto tem de dinheiro na gaveta agora, para começar o dia?
        </p>
      </div>

      <CampoDinheiro
        name="valor"
        value={valor}
        onChange={setValor}
        label="Dinheiro na gaveta"
        autoFocus
      />

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2 text-center">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-16 rounded-2xl bg-accent text-white text-xl font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
      >
        {enviando ? "Abrindo…" : "Abrir o caixa"}
      </button>
    </form>
  );
}
