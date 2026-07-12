import type { ProdutoPDV } from "@/lib/dados/tipos";

/**
 * Preço de um produto numa lista — ESPELHA a função SQL `preco_do_produto`:
 *   lista padrão  -> preco_venda (Varejo é a fonte única)
 *   outra lista   -> override da lista, ou preco_venda se não houver
 * Nunca retorna null/undefined: cai sempre no preco_venda.
 */
export function precoNaLista(
  p: Pick<ProdutoPDV, "preco_venda" | "precos">,
  listaId: string | null,
  listaDefaultId: string,
): number {
  if (listaId == null || listaId === listaDefaultId) return p.preco_venda;
  const override = p.precos[listaId];
  return override ?? p.preco_venda;
}
