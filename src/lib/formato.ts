import { SUPABASE_URL } from "@/lib/supabase/config";

/** Código interno do produto: codProduto(123) => "P-000123". */
export function codProduto(n: number | null | undefined): string {
  if (n == null) return "—";
  return `P-${String(n).padStart(6, "0")}`;
}

/**
 * Gera um EAN-13 interno válido a partir de um número sequencial. Usa o prefixo
 * "200" (reservado pelo GS1 para uso interno da loja) + 9 dígitos + dígito
 * verificador. Serve para etiquetar/escanear produtos sem código de fábrica.
 */
export function gerarEAN13(seq: number): string {
  const base = ("200" + String(seq).padStart(9, "0")).slice(0, 12);
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const dv = (10 - (soma % 10)) % 10;
  return base + dv;
}

/**
 * Preço a partir do custo e da margem sobre a VENDA (%): preço = custo/(1−m/100).
 * Ex.: custo 40, margem 20% → 50. Retorna "" se inválido.
 */
export function precoPorMargem(custo: number | null, margemPct: number): string {
  if (custo == null || custo <= 0 || margemPct >= 100) return "";
  const preco = custo / (1 - margemPct / 100);
  return numeroParaCampoBR(Math.round(preco * 100) / 100);
}

/** Número de documento amigável: docNumero("V", 123) => "V-000123". */
export function docNumero(prefixo: string, n: number | null | undefined): string {
  if (n == null) return "—";
  return `${prefixo}-${String(n).padStart(6, "0")}`;
}
export const numVenda = (n: number | null | undefined) => docNumero("V", n);
export const numCompra = (n: number | null | undefined) => docNumero("C", n);
export const numOrcamento = (n: number | null | undefined) => docNumero("O", n);

/** Formata um número como moeda brasileira (R$). */
export function formatarBRL(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? Number(valor) : (valor ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0);
}

/**
 * Converte um preço digitado em português ("12,50", "1.234,56", "R$ 10")
 * para número. Retorna 0 se vazio/inválido.
 */
export function parseMoedaBR(texto: string | null | undefined): number {
  if (!texto) return 0;
  const limpo = String(texto)
    .replace(/[^\d.,-]/g, "") // remove R$, espaços, letras
    .replace(/\./g, "") // remove separador de milhar
    .replace(",", "."); // vírgula decimal -> ponto
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

/** Número para preencher um campo de moeda editável (ex.: 12.5 -> "12,50"). Vazio se null/0. */
export function numeroParaCampoBR(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || valor === 0) return "";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** URL pública da foto de um produto no Storage (bucket "produtos"). */
export function urlFoto(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/produtos/${path}`;
}

/** Formata uma quantidade de estoque (pt-BR, sem forçar casas decimais). */
export function formatarQtd(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? Number(valor) : (valor ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

/** Formata uma data "YYYY-MM-DD" como "DD/MM/AAAA" (sem depender de fuso). */
export function formatarData(data: string | null | undefined): string {
  if (!data) return "";
  const m = String(data).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(data);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Normaliza texto para busca (remove acentos, minúsculas). */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
