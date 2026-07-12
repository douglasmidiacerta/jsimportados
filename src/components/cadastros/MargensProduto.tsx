"use client";

import { formatarBRL } from "@/lib/formato";

/**
 * Margens calculadas ao vivo. Mostra, para varejo e atacado, a margem pelas
 * DUAS bases de custo (última compra e custo médio). Margem = (preço−custo)/preço.
 * Só-gestão (o componente só é montado no formulário completo).
 */
export function MargensProduto({
  precoVarejo,
  precoAtacado,
  custoUltima,
  custoMedio,
}: {
  precoVarejo: number;
  precoAtacado: number;
  custoUltima: number | null;
  custoMedio: number | null;
}) {
  const semCusto = custoUltima == null && custoMedio == null;

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <span className="block text-sm font-semibold text-ink mb-1">
        Margem de lucro
      </span>
      {semCusto ? (
        <p className="text-xs text-muted">
          As margens aparecem depois da primeira compra deste produto (quando o
          sistema souber o custo).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs">
                <th className="text-left font-medium py-1"></th>
                <th className="text-right font-medium py-1 px-2">
                  pela última compra
                </th>
                <th className="text-right font-medium py-1 pl-2">pela média</th>
              </tr>
            </thead>
            <tbody>
              <LinhaMargem
                rotulo="Varejo"
                preco={precoVarejo}
                custoUltima={custoUltima}
                custoMedio={custoMedio}
              />
              <LinhaMargem
                rotulo="Atacado"
                preco={precoAtacado}
                custoUltima={custoUltima}
                custoMedio={custoMedio}
              />
            </tbody>
          </table>
          <p className="text-[11px] text-muted mt-2">
            Margem = (preço − custo) ÷ preço. Nos relatórios de lucro real vale o
            custo médio.
          </p>
        </div>
      )}
    </div>
  );
}

function LinhaMargem({
  rotulo,
  preco,
  custoUltima,
  custoMedio,
}: {
  rotulo: string;
  preco: number;
  custoUltima: number | null;
  custoMedio: number | null;
}) {
  return (
    <tr className="border-t border-line">
      <td className="py-1.5 text-ink font-medium">{rotulo}</td>
      <td className="py-1.5 px-2 text-right">
        <Celula preco={preco} custo={custoUltima} />
      </td>
      <td className="py-1.5 pl-2 text-right">
        <Celula preco={preco} custo={custoMedio} />
      </td>
    </tr>
  );
}

function Celula({ preco, custo }: { preco: number; custo: number | null }) {
  if (!preco || preco <= 0 || custo == null) {
    return <span className="text-muted">—</span>;
  }
  const lucro = preco - custo;
  const margem = (lucro / preco) * 100;
  const cor =
    margem < 0 ? "text-danger" : margem < 15 ? "text-amber" : "text-good";
  return (
    <span className="tabular-nums">
      <span className={`font-semibold ${cor}`}>{margem.toFixed(1)}%</span>
      <span className="block text-[11px] text-muted">{formatarBRL(lucro)}</span>
    </span>
  );
}
