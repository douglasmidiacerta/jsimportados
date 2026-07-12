"use client";

import { useState } from "react";

/**
 * Interruptor liga/desliga que reporta o estado num input oculto ("true"/"false").
 * Mostra um aviso opcional quando desligado (ex.: "produto INATIVO na loja").
 */
export function Interruptor({
  name,
  titulo,
  descricao,
  avisoDesligado,
  defaultLigado = false,
}: {
  name: string;
  titulo: string;
  descricao?: string;
  avisoDesligado?: string;
  defaultLigado?: boolean;
}) {
  const [ligado, setLigado] = useState(defaultLigado);

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <input type="hidden" name={name} value={ligado ? "true" : "false"} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{titulo}</span>
          {descricao && (
            <span className="block text-xs text-muted mt-0.5">{descricao}</span>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={ligado}
          aria-label={titulo}
          onClick={() => setLigado((v) => !v)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2 ${
            ligado ? "bg-accent" : "bg-surface-3 border border-line"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              ligado ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {!ligado && avisoDesligado && (
        <p className="mt-3 text-xs font-medium text-amber bg-[var(--amber-soft)] border border-[color:var(--amber)]/30 rounded-lg px-3 py-2">
          {avisoDesligado}
        </p>
      )}
    </div>
  );
}
