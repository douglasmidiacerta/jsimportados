/**
 * Prévia do cálculo de compra (rateio + custo real) espelhando a RPC do servidor.
 * APENAS informativo para o formulário — o valor gravado é sempre o do servidor.
 */

export type ItemPrevia = {
  quantidade: number;
  custo_origem: number;
};

export type PreviaItem = {
  custo_item_brl: number;
  rateio: number;
  custo_total_brl: number;
  custo_real_unitario: number;
};

export type PreviaCompra = {
  itens: PreviaItem[];
  total_itens_brl: number;
  total_despesas_brl: number;
  total_geral_brl: number;
};

function round(n: number, casas: number): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** casas;
  return Math.round((n + Number.EPSILON) * f) / f;
}

function trunc2(n: number): number {
  return Math.floor(round(n, 6) * 100) / 100;
}

/**
 * @param itens itens da compra (qtd + custo na moeda de origem)
 * @param cambio quanto vale 1 unidade da moeda em BRL (BRL => 1)
 * @param despesaTotal soma das despesas em BRL (2 casas)
 */
export function calcularPreviaCompra(
  itens: ItemPrevia[],
  cambio: number,
  despesaTotal: number,
): PreviaCompra {
  const c = Number.isFinite(cambio) && cambio > 0 ? cambio : 0;
  const D = round(Number.isFinite(despesaTotal) ? despesaTotal : 0, 2);

  const custoItem = itens.map((it) =>
    round((it.quantidade || 0) * (it.custo_origem || 0) * c, 4),
  );
  const base = custoItem.reduce((s, v) => s + v, 0);
  const qtdTotal = itens.reduce((s, it) => s + (it.quantidade || 0), 0);

  // Rateio por maior resto a 2 casas (Σ rateio = D exato).
  const rateio = itens.map(() => 0);
  if (D > 0 && itens.length > 0) {
    const info = itens.map((it, i) => {
      const peso =
        base > 0
          ? custoItem[i] / base
          : qtdTotal > 0
            ? (it.quantidade || 0) / qtdTotal
            : 1 / itens.length;
      const ideal = D * peso;
      const piso = trunc2(ideal);
      return { i, custo: custoItem[i], piso, resto: round(ideal - piso, 6) };
    });
    const somaPiso = info.reduce((s, x) => s + x.piso, 0);
    let faltam = Math.round((D - somaPiso) * 100);
    const ordem = [...info].sort(
      (a, b) => b.resto - a.resto || b.custo - a.custo || a.i - b.i,
    );
    for (const x of ordem) {
      rateio[x.i] = round(x.piso + (faltam > 0 ? 0.01 : 0), 2);
      if (faltam > 0) faltam--;
    }
  }

  const previaItens: PreviaItem[] = itens.map((it, i) => {
    const total = round(custoItem[i] + rateio[i], 4);
    const unit = it.quantidade > 0 ? round(total / it.quantidade, 4) : 0;
    return {
      custo_item_brl: custoItem[i],
      rateio: round(rateio[i], 2),
      custo_total_brl: total,
      custo_real_unitario: unit,
    };
  });

  return {
    itens: previaItens,
    total_itens_brl: round(base, 2),
    total_despesas_brl: D,
    total_geral_brl: round(base + D, 2),
  };
}
