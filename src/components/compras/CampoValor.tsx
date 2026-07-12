"use client";

/** Input de valor controlado, com símbolo (R$, US$, G$) e prévia opcional. */
export function CampoValor({
  label,
  value,
  onChange,
  simbolo = "R$",
  placeholder = "0,00",
  previa,
  dica,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  simbolo?: string;
  placeholder?: string;
  previa?: string;
  dica?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-semibold text-ink">{label}</span>}
      <span className="relative flex items-center">
        <span className="absolute left-3 text-muted text-sm pointer-events-none">
          {simbolo}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 pl-11 pr-3 text-base text-ink placeholder:text-muted outline-none focus:border-accent focus:bg-surface transition-colors"
        />
      </span>
      {previa ? (
        <span className="text-xs text-accent-ink font-medium">{previa}</span>
      ) : dica ? (
        <span className="text-xs text-muted">{dica}</span>
      ) : null}
    </label>
  );
}
