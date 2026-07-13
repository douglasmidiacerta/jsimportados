"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CampoFormulario } from "./CampoFormulario";
import { Interruptor } from "./Interruptor";
import { BotaoSalvar } from "./BotaoSalvar";
import { numeroParaCampoBR, formatarBRL } from "@/lib/formato";
import type { Cliente, ListaPreco, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function FormularioCliente({
  action,
  cliente,
  voltarHref,
  listas,
}: {
  action: Acao;
  cliente?: Cliente;
  voltarHref: string;
  listas?: ListaPreco[]; // Fase 7: quando presente (gestão), mostra aniversário + lista padrão
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <CampoFormulario
          label="Telefone / WhatsApp"
          name="telefone"
          type="tel"
          inputMode="tel"
          defaultValue={cliente?.telefone ?? ""}
          placeholder="Ex.: (11) 90000-0000"
        />
        <CampoFormulario
          label="E-mail (opcional)"
          name="email"
          type="email"
          inputMode="email"
          defaultValue={cliente?.email ?? ""}
          placeholder="cliente@exemplo.com"
        />
      </div>
      <CampoFormulario
        label="CPF / CNPJ (opcional)"
        name="documento"
        inputMode="numeric"
        defaultValue={cliente?.documento ?? ""}
        placeholder="Só números"
      />

      {listas && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CampoFormulario
              label="Aniversário (opcional)"
              name="aniversario"
              type="date"
              defaultValue={cliente?.aniversario ?? ""}
            />
            <CampoFormulario
              label="Lista de preço padrão"
              name="lista_preco_id"
              as="select"
              defaultValue={cliente?.lista_preco_id ?? ""}
              opcaoVazia="Padrão (Varejo)"
              opcoes={listas
                .filter((l) => !l.is_default)
                .map((l) => ({ valor: l.id, rotulo: l.nome }))}
              dica="Usada automaticamente na venda deste cliente"
            />
          </div>

          {/* ---- Endereço (Cliente 2.0) ---- */}
          <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
            <legend className="px-2 text-sm font-bold text-ink uppercase tracking-wide">Endereço</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CampoFormulario label="CEP" name="cep" inputMode="numeric" defaultValue={cliente?.cep ?? ""} placeholder="00000-000" />
              <div className="sm:col-span-2">
                <CampoFormulario label="Logradouro" name="logradouro" defaultValue={cliente?.logradouro ?? ""} placeholder="Rua, avenida…" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CampoFormulario label="Número" name="numero" defaultValue={cliente?.numero ?? ""} placeholder="123" />
              <CampoFormulario label="Complemento" name="complemento" defaultValue={cliente?.complemento ?? ""} placeholder="Apto, bloco…" />
              <CampoFormulario label="Bairro" name="bairro" defaultValue={cliente?.bairro ?? ""} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <CampoFormulario label="Cidade" name="cidade" defaultValue={cliente?.cidade ?? ""} />
              </div>
              <CampoFormulario label="UF" name="uf" defaultValue={cliente?.uf ?? ""} placeholder="SP" />
            </div>
          </fieldset>

          {/* ---- Crédito / fiado (Leva D) ---- */}
          <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
            <legend className="px-2 text-sm font-bold text-ink uppercase tracking-wide">Crédito (fiado)</legend>
            {cliente && (cliente.saldo_devedor ?? 0) > 0 && (
              <p className="text-sm text-amber bg-[var(--amber-soft)] border border-[color:var(--amber)]/30 rounded-lg px-3 py-2">
                Este cliente deve <b>{formatarBRL(cliente.saldo_devedor ?? 0)}</b> em fiado no momento.
              </p>
            )}
            <CampoFormulario
              label="Limite de crédito (opcional)"
              name="limite_credito"
              type="text"
              inputMode="decimal"
              prefixo="R$"
              defaultValue={cliente?.limite_credito != null ? numeroParaCampoBR(cliente.limite_credito) : ""}
              placeholder="Sem limite"
              dica="Máximo que o cliente pode dever em fiado. Vazio = sem limite."
            />
            <Interruptor
              name="bloqueado"
              titulo="Bloquear para fiado"
              descricao="Ligado: o sistema não deixa vender fiado para este cliente (dinheiro, Pix e cartão continuam normais)."
              avisoDesligado=""
              defaultLigado={cliente?.situacao === "bloqueado"}
            />
          </fieldset>
        </>
      )}

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
