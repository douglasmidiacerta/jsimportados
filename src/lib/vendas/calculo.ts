/**
 * Prévia de venda (espelha a RPC registrar_venda). Informativo — o valor gravado
 * é sempre o do servidor. NÃO calcula custo/MDR/líquido (dados só-gestão).
 */

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcularVenda(
  itens: { quantidade: number; preco_unitario: number }[],
  desconto: number,
  juros: number,
): { subtotal: number; total: number } {
  const subtotal = round2(
    itens.reduce(
      (s, it) => s + round2((it.quantidade || 0) * (it.preco_unitario || 0)),
      0,
    ),
  );
  const desc = Math.min(Math.max(round2(desconto || 0), 0), subtotal);
  const jr = Math.max(round2(juros || 0), 0);
  return { subtotal, total: round2(subtotal - desc + jr) };
}

/** Divide um total em N parcelas por maior-resto (Σ = total exato). Ex.: "3× de R$ X". */
export function parcelasBrutas(total: number, n: number): number[] {
  const parcelas = Math.max(1, Math.floor(n || 1));
  const cents = Math.round((total || 0) * 100);
  const base = Math.floor(cents / parcelas);
  const resto = cents % parcelas;
  return Array.from({ length: parcelas }, (_, i) => {
    const c = base + (i < resto ? 1 : 0);
    return c / 100;
  });
}
