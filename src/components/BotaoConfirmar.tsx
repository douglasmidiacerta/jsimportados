"use client";

type Acao = (fd: FormData) => Promise<void>;

/** Form com confirmação para Server Actions void (ex.: apagar). */
export function BotaoConfirmar({
  action,
  hidden,
  rotulo,
  confirmar,
  className,
  variante,
}: {
  action: Acao;
  hidden: Record<string, string>;
  rotulo: string;
  confirmar: string;
  className?: string;
  variante?: "sutil" | "perigo";
}) {
  const classe =
    className ??
    (variante === "perigo"
      ? "h-9 px-3 rounded-lg border border-[var(--danger)]/40 text-danger text-sm font-semibold hover:bg-[var(--danger)]/10"
      : "text-xs font-semibold text-muted hover:text-danger underline decoration-dotted underline-offset-2");
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmar)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={classe}>
        {rotulo}
      </button>
    </form>
  );
}
