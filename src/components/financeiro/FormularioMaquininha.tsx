"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CampoFormulario } from "@/components/cadastros/CampoFormulario";
import { Interruptor } from "@/components/cadastros/Interruptor";
import { BotaoSalvar } from "@/components/cadastros/BotaoSalvar";
import { parseMoedaBR, numeroParaCampoBR } from "@/lib/formato";
import type { Maquininha, MaquininhaTaxa, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
type Linha = {
  modalidade: "debito" | "credito";
  parcelas: number;
  percentual: string;
  prazo: string;
};

/** Linhas padrão: débito 1x + crédito 1..18x (o dono preenche as que usar). */
function linhasPadrao(taxas: MaquininhaTaxa[]): Linha[] {
  const achar = (mod: "debito" | "credito", p: number) =>
    taxas.find((t) => t.modalidade === mod && t.parcelas === p);
  const linhas: Linha[] = [];
  const deb = achar("debito", 1);
  linhas.push({
    modalidade: "debito",
    parcelas: 1,
    percentual: deb ? numeroParaCampoBR(deb.percentual) : "",
    prazo: deb ? String(deb.prazo_dias) : "1",
  });
  for (let p = 1; p <= 18; p++) {
    const c = achar("credito", p);
    linhas.push({
      modalidade: "credito",
      parcelas: p,
      percentual: c ? numeroParaCampoBR(c.percentual) : "",
      prazo: c ? String(c.prazo_dias) : "30",
    });
  }
  return linhas;
}

export function FormularioMaquininha({
  action,
  maquininha,
  taxas = [],
}: {
  action: Acao;
  maquininha?: Maquininha;
  taxas?: MaquininhaTaxa[];
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [linhas, setLinhas] = useState<Linha[]>(linhasPadrao(taxas));
  const editando = Boolean(maquininha);

  function set(i: number, campo: "percentual" | "prazo", v: string) {
    setLinhas((arr) => arr.map((l, j) => (j === i ? { ...l, [campo]: v } : l)));
  }

  // só envia linhas com MDR de verdade (o prazo tem valor padrão e não conta);
  // as em branco caem no fallback (taxas_cartao). O backend refiltra.
  const payloadTaxas = linhas
    .filter((l) => parseMoedaBR(l.percentual) > 0)
    .map((l) => ({
      modalidade: l.modalidade,
      parcelas: l.parcelas,
      percentual: parseMoedaBR(l.percentual),
      prazo_dias: Math.max(0, Math.floor(Number(l.prazo) || 0)),
    }));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {maquininha && <input type="hidden" name="id" value={maquininha.id} />}
      <input type="hidden" name="taxas" value={JSON.stringify(payloadTaxas)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CampoFormulario
          label="Nome da maquininha"
          name="nome"
          defaultValue={maquininha?.nome}
          placeholder="Ex.: Stone da loja"
          required
        />
        <CampoFormulario
          label="Adquirente (opcional)"
          name="adquirente"
          defaultValue={maquininha?.adquirente ?? ""}
          placeholder="Ex.: Stone, PagSeguro, Cielo"
        />
      </div>

      <div>
        <span className="text-sm font-semibold text-ink">Taxas desta maquininha (MDR)</span>
        <p className="text-xs text-muted mt-1 mb-2">
          Preencha só as parcelas que você usa. O que ficar em branco cai na taxa
          geral do sistema. “Cai em (dias)” é quando o dinheiro entra.
        </p>
        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                  <th className="text-left font-semibold px-3 py-2">Modalidade</th>
                  <th className="text-right font-semibold px-3 py-2">Taxa (%)</th>
                  <th className="text-right font-semibold px-3 py-2">Cai em (dias)</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={`${l.modalidade}-${l.parcelas}`} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-ink font-medium">
                      {l.modalidade === "debito" ? "Débito" : `Crédito ${l.parcelas}x`}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={l.percentual}
                        onChange={(e) => set(i, "percentual", e.target.value)}
                        placeholder="—"
                        className="w-20 text-right rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-ink outline-none focus:border-accent"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={l.prazo}
                        onChange={(e) => set(i, "prazo", e.target.value)}
                        className="w-16 text-right rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-ink outline-none focus:border-accent"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CampoFormulario
        label="Observações (opcional)"
        name="observacoes"
        as="textarea"
        defaultValue={maquininha?.observacoes ?? ""}
        placeholder="Anotações internas"
      />

      {editando && (
        <Interruptor
          name="ativo"
          titulo="Maquininha ativa"
          descricao="Inativas somem do PDV, mas o histórico é preservado."
          avisoDesligado="Esta maquininha está INATIVA — não aparece na hora de vender no cartão."
          defaultLigado={maquininha?.ativo ?? true}
        />
      )}

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link
          href="/gestao/maquininhas"
          className="h-14 sm:h-12 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          Cancelar
        </Link>
        <BotaoSalvar enviando={enviando}>
          {editando ? "Salvar alterações" : "Criar maquininha"}
        </BotaoSalvar>
      </div>
    </form>
  );
}
