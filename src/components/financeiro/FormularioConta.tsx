"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CampoFormulario } from "@/components/cadastros/CampoFormulario";
import { Interruptor } from "@/components/cadastros/Interruptor";
import { BotaoSalvar } from "@/components/cadastros/BotaoSalvar";
import { numeroParaCampoBR } from "@/lib/formato";
import type { ContaFinanceira, Maquininha, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

/**
 * Formulário de conta financeira (banco / maquininha / outro). Na edição o
 * saldo inicial vira somente-leitura (o banco bloqueia alterá-lo — acerto é
 * feito por lançamento de ajuste no extrato da conta).
 */
export function FormularioConta({
  action,
  conta,
  maquininhas,
  ehPadrao = false,
}: {
  action: Acao;
  conta?: ContaFinanceira;
  maquininhas: Maquininha[];
  ehPadrao?: boolean;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [tipo, setTipo] = useState<ContaFinanceira["tipo"]>(conta?.tipo ?? "banco");
  const editando = Boolean(conta);

  // maquininhas ainda sem conta (para o select de vínculo); mantém a atual.
  const maqOpcoes = maquininhas
    .filter((m) => m.ativo || m.id === conta?.maquininha_id)
    .map((m) => ({ valor: m.id, rotulo: m.nome }));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {conta && <input type="hidden" name="id" value={conta.id} />}
      <input type="hidden" name="tipo" value={tipo} />

      <CampoFormulario
        label="Nome da conta"
        name="nome"
        defaultValue={conta?.nome}
        placeholder="Ex.: Nubank PJ, Stone da loja"
        required
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Tipo</span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: "banco", r: "Banco" },
              { v: "adquirente", r: "Maquininha" },
              { v: "outro", r: "Outro" },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setTipo(o.v)}
              className={`h-11 rounded-xl border font-semibold text-sm transition-colors ${
                tipo === o.v
                  ? "bg-accent-soft text-accent-ink border-accent"
                  : "bg-surface-2 text-ink border-line"
              }`}
            >
              {o.r}
            </button>
          ))}
        </div>
      </label>

      {tipo === "adquirente" && (
        <CampoFormulario
          label="Maquininha vinculada"
          name="maquininha_id"
          as="select"
          defaultValue={conta?.maquininha_id ?? ""}
          opcoes={maqOpcoes}
          opcaoVazia="— escolha a maquininha —"
          dica="A conta da adquirente onde caem os recebíveis dessa maquininha."
        />
      )}

      {tipo === "banco" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CampoFormulario label="Banco (opcional)" name="banco" defaultValue={conta?.banco ?? ""} placeholder="Ex.: Nubank" />
            <CampoFormulario label="Agência (opcional)" name="agencia" defaultValue={conta?.agencia ?? ""} placeholder="0001" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CampoFormulario label="Conta (opcional)" name="numero_conta" defaultValue={conta?.numero_conta ?? ""} placeholder="12345-6" />
            <CampoFormulario label="Chave Pix (opcional)" name="chave_pix" defaultValue={conta?.chave_pix ?? ""} placeholder="CNPJ, e-mail…" />
          </div>
          <Interruptor
            name="recebe_pix"
            titulo="É a conta que recebe os Pix?"
            descricao="O Pix das vendas cai aqui. Só uma conta pode ter isso ligado."
            defaultLigado={conta?.recebe_pix ?? false}
          />
        </>
      )}

      {!editando ? (
        <CampoFormulario
          label="Saldo inicial de hoje"
          name="saldo_inicial"
          type="text"
          inputMode="decimal"
          defaultValue={conta ? numeroParaCampoBR(conta.saldo_inicial) : ""}
          placeholder="0,00"
          prefixo="R$"
          dica="Quanto tem nessa conta agora. Depois o saldo anda sozinho com as vendas e lançamentos."
        />
      ) : (
        <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Saldo inicial (fixo)</span>
            <span className="font-semibold text-ink tabular-nums">
              R$ {numeroParaCampoBR(conta!.saldo_inicial)}
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Não dá para editar o saldo inicial. Para acertar, faça um lançamento
            de ajuste no extrato da conta.
          </p>
        </div>
      )}

      <Interruptor
        name="conta_padrao"
        titulo="Usar como conta padrão das liquidações"
        descricao="Recebimentos de cartão/fiado e pagamentos (não-dinheiro) entram nesta conta."
        defaultLigado={ehPadrao}
      />

      <CampoFormulario
        label="Observações (opcional)"
        name="observacoes"
        as="textarea"
        defaultValue={conta?.observacoes ?? ""}
        placeholder="Anotações internas"
      />

      {editando && (
        <Interruptor
          name="ativo"
          titulo="Conta ativa"
          descricao="Contas inativas somem dos seletores, mas o histórico é preservado."
          avisoDesligado="Esta conta está INATIVA — não aparece nas transferências nem como padrão."
          defaultLigado={conta?.ativo ?? true}
        />
      )}

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link
          href="/gestao/contas"
          className="h-14 sm:h-12 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          Cancelar
        </Link>
        <BotaoSalvar enviando={enviando}>
          {editando ? "Salvar alterações" : "Criar conta"}
        </BotaoSalvar>
      </div>
    </form>
  );
}
