"use client";

import { useMemo, useState } from "react";
import { CampoBusca } from "@/components/cadastros/ListaCadastro";
import { normalizar, formatarBRL, formatarQtd } from "@/lib/formato";
import type { EstoqueGestaoItem } from "@/lib/dados/tipos";

export function TabelaEstoqueGestao({ itens }: { itens: EstoqueGestaoItem[] }) {
  const [busca, setBusca] = useState("");
  const [soRepor, setSoRepor] = useState(false);

  const nRepor = useMemo(() => itens.filter((i) => i.abaixo_minimo).length, [itens]);

  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    return itens.filter(
      (i) => (!q || normalizar(i.nome).includes(q)) && (!soRepor || i.abaixo_minimo),
    );
  }, [busca, itens, soRepor]);

  const totalValor = filtrados.reduce((s, i) => s + i.valor_em_estoque, 0);

  return (
    <div className="flex flex-col gap-4">
      <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar produto…" />

      {nRepor > 0 && (
        <button
          type="button"
          onClick={() => setSoRepor((v) => !v)}
          className={`self-start inline-flex items-center gap-2 rounded-xl border px-3 h-10 text-sm font-semibold transition-colors ${
            soRepor
              ? "bg-[var(--amber-soft)] border-[color:var(--amber)]/40 text-amber"
              : "border-line text-ink hover:bg-surface-2"
          }`}
        >
          ⚠ {nRepor} produto(s) para repor
          <span className="text-xs font-normal">{soRepor ? "· mostrar todos" : "· ver só esses"}</span>
        </button>
      )}

      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                <th className="text-left font-semibold px-4 py-3">Produto</th>
                <th className="text-left font-semibold px-4 py-3">Categoria</th>
                <th className="text-right font-semibold px-4 py-3">Estoque</th>
                <th className="text-right font-semibold px-4 py-3">Mínimo</th>
                <th className="text-right font-semibold px-4 py-3">Custo médio</th>
                <th className="text-right font-semibold px-4 py-3">Valor parado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-8">
                    Nada encontrado.
                  </td>
                </tr>
              ) : (
                filtrados.map((i) => (
                  <tr
                    key={i.id}
                    className={`border-b border-line last:border-0 ${
                      i.estoque_atual <= 0
                        ? "linha-vermelha"
                        : i.abaixo_minimo
                          ? "linha-amarela"
                          : "linha-verde"
                    }`}
                  >
                    <td className="px-4 py-3 text-ink font-medium">{i.nome}</td>
                    <td className="px-4 py-3 text-muted">{i.categoria_nome ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        {i.abaixo_minimo && i.estoque_atual > 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-[var(--amber-soft)] text-amber">repor</span>
                        )}
                        {formatarQtd(i.estoque_atual)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {i.estoque_minimo > 0 ? formatarQtd(i.estoque_minimo) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {i.custo == null ? "—" : formatarBRL(i.custo)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink font-semibold">
                      {i.valor_em_estoque > 0 ? formatarBRL(i.valor_em_estoque) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtrados.length > 0 && (
              <tfoot>
                <tr className="border-t border-line bg-surface-2">
                  <td className="px-4 py-3 font-bold text-ink" colSpan={5}>
                    Valor total em estoque
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-extrabold text-ink">
                    {formatarBRL(totalValor)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-t border-line text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded linha-verde border border-line" /> Em estoque
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded linha-amarela border border-line" /> No mínimo (repor)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded linha-vermelha border border-line" /> Zerado ou negativo
          </span>
        </div>
      </div>
    </div>
  );
}
