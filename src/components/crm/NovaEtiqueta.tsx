"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

const CORES: { valor: string; classe: string }[] = [
  { valor: "accent", classe: "bg-accent" },
  { valor: "good", classe: "bg-good" },
  { valor: "amber", classe: "bg-[var(--amber)]" },
  { valor: "danger", classe: "bg-danger" },
];

export function NovaEtiqueta({
  clienteId,
  action,
}: {
  clienteId: string;
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [cor, setCor] = useState("accent");

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="cor" value={cor} />
      <input
        name="nome"
        placeholder="Nova etiqueta…"
        className="flex-1 min-w-[120px] h-10 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent"
      />
      <div className="flex items-center gap-1">
        {CORES.map((c) => (
          <button
            key={c.valor}
            type="button"
            onClick={() => setCor(c.valor)}
            aria-label={c.valor}
            className={`w-6 h-6 rounded-full ${c.classe} ${cor === c.valor ? "ring-2 ring-offset-1 ring-ink" : ""}`}
          />
        ))}
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="h-10 px-3 rounded-lg bg-accent text-white text-sm font-bold disabled:opacity-60"
      >
        {enviando ? "…" : "Criar"}
      </button>
      {estado.erro && <span className="text-xs text-danger w-full">{estado.erro}</span>}
    </form>
  );
}
