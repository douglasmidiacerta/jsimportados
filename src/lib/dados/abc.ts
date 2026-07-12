// Curva ABC (Pareto) — util pura, sem I/O. Usada em 3 domínios (produtos,
// estoque, clientes) e 2 bases (faturamento, lucro).

export type ClasseABC = "A" | "B" | "C";

export type ItemABC<T> = T & {
  classe: ClasseABC;
  pctItem: number; // % do total (só entre os positivos)
  pctAcum: number; // % acumulado
  prejuizo?: boolean; // métrica < 0
  semContribuicao?: boolean; // métrica = 0
};

export type ResumoABC = Record<ClasseABC, { n: number; valor: number; pct: number }>;

const EPS = 1e-6;

/**
 * Classifica linhas por uma métrica (faturamento OU lucro):
 * ordena desc, acumula %; a classe é definida pelo acumulado ANTES do item
 * (convenção Pareto: o item que CRUZA 80% ainda é A; o primeiro depois de 80%
 * é B; idem 95% → C). Itens com métrica ≤ 0 (prejuízo / sem contribuição) ficam
 * fora do denominador, como C, no fim. `chave` dá desempate determinístico.
 */
export function classificarABC<T extends object>(
  rows: T[],
  metrica: (x: T) => number,
  chave: (x: T) => string = () => "",
): { itens: ItemABC<T>[]; resumo: ResumoABC } {
  const positivos = rows
    .filter((r) => metrica(r) > 0)
    .sort((a, b) => metrica(b) - metrica(a) || chave(a).localeCompare(chave(b)));
  const naoPositivos = rows
    .filter((r) => metrica(r) <= 0)
    .sort((a, b) => metrica(a) - metrica(b) || chave(a).localeCompare(chave(b)));

  const total = positivos.reduce((s, r) => s + metrica(r), 0);
  const resumo: ResumoABC = {
    A: { n: 0, valor: 0, pct: 0 },
    B: { n: 0, valor: 0, pct: 0 },
    C: { n: 0, valor: 0, pct: 0 },
  };

  const itens: ItemABC<T>[] = [];
  let acum = 0;
  for (const r of positivos) {
    const m = metrica(r);
    const prevAcum = total > 0 ? (acum / total) * 100 : 0; // acumulado ANTES deste item
    acum += m;
    const pctItem = total > 0 ? (m / total) * 100 : 0;
    const pctAcum = total > 0 ? (acum / total) * 100 : 0; // inclusivo (exibição)
    const classe: ClasseABC =
      prevAcum < 80 - EPS ? "A" : prevAcum < 95 - EPS ? "B" : "C";
    itens.push({ ...r, classe, pctItem, pctAcum });
    resumo[classe].n++;
    resumo[classe].valor += m;
  }
  for (const r of naoPositivos) {
    const m = metrica(r);
    itens.push({
      ...r,
      classe: "C",
      pctItem: 0,
      pctAcum: 100,
      prejuizo: m < 0,
      semContribuicao: m === 0,
    });
  }
  for (const c of ["A", "B", "C"] as ClasseABC[]) {
    resumo[c].pct = total > 0 ? (resumo[c].valor / total) * 100 : 0;
  }
  return { itens, resumo };
}
