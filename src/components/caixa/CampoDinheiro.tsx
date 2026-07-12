"use client";

import { formatarBRL, parseMoedaBR } from "@/lib/formato";

/** Input de dinheiro GIGANTE (para a operadora leiga). Controlado; submete por `name`. */
export function CampoDinheiro({
  name,
  value,
  onChange,
  label,
  placeholder = "0,00",
  autoFocus,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const valor = parseMoedaBR(value);
  return (
    <label className="flex flex-col gap-2">
      {label && (
        <span className="text-base font-semibold text-ink text-center">{label}</span>
      )}
      <span className="relative flex items-center justify-center">
        <span className="absolute left-4 text-2xl text-muted pointer-events-none">R$</span>
        <input
          name={name}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-20 rounded-2xl border border-line bg-surface-2 pl-16 pr-4 text-center text-4xl font-extrabold text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:bg-surface transition-colors tabular-nums"
        />
      </span>
      {valor > 0 && (
        <span className="text-sm text-muted text-center">= {formatarBRL(valor)}</span>
      )}
    </label>
  );
}
