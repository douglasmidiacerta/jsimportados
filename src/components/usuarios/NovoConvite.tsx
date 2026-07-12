"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function NovoConvite({ action }: { action: Acao }) {
  const [estado, formAction, enviando] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          name="email"
          type="email"
          placeholder="email@da-pessoa.com"
          className="flex-1 min-h-[48px] rounded-xl border border-line bg-surface px-4 text-ink placeholder:text-muted outline-none focus:border-accent"
        />
        <select
          name="papel"
          defaultValue="operacao"
          className="min-h-[48px] rounded-xl border border-line bg-surface px-4 text-ink outline-none focus:border-accent appearance-none"
        >
          <option value="operacao">Operação (balcão)</option>
          <option value="gestao">Gestão</option>
        </select>
        <button
          type="submit"
          disabled={enviando}
          className="h-12 px-5 rounded-xl bg-accent text-white font-bold disabled:opacity-60"
        >
          {enviando ? "…" : "Convidar"}
        </button>
      </div>
      {estado.erro && <p className="text-sm text-danger">{estado.erro}</p>}
      <p className="text-xs text-muted">
        A pessoa cria a própria senha em <b>Criar conta</b> usando exatamente este e-mail.
      </p>
    </form>
  );
}
