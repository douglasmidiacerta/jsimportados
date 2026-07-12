"use client";

import { useState } from "react";
import { formatarBRL, parseMoedaBR } from "@/lib/formato";

/** Campo de valor em R$ com prévia ao vivo do que será salvo (evita erro de vírgula/ponto). */
export function CampoPreco({
  label,
  name,
  defaultValue,
  dica,
  onValor,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  dica?: string;
  /** Notifica o valor parseado a cada digitação (para margens ao vivo). */
  onValor?: (valor: number) => void;
}) {
  const [texto, setTexto] = useState(defaultValue ?? "");
  const valor = parseMoedaBR(texto);
  const mostrarPreview = texto.trim() !== "" && valor > 0;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <span className="relative flex items-center">
        <span className="absolute left-4 text-muted text-base pointer-events-none">
          R$
        </span>
        <input
          name={name}
          type="text"
          inputMode="decimal"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            onValor?.(parseMoedaBR(e.target.value));
          }}
          placeholder="0,00"
          className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 pl-10 pr-4 text-base text-ink placeholder:text-muted outline-none focus:border-accent focus:bg-surface transition-colors"
        />
      </span>
      {mostrarPreview ? (
        <span className="text-xs text-accent-ink font-medium">
          = {formatarBRL(valor)}
        </span>
      ) : dica ? (
        <span className="text-xs text-muted">{dica}</span>
      ) : null}
    </label>
  );
}
