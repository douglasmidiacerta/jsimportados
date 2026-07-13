"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { normalizar } from "@/lib/formato";
import { CampoBusca } from "@/components/cadastros/ListaCadastro";

export type ColunaBusca = { titulo: string; alinhar?: "esq" | "dir" };
export type LinhaBusca = {
  id: string;
  href: string;
  cor?: "verde" | "amarela" | "vermelha" | null;
  badge?: string; // marcador âmbar junto ao nome (ex.: "bloqueado")
  arquivado?: boolean;
  celulas: (string | null)[]; // 1ª célula = nome (vira link em negrito)
};

/**
 * Grade densa (desktop) com busca instantânea para listas de cadastro
 * (clientes, fornecedores…). Dados serializáveis — as páginas server montam
 * as células como texto. No mobile as páginas mantêm os cards.
 */
export function TabelaBusca({
  colunas,
  linhas,
  placeholder = "Pesquisar…",
  vazio = "Nada cadastrado ainda.",
  legenda,
  rodape,
}: {
  colunas: ColunaBusca[];
  linhas: LinhaBusca[];
  placeholder?: string;
  vazio?: string;
  legenda?: { cor: "verde" | "amarela" | "vermelha"; rotulo: string }[];
  rodape?: (string | null)[]; // totais (mesmo nº de colunas)
}) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const q = normalizar(busca);
    if (!q) return linhas;
    return linhas.filter((l) =>
      normalizar(l.celulas.filter(Boolean).join(" ")).includes(q),
    );
  }, [busca, linhas]);

  if (linhas.length === 0) {
    return <p className="text-muted text-center py-10">{vazio}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <CampoBusca valor={busca} onChange={setBusca} placeholder={placeholder} />
        </div>
        <span className="text-xs text-muted tabular-nums whitespace-nowrap">
          {filtradas.length} de {linhas.length}
        </span>
      </div>

      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] leading-tight">
            <thead>
              <tr className="border-b-2 border-line">
                {colunas.map((c, i) => (
                  <th
                    key={i}
                    className={`px-3 py-2.5 font-mono text-[10.5px] uppercase tracking-wider text-muted font-semibold whitespace-nowrap ${c.alinhar === "dir" ? "text-right" : "text-left"}`}
                  >
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={colunas.length} className="text-center text-muted py-8">
                    Nada encontrado. Tente outro nome.
                  </td>
                </tr>
              ) : (
                filtradas.map((l) => (
                  <tr
                    key={l.id}
                    className={`border-b border-line last:border-b-0 hover:bg-surface-2 transition-colors ${l.cor ? `linha-${l.cor}` : ""}`}
                  >
                    {l.celulas.map((cel, i) => (
                      <td
                        key={i}
                        className={`px-3 py-2 tabular-nums whitespace-nowrap ${colunas[i]?.alinhar === "dir" ? "text-right" : ""}`}
                      >
                        {i === 0 ? (
                          <Link href={l.href} className="group inline-flex items-center gap-2">
                            <span className="font-semibold text-ink group-hover:underline">
                              {cel || "—"}
                            </span>
                            {l.badge && (
                              <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--amber-soft)] text-amber border border-[color:var(--amber)]/30">
                                {l.badge}
                              </span>
                            )}
                            {l.arquivado && (
                              <span className="text-[10px] font-mono uppercase tracking-wide text-muted">
                                arquivado
                              </span>
                            )}
                          </Link>
                        ) : (
                          (cel ?? <span className="text-muted">—</span>)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {rodape && (
              <tfoot>
                <tr className="border-t-2 border-line bg-surface-2">
                  {rodape.map((cel, i) => (
                    <td
                      key={i}
                      className={`px-3 py-2.5 font-semibold text-ink tabular-nums whitespace-nowrap ${colunas[i]?.alinhar === "dir" ? "text-right" : ""}`}
                    >
                      {cel ?? ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {legenda && legenda.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 px-3 py-2 border-t border-line text-[11.5px] text-muted">
            {legenda.map((lg) => (
              <span key={lg.rotulo} className="inline-flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded linha-${lg.cor} border border-line`} />
                {lg.rotulo}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
