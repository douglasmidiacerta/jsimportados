"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { BotaoSalvar } from "@/components/cadastros/BotaoSalvar";
import { parseMoedaBR, numeroParaCampoBR } from "@/lib/formato";
import type { TaxaCartao, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
type Linha = { modalidade: "debito" | "credito"; parcelas: number; percentual: string; prazo: string };

export function FormularioTaxasCartao({
  taxas,
  action,
}: {
  taxas: TaxaCartao[];
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [linhas, setLinhas] = useState<Linha[]>(
    taxas.map((t) => ({
      modalidade: t.modalidade,
      parcelas: t.parcelas,
      percentual: numeroParaCampoBR(t.percentual),
      prazo: String(t.prazo_dias),
    })),
  );

  function set(i: number, campo: "percentual" | "prazo", v: string) {
    setLinhas((arr) => arr.map((l, j) => (j === i ? { ...l, [campo]: v } : l)));
  }

  const payload = linhas.map((l) => ({
    modalidade: l.modalidade,
    parcelas: l.parcelas,
    percentual: parseMoedaBR(l.percentual),
    prazo_dias: Math.max(0, Math.floor(Number(l.prazo) || 0)),
    ativo: true,
  }));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="linhas" value={JSON.stringify(payload)} />

      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
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
                      placeholder="0,00"
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

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link
          href="/gestao"
          className="h-14 sm:h-12 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          Voltar
        </Link>
        <BotaoSalvar enviando={enviando}>Salvar taxas</BotaoSalvar>
      </div>
    </form>
  );
}
