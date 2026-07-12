"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CampoFormulario } from "./CampoFormulario";
import { Interruptor } from "./Interruptor";
import { ListaEditavel, type CampoLista } from "./ListaEditavel";
import { DocumentosFornecedor } from "./DocumentosFornecedor";
import { BotaoSalvar } from "./BotaoSalvar";
import type { FornecedorDetalhe, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

const CAMPOS_ENDERECO: CampoLista[] = [
  { name: "cep", label: "CEP" },
  { name: "logradouro", label: "Endereço", larguraCompleta: true },
  { name: "numero", label: "Nº" },
  { name: "complemento", label: "Complemento" },
  { name: "bairro", label: "Bairro" },
  { name: "cidade", label: "Cidade" },
  { name: "uf", label: "UF" },
  { name: "exterior", label: "Endereço no exterior", tipo: "checkbox" },
];
const CAMPOS_CONTATO: CampoLista[] = [
  { name: "nome", label: "Nome" },
  { name: "cargo", label: "Cargo" },
  { name: "telefone", label: "Telefone", tipo: "tel" },
  { name: "email", label: "Email", tipo: "email" },
];
const CAMPOS_BANCO: CampoLista[] = [
  {
    name: "tipo",
    label: "Tipo",
    tipo: "select",
    opcoes: [
      { valor: "corrente", rotulo: "Conta corrente" },
      { valor: "poupanca", rotulo: "Poupança" },
    ],
  },
  { name: "banco", label: "Banco" },
  { name: "agencia", label: "Agência" },
  { name: "agencia_digito", label: "Dígito (ag.)" },
  { name: "conta", label: "Conta" },
  { name: "conta_digito", label: "Dígito (conta)" },
];

export function FormularioFornecedor({
  action,
  fornecedor,
  voltarHref,
}: {
  action: Acao;
  fornecedor?: FornecedorDetalhe;
  voltarHref: string;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [tipoPessoa, setTipoPessoa] = useState<"fisica" | "juridica">(
    fornecedor?.tipo_pessoa ?? "juridica",
  );
  const pj = tipoPessoa === "juridica";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {fornecedor && <input type="hidden" name="id" value={fornecedor.id} />}
      <input type="hidden" name="tipo_pessoa" value={tipoPessoa} />

      {/* Ficha cadastral */}
      <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
        <legend className="px-2 text-sm font-bold text-ink uppercase tracking-wide">
          Ficha cadastral
        </legend>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Pessoa</span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-2 border border-line">
            {(["juridica", "fisica"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoPessoa(t)}
                className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                  tipoPessoa === t ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-muted"
                }`}
              >
                {t === "juridica" ? "Jurídica" : "Física"}
              </button>
            ))}
          </div>
        </div>

        <CampoFormulario
          label={pj ? "Nome / Apelido do fornecedor" : "Nome"}
          name="nome"
          defaultValue={fornecedor?.nome}
          placeholder="Ex.: Loja do Paraguai"
          required
        />

        {pj && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CampoFormulario label="Razão Social" name="razao_social" defaultValue={fornecedor?.razao_social ?? ""} />
            <CampoFormulario label="Nome Fantasia" name="nome_fantasia" defaultValue={fornecedor?.nome_fantasia ?? ""} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoFormulario
            label={pj ? "CNPJ" : "CPF"}
            name="documento"
            defaultValue={fornecedor?.documento ?? ""}
            placeholder={pj ? "00.000.000/0000-00" : "000.000.000-00"}
            inputMode="numeric"
          />
          <CampoFormulario
            label="Situação"
            name="situacao"
            as="select"
            defaultValue={fornecedor?.situacao ?? "geral"}
            opcoes={[
              { valor: "geral", rotulo: "Geral" },
              { valor: "bloqueado", rotulo: "Bloqueado" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoFormulario label="Telefone" name="telefone" type="tel" inputMode="tel" defaultValue={fornecedor?.telefone ?? ""} placeholder="Ex.: +595 ..." />
          <CampoFormulario label="Celular / WhatsApp" name="celular" type="tel" inputMode="tel" defaultValue={fornecedor?.celular ?? ""} />
          <CampoFormulario label="Email" name="email" type="email" inputMode="email" defaultValue={fornecedor?.email ?? ""} />
          <CampoFormulario label="Site" name="site" defaultValue={fornecedor?.site ?? ""} placeholder="http://www.site.com.br" />
          <CampoFormulario label="Contato (pessoa)" name="contato" defaultValue={fornecedor?.contato ?? ""} placeholder="Ex.: Carlos" />
          <CampoFormulario label="Cidade" name="cidade" defaultValue={fornecedor?.cidade ?? ""} placeholder="Ex.: Ciudad del Este" />
          <CampoFormulario label="País" name="pais" defaultValue={fornecedor?.pais ?? "Paraguai"} />
        </div>

        <Interruptor
          name="eh_transportadora"
          titulo="É transportadora?"
          descricao="Marque se este fornecedor também faz o transporte."
          defaultLigado={fornecedor?.eh_transportadora ?? false}
        />

        <CampoFormulario label="Observação" name="observacoes" as="textarea" defaultValue={fornecedor?.observacoes ?? ""} placeholder="Anotações (opcional)" />
      </fieldset>

      {/* Coleções */}
      <ListaEditavel
        name="enderecos"
        titulo="Endereços"
        campos={CAMPOS_ENDERECO}
        valorInicial={fornecedor?.enderecos as unknown as Record<string, string | boolean>[]}
        textoVazio="Nenhum endereço informado para este fornecedor até o momento."
        rotuloAdd="Adicionar endereço"
      />
      <ListaEditavel
        name="contatos"
        titulo="Contatos"
        campos={CAMPOS_CONTATO}
        valorInicial={fornecedor?.contatos as unknown as Record<string, string | boolean>[]}
        textoVazio="Nenhum contato informado para este fornecedor até o momento."
        rotuloAdd="Adicionar contato"
      />
      <ListaEditavel
        name="bancos"
        titulo="Dados bancários"
        campos={CAMPOS_BANCO}
        valorInicial={fornecedor?.bancos as unknown as Record<string, string | boolean>[]}
        textoVazio="Nenhum dado bancário informado para este fornecedor até o momento."
        rotuloAdd="Adicionar conta"
      />
      <DocumentosFornecedor name="documentos" valorInicial={fornecedor?.documentos} />

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
