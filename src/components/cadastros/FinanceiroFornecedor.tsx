"use client";

import { useState } from "react";
import Link from "next/link";
import { formatarBRL, formatarData } from "@/lib/formato";
import type { ContaPagar, ParcelasFornecedor } from "@/lib/dados/tipos";

type Aba = "vencidas" | "aVencer" | "pagas";

/** Financeiro por fornecedor: parcelas em abas com totais (reusa Contas a Pagar). */
export function FinanceiroFornecedor({ dados }: { dados: ParcelasFornecedor }) {
  const [aba, setAba] = useState<Aba>("vencidas");

  const abas: { id: Aba; rotulo: string; total: number; cor: string }[] = [
    { id: "vencidas", rotulo: "Vencidas", total: dados.totalVencidas, cor: "text-danger" },
    { id: "aVencer", rotulo: "A Vencer", total: dados.totalAVencer, cor: "text-amber" },
    { id: "pagas", rotulo: "Pagas", total: dados.totalPagas, cor: "text-good" },
  ];
  const lista: ContaPagar[] =
    aba === "vencidas" ? dados.vencidas : aba === "aVencer" ? dados.aVencer : dados.pagas;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              aba === a.id
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface hover:bg-surface-2"
            }`}
          >
            <span className="block text-xs text-muted">{a.rotulo}</span>
            <span className={`block text-base font-bold tabular-nums ${a.cor}`}>
              {formatarBRL(a.total)}
            </span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-muted italic px-1 py-2">
          Nenhuma parcela nesta situação.
        </p>
      ) : (
        <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
          {lista.map((c) => (
            <Link
              key={c.id}
              href={`/gestao/contas-pagar/${c.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="block text-ink font-medium truncate">{c.descricao}</span>
                <span className="block text-xs text-muted">
                  vence {formatarData(c.vencimento)}
                  {c.parcial && " · parcial"}
                </span>
              </span>
              <span className="text-right shrink-0 tabular-nums">
                <span className="block font-semibold text-ink">
                  {formatarBRL(aba === "pagas" ? c.valor_pago : c.saldo)}
                </span>
                {aba !== "pagas" && c.valor !== c.saldo && (
                  <span className="block text-[11px] text-muted">de {formatarBRL(c.valor)}</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
