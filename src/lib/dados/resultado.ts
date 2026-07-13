import { criarClienteServidor } from "@/lib/supabase/server";
import type { DespesaCategoria, ResultadoGeral } from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

/** Resultado geral consolidado do período (rel_resultado_geral). */
export async function lerResultadoGeral(
  inicio: string,
  fim: string,
): Promise<ResultadoGeral> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("rel_resultado_geral", {
    p_inicio: inicio,
    p_fim: fim,
  });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    receita: n(r.receita),
    cmv: n(r.cmv),
    cmv_completo: r.cmv_completo !== false,
    lucro_bruto: n(r.lucro_bruto),
    taxas_cartao: n(r.taxas_cartao),
    juros_fiado: n(r.juros_fiado),
    despesas: Array.isArray(r.despesas)
      ? (r.despesas as { categoria: string; total: number }[]).map((d) => ({
          categoria: String(d.categoria),
          total: n(d.total),
        }))
      : [],
    despesas_total: n(r.despesas_total),
    resultado: n(r.resultado),
  };
}

/** Plano de contas (categorias de despesa) — todas, incl. arquivadas. */
export async function listarPlanoContas(): Promise<DespesaCategoria[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("despesa_categorias")
    .select("id, nome, ativo")
    .order("ativo", { ascending: false })
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: String(c.id),
    nome: String(c.nome),
    ativo: Boolean(c.ativo),
  }));
}

export async function criarCategoriaDespesa(nome: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("despesa_categorias").insert({ nome });
  return { error };
}

export async function renomearCategoriaDespesa(id: string, nome: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("despesa_categorias").update({ nome }).eq("id", id);
  return { error };
}

export async function definirAtivoCategoriaDespesa(id: string, ativo: boolean) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("despesa_categorias").update({ ativo }).eq("id", id);
  return { error };
}
