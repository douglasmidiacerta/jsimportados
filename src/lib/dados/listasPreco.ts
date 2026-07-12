import { criarClienteServidor } from "@/lib/supabase/server";
import type { ListaPreco, PrecoProdutoLista } from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

function mapLista(r: Record<string, unknown>): ListaPreco {
  return {
    id: String(r.id),
    nome: String(r.nome),
    is_default: Boolean(r.is_default),
    ativo: Boolean(r.ativo),
    ordem: n(r.ordem),
  };
}

/** Lista as listas de preço (só ativas por padrão), ordenadas. */
export async function listarListasPreco(
  incluirInativas = false,
): Promise<ListaPreco[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("listas_preco")
    .select("id, nome, is_default, ativo, ordem")
    .order("ordem")
    .order("nome");
  if (!incluirInativas) query = query.eq("ativo", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => mapLista(r as Record<string, unknown>));
}

/** A lista padrão (is_default). */
export async function obterListaDefault(): Promise<ListaPreco | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("listas_preco")
    .select("id, nome, is_default, ativo, ordem")
    .eq("is_default", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLista(data as Record<string, unknown>) : null;
}

export async function criarLista(nome: string, ordem = 100) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("listas_preco")
    .insert({ nome: nome.trim(), ordem });
  return { error };
}

export async function atualizarLista(
  id: string,
  campos: { nome?: string; ordem?: number; ativo?: boolean },
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("listas_preco")
    .update(campos)
    .eq("id", id);
  return { error };
}

/** Torna uma lista a padrão (o guard zera as outras automaticamente). */
export async function tornarPadrao(id: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("listas_preco")
    .update({ is_default: true })
    .eq("id", id);
  return { error };
}

export async function apagarLista(id: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("listas_preco").delete().eq("id", id);
  return { error };
}

// ------------------------------- Preços -----------------------------------

/** Overrides de preço de um produto (listas != padrão). */
export async function precosDoProduto(
  produtoId: string,
): Promise<Record<string, number>> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("precos")
    .select("lista_id, preco")
    .eq("produto_id", produtoId);
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[String(r.lista_id)] = n(r.preco);
  return map;
}

/** Define/atualiza o preço de um produto numa lista (não pode ser a padrão). */
export async function definirPreco(
  produtoId: string,
  listaId: string,
  preco: number,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("precos")
    .upsert(
      { produto_id: produtoId, lista_id: listaId, preco },
      { onConflict: "produto_id,lista_id" },
    );
  return { error };
}

/** Remove o override — o produto volta a herdar o preço de varejo naquela lista. */
export async function removerPreco(produtoId: string, listaId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("precos")
    .delete()
    .eq("produto_id", produtoId)
    .eq("lista_id", listaId);
  return { error };
}

/** Matriz de preços de UMA lista: todos os produtos com o override (ou herdando Varejo). */
export async function matrizPrecosDaLista(
  listaId: string,
  busca?: string,
): Promise<PrecoProdutoLista[]> {
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("produtos")
    .select("id, nome, preco_venda") // SEM custo (projeção segura)
    .eq("ativo", true)
    .order("nome");
  if (busca && busca.trim()) q = q.ilike("nome", `%${busca.trim()}%`);

  const [{ data: prods, error: ep }, { data: precos, error: epr }] =
    await Promise.all([
      q,
      supabase.from("precos").select("produto_id, preco").eq("lista_id", listaId),
    ]);
  if (ep) throw ep;
  if (epr) throw epr;

  const overrides: Record<string, number> = {};
  for (const r of precos ?? []) overrides[String(r.produto_id)] = n(r.preco);

  return (prods ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const id = String(row.id);
    const precoVenda = n(row.preco_venda);
    const override = id in overrides ? overrides[id] : null;
    return {
      produto_id: id,
      nome: String(row.nome),
      preco_venda: precoVenda,
      override,
      preco_efetivo: override ?? precoVenda,
    };
  });
}
