import { SUPABASE_URL } from "@/lib/supabase/config";

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
