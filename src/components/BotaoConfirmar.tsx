"use client";

type Acao = (fd: FormData) => Promise<void>;

/** Form com confirmação para Server Actions void (ex.: apagar). */
export function BotaoConfirmar({
  action,
  hidden,
  rotulo,
  confirmar,
  className,
}: {
  action: Acao;
  hidden: Record<string, string>;
  rotulo: string;
  confirmar: string;
  className?: string;
}) {
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
      <button
        type="submit"
        className={
          className ??
          "text-xs font-semibold text-muted hover:text-danger underline decoration-dotted underline-offset-2"
        }
      >
        {rotulo}
      </button>
    </form>
  );
}
