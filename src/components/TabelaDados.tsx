import Link from "next/link";

export type CorLinha = "verde" | "amarela" | "vermelha";

export type ColunaTabela = {
  titulo: string;
  alinhar?: "esq" | "dir" | "centro";
};

export type LinhaTabela = {
  id: string;
  href?: string; // link "abrir" na última coluna
  cor?: CorLinha | null; // fundo suave da linha (padrão FPQ)
  celulas: React.ReactNode[];
  acao?: React.ReactNode; // ação na própria linha (ex.: Receber)
};

const ALINHA = { esq: "text-left", dir: "text-right", centro: "text-center" };

/**
 * Grade densa (padrão FPQ) para o DESKTOP da gestão: muitas colunas, linhas
 * finas, cores por estado, rodapé de totais e legenda. Server component —
 * as células chegam prontas (ReactNode). No mobile as páginas mantêm os cards.
 */
export function TabelaDados({
  colunas,
  linhas,
  rodape,
  legenda,
  vazio = "Nada por aqui ainda.",
}: {
  colunas: ColunaTabela[];
  linhas: LinhaTabela[];
  rodape?: React.ReactNode[]; // mesmo nº de colunas (células do rodapé)
  legenda?: { cor: CorLinha; rotulo: string }[];
  vazio?: string;
}) {
  const temAcoes = linhas.some((l) => l.href || l.acao);

  if (linhas.length === 0) {
    return <p className="text-muted text-center py-10">{vazio}</p>;
  }

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px] leading-tight">
          <thead>
            <tr className="border-b-2 border-line">
              {colunas.map((c, i) => (
                <th
                  key={i}
                  className={`px-3 py-2.5 font-mono text-[10.5px] uppercase tracking-wider text-muted font-semibold whitespace-nowrap ${ALINHA[c.alinhar ?? "esq"]}`}
                >
                  {c.titulo}
                </th>
              ))}
              {temAcoes && <th className="px-3 py-2.5 w-px" aria-label="Ações" />}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr
                key={l.id}
                className={`border-b border-line last:border-b-0 hover:bg-surface-2 transition-colors ${l.cor ? `linha-${l.cor}` : ""}`}
              >
                {l.celulas.map((cel, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 tabular-nums whitespace-nowrap ${ALINHA[colunas[i]?.alinhar ?? "esq"]}`}
                  >
                    {cel}
                  </td>
                ))}
                {temAcoes && (
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="flex items-center justify-end gap-2">
                      {l.acao}
                      {l.href && (
                        <Link
                          href={l.href}
                          className="text-xs font-semibold text-accent-ink hover:underline"
                        >
                          abrir
                        </Link>
                      )}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {rodape && (
            <tfoot>
              <tr className="border-t-2 border-line bg-surface-2">
                {rodape.map((cel, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2.5 font-semibold text-ink tabular-nums whitespace-nowrap ${ALINHA[colunas[i]?.alinhar ?? "esq"]}`}
                  >
                    {cel}
                  </td>
                ))}
                {temAcoes && <td />}
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
  );
}
