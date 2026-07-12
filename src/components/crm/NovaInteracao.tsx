"use client";

import { useActionState, useState } from "react";
import { TIPOS_INTERACAO, type EstadoForm, type CrmTipo } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function NovaInteracao({
  clienteId,
  action,
}: {
  clienteId: string;
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [tipo, setTipo] = useState<CrmTipo>("nota");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-4">
      <input type="hidden" name="cliente_id" value={clienteId} />

      <div className="flex flex-wrap gap-2">
        {TIPOS_INTERACAO.map((t) => (
          <button
            key={t.valor}
            type="button"
            onClick={() => setTipo(t.valor)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              tipo === t.valor
                ? "bg-accent text-white border-accent"
                : "bg-surface text-muted border-line hover:text-ink"
            }`}
          >
            {t.rotulo}
          </button>
        ))}
      </div>
      <input type="hidden" name="tipo" value={tipo} />

      <textarea
        name="texto"
        rows={2}
        placeholder={tipo === "lembrete" ? "Do que lembrar?" : "Anotação sobre o cliente…"}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-muted outline-none focus:border-accent resize-y"
      />

      {tipo === "lembrete" && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">Quando lembrar</span>
          <input
            type="date"
            name="lembrete_em"
            className="min-h-[48px] rounded-xl border border-line bg-surface px-4 text-ink outline-none focus:border-accent"
          />
        </label>
      )}

      {estado.erro && (
        <p className="text-sm text-danger font-medium">{estado.erro}</p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-12 rounded-xl bg-accent text-white font-bold self-start px-5 active:scale-[0.99] disabled:opacity-60"
      >
        {enviando ? "Salvando…" : "Adicionar"}
      </button>
    </form>
  );
}
