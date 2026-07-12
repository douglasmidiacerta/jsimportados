"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CampoFormulario } from "@/components/cadastros/CampoFormulario";
import { BotaoSalvar } from "@/components/cadastros/BotaoSalvar";
import type { EstadoForm, ListaPreco } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function FormularioLista({
  action,
  lista,
  voltarHref,
}: {
  action: Acao;
  lista?: ListaPreco;
  voltarHref: string;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {lista && <input type="hidden" name="id" value={lista.id} />}
      <CampoFormulario
        label="Nome da lista"
        name="nome"
        defaultValue={lista?.nome}
        placeholder="Ex.: Atacado"
        required
      />
      <CampoFormulario
        label="Ordem (menor aparece primeiro)"
        name="ordem"
        type="number"
        inputMode="numeric"
        defaultValue={lista?.ordem ?? 100}
      />
      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link
          href={voltarHref}
          className="h-14 sm:h-12 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2"
        >
          Cancelar
        </Link>
        <BotaoSalvar enviando={enviando}>
          {lista ? "Salvar" : "Criar lista"}
        </BotaoSalvar>
      </div>
    </form>
  );
}
