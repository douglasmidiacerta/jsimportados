"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CampoFormulario } from "./CampoFormulario";
import { BotaoSalvar } from "./BotaoSalvar";
import type { Fornecedor, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function FormularioFornecedor({
  action,
  fornecedor,
  voltarHref,
}: {
  action: Acao;
  fornecedor?: Fornecedor;
  voltarHref: string;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {fornecedor && <input type="hidden" name="id" value={fornecedor.id} />}

      <CampoFormulario
        label="Nome do fornecedor"
        name="nome"
        defaultValue={fornecedor?.nome}
        placeholder="Ex.: Loja do Paraguai Ltda."
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <CampoFormulario
          label="Contato (pessoa)"
          name="contato"
          defaultValue={fornecedor?.contato ?? ""}
          placeholder="Ex.: Carlos"
        />
        <CampoFormulario
          label="Telefone / WhatsApp"
          name="telefone"
          type="tel"
          inputMode="tel"
          defaultValue={fornecedor?.telefone ?? ""}
          placeholder="Ex.: +595 ..."
        />
        <CampoFormulario
          label="Cidade"
          name="cidade"
          defaultValue={fornecedor?.cidade ?? ""}
          placeholder="Ex.: Ciudad del Este"
        />
        <CampoFormulario
          label="País"
          name="pais"
          defaultValue={fornecedor?.pais ?? "Paraguai"}
        />
      </div>
      <CampoFormulario
        label="Observações"
        name="observacoes"
        as="textarea"
        defaultValue={fornecedor?.observacoes ?? ""}
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
          {fornecedor ? "Salvar alterações" : "Cadastrar fornecedor"}
        </BotaoSalvar>
      </div>
    </form>
  );
}
