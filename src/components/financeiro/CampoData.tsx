/** Input de data nativo no design system (YYYY-MM-DD). */
export function CampoData({
  label,
  name,
  defaultValue,
  dica,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  dica?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent focus:bg-surface transition-colors"
      />
      {dica && <span className="text-xs text-muted">{dica}</span>}
    </label>
  );
}

export const FORMAS_FINANCEIRAS: { valor: string; rotulo: string }[] = [
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "pix", rotulo: "Pix" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "boleto", rotulo: "Boleto" },
  { valor: "outro", rotulo: "Outro" },
];
