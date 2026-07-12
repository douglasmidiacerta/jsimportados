"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CampoFormulario } from "./CampoFormulario";
import { BotaoSalvar } from "./BotaoSalvar";
import type { Categoria, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function FormularioCategoria({
  action,
  categoria,
  voltarHref,
}: {
  action: Acao;
  categoria?: Categoria;
  voltarHref: string;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {categoria && <input type="hidden" name="id" value={categoria.id} />}

      <CampoFormulario
        label="Nome da categoria"
        name="nome"
        defaultValue={categoria?.nome}
        placeholder="Ex.: Perfumes"
        required
      />

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link
          href={voltarHref}
          className="h-14 sm:h-12 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          Cancelar
        </Link>
        <BotaoSalvar enviando={enviando}>
          {categoria ? "Salvar" : "Criar categoria"}
        </BotaoSalvar>
      </div>
    </form>
  );
}
