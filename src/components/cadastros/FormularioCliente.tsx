"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CampoFormulario } from "./CampoFormulario";
import { BotaoSalvar } from "./BotaoSalvar";
import type { Cliente, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function FormularioCliente({
  action,
  cliente,
  voltarHref,
}: {
  action: Acao;
  cliente?: Cliente;
  voltarHref: string;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <CampoFormulario
        label="Nome do cliente"
        name="nome"
        defaultValue={cliente?.nome}
        placeholder="Ex.: Maria Silva"
        required
      />
      <CampoFormulario
        label="Telefone / WhatsApp"
        name="telefone"
        type="tel"
        inputMode="tel"
        defaultValue={cliente?.telefone ?? ""}
        placeholder="Ex.: (11) 90000-0000"
      />
      <CampoFormulario
        label="CPF / CNPJ (opcional)"
        name="documento"
        inputMode="numeric"
        defaultValue={cliente?.documento ?? ""}
        placeholder="Só números"
      />
      <CampoFormulario
        label="Observações"
        name="observacoes"
        as="textarea"
        defaultValue={cliente?.observacoes ?? ""}
        placeholder="Anotações (opcional)"
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
          {cliente ? "Salvar alterações" : "Cadastrar cliente"}
        </BotaoSalvar>
      </div>
    </form>
  );
}
