"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

/** Upload de um arquivo OFX/CSV para importar o extrato de uma conta. */
export function FormularioImportarExtrato({
  contaId,
  action,
}: {
  contaId: string;
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [nomeArquivo, setNomeArquivo] = useState("");

  return (
    <form action={formAction} className="rounded-2xl border border-line bg-surface p-4 flex flex-col gap-3">
      <input type="hidden" name="conta_id" value={contaId} />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <label className="flex-1 cursor-pointer">
          <span className="sr-only">Arquivo do extrato</span>
          <input
            type="file"
            name="arquivo"
            accept=".ofx,.csv,.txt,text/csv,application/x-ofx"
            onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? "")}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:text-accent-ink file:px-4 file:py-2.5 file:font-semibold file:cursor-pointer"
          />
        </label>
        <button
          type="submit"
          disabled={enviando}
          className="h-11 rounded-xl bg-accent text-white px-5 font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
        >
          {enviando ? "Importando…" : "Importar extrato"}
        </button>
      </div>
      {nomeArquivo && <p className="text-xs text-muted">Arquivo: {nomeArquivo}</p>}
      <p className="text-xs text-muted">
        Exporte o extrato do seu banco no formato <b>OFX</b> (recomendado) ou{" "}
        <b>CSV</b>. Linhas repetidas são ignoradas automaticamente.
      </p>
      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
