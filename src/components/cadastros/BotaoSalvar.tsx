"use client";

/** Botão de submit grande e consistente para os formulários de cadastro. */
export function BotaoSalvar({
  enviando,
  children = "Salvar",
}: {
  enviando: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={enviando}
      className="h-14 rounded-xl bg-accent text-white text-lg font-bold tracking-tight shadow-[var(--shadow)] transition-transform active:scale-[0.99] disabled:opacity-60"
    >
      {enviando ? "Salvando…" : children}
    </button>
  );
}
