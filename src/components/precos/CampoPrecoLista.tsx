"use client";

import { useRef } from "react";
import { numeroParaCampoBR } from "@/lib/formato";

type Acao = (fd: FormData) => Promise<void>;

/**
 * Edita inline o preço de um produto numa lista. Vazio = herda o Varejo.
 * Salva no blur (só se mudou) via Server Action.
 */
export function CampoPrecoLista({
  produtoId,
  listaId,
  override,
  varejo,
  revalidar,
  action,
}: {
  produtoId: string;
  listaId: string;
  override: number | null;
  varejo: number;
  revalidar: string;
  action: Acao;
}) {
  const inicial = override != null ? numeroParaCampoBR(override) : "";
  const formRef = useRef<HTMLFormElement>(null);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <form ref={formRef} action={action} className="flex items-center gap-1">
      <input type="hidden" name="produto_id" value={produtoId} />
      <input type="hidden" name="lista_id" value={listaId} />
      <input type="hidden" name="revalidar" value={revalidar} />
      <span className="text-muted text-sm">R$</span>
      <input
        ref={ref}
        name="preco"
        type="text"
        inputMode="decimal"
        defaultValue={inicial}
        placeholder={numeroParaCampoBR(varejo) || "0,00"}
        onBlur={() => {
          if ((ref.current?.value ?? "") !== inicial) formRef.current?.requestSubmit();
        }}
        className="w-24 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-ink outline-none focus:border-accent tabular-nums"
      />
    </form>
  );
}
