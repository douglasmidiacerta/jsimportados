/** Faixa de aviso de erro (ex.: falha ao arquivar/reativar). Renderiza nada se sem mensagem. */
export function AvisoErro({ mensagem }: { mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <p className="mb-5 text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
      {mensagem}
    </p>
  );
}

/** Mensagem padrão quando arquivar/reativar falha (ex.: colisão de nome ao reativar). */
export function mensagemAtivo(erro?: string): string | undefined {
  if (erro === "ativo") {
    return "Não deu para concluir. Pode já existir outro item ativo com esse nome — renomeie ou arquive o outro antes de reativar.";
  }
  return undefined;
}
