import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstoqueBalcaoItem, EstoqueGestaoItem, PatrimonioItem } from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

/** Patrimônio: valor do estoque a custo e a preço de venda (rel_patrimonio). */
export async function listarPatrimonio(): Promise<PatrimonioItem[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("rel_patrimonio");
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    produto_id: String(r.produto_id),
    nome: String(r.nome),
    codigo_sequencial: r.codigo_sequencial == null ? null : n(r.codigo_sequencial),
    estoque: n(r.estoque),
    estoque_minimo: n(r.estoque_minimo),
    custo_medio: r.custo_medio == null ? null : n(r.custo_medio),
    preco_venda: n(r.preco_venda),
    valor_custo: n(r.valor_custo),
    valor_venda: n(r.valor_venda),
    abaixo_minimo: Boolean(r.abaixo_minimo),
  }));
}

/** Estoque para o balcão (Modo Operação): SEM custo, só produtos ativos. */
export async function listarEstoqueBalcao(
  busca?: string,
): Promise<EstoqueBalcaoItem[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("produtos")
    .select("id, nome, unidade, foto_path, estoque_atual, categorias!categoria_id(nome)")
    .eq("ativo", true)
    .order("nome");
  if (busca && busca.trim()) query = query.ilike("nome", `%${busca.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown> & {
      categorias: { nome: string } | null;
    };
    return {
      id: String(row.id),
      nome: String(row.nome),
      unidade: String(row.unidade),
      foto_path: (row.foto_path as string) ?? null,
      categoria_nome: row.categorias?.nome ?? null,
      estoque_atual: n(row.estoque_atual),
    };
  });
}

/** Estoque para a gestão: com custo médio e valor parado em estoque. */
export async function listarEstoqueGestao(
  busca?: string,
): Promise<EstoqueGestaoItem[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("produtos")
    .select(
      "id, nome, unidade, estoque_atual, estoque_minimo, categorias!categoria_id(nome), produtos_custo(custo)",
    )
    .eq("ativo", true)
    .order("nome");
  if (busca && busca.trim()) query = query.ilike("nome", `%${busca.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown> & {
      categorias: { nome: string } | null;
      produtos_custo:
        | { custo: number | string | null }
        | { custo: number | string | null }[]
        | null;
    };
    const estoque = n(row.estoque_atual);
    const pc = Array.isArray(row.produtos_custo)
      ? row.produtos_custo[0]
      : row.produtos_custo;
    const custo = pc?.custo == null ? null : n(pc.custo);
    const minimo = n(row.estoque_minimo);
    return {
      id: String(row.id),
      nome: String(row.nome),
      unidade: String(row.unidade),
      categoria_nome: row.categorias?.nome ?? null,
      estoque_atual: estoque,
      custo,
      valor_em_estoque: custo == null ? 0 : Math.round(estoque * custo * 100) / 100,
      estoque_minimo: minimo,
      abaixo_minimo: minimo > 0 && estoque <= minimo,
    };
  });
}

/**
 * Registra uma entrada de estoque pelo balcão (operação): produto + quantidade.
 * SEM custo e SEM .select() (o RETURNING bateria na policy de SELECT só-gestão).
 */
export async function registrarEntradaBalcao(
  produtoId: string,
  quantidade: number,
  observacoes?: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("movimentacoes_estoque").insert({
    produto_id: produtoId,
    tipo: "entrada",
    quantidade,
    observacoes: observacoes ?? null,
  });
  return { error };
}
