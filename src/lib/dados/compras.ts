import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  Compra,
  CompraDetalhe,
  CompraItem,
  CompraDespesa,
  CompraPayload,
  Moeda,
} from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

export type CompraLista = Compra & { fornecedor_nome: string | null };

/** Registra uma compra atomicamente via RPC (recalcula tudo no servidor). */
export async function registrarCompra(payload: CompraPayload) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("registrar_compra", {
    p_payload: payload,
  });
  return { compraId: (data as string | null) ?? null, error };
}

/** Lista compras (cabeçalho + fornecedor), mais recentes primeiro. */
export async function listarCompras(): Promise<CompraLista[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("compras")
    .select(
      "id, fornecedor_id, moeda, cambio, data_compra, observacoes, status, total_itens_brl, total_despesas_brl, total_geral_brl, criado_em, fornecedores(nome)",
    )
    .order("data_compra", { ascending: false })
    .order("criado_em", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown> & {
      fornecedores: { nome: string } | null;
    };
    return {
      id: String(row.id),
      fornecedor_id: (row.fornecedor_id as string) ?? null,
      moeda: row.moeda as Moeda,
      cambio: n(row.cambio),
      data_compra: String(row.data_compra),
      observacoes: (row.observacoes as string) ?? null,
      total_itens_brl: n(row.total_itens_brl),
      total_despesas_brl: n(row.total_despesas_brl),
      total_geral_brl: n(row.total_geral_brl),
      criado_em: String(row.criado_em),
      status: (row.status as "confirmada" | "cancelada") ?? "confirmada",
      fornecedor_nome: row.fornecedores?.nome ?? null,
    };
  });
}

/** Obtém uma compra completa (itens + despesas + fornecedor) — recibo. */
export async function obterCompra(id: string): Promise<CompraDetalhe | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("compras")
    .select(
      "*, fornecedores(nome), compra_itens(*, produtos(nome)), compra_despesas(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as Record<string, unknown> & {
    fornecedores: { nome: string } | null;
    compra_itens: Array<Record<string, unknown> & { produtos: { nome: string } | null }>;
    compra_despesas: Array<Record<string, unknown>>;
  };

  const itens: CompraItem[] = (row.compra_itens ?? [])
    .map((it) => ({
      id: String(it.id),
      produto_id: String(it.produto_id),
      produto_nome: it.produtos?.nome ?? null,
      quantidade: n(it.quantidade),
      custo_origem_unit: n(it.custo_origem_unit),
      custo_item_brl: n(it.custo_item_brl),
      rateio_despesa: n(it.rateio_despesa),
      custo_total_brl: n(it.custo_total_brl),
      custo_real_unitario: n(it.custo_real_unitario),
    }))
    .sort((a, b) => (a.produto_nome ?? "").localeCompare(b.produto_nome ?? ""));

  const despesas: CompraDespesa[] = (row.compra_despesas ?? []).map((d) => ({
    id: String(d.id),
    descricao: String(d.descricao ?? "Despesa"),
    valor_brl: n(d.valor_brl),
  }));

  return {
    id: String(row.id),
    fornecedor_id: (row.fornecedor_id as string) ?? null,
    fornecedor_nome: row.fornecedores?.nome ?? null,
    moeda: row.moeda as Moeda,
    cambio: n(row.cambio),
    data_compra: String(row.data_compra),
    observacoes: (row.observacoes as string) ?? null,
    total_itens_brl: n(row.total_itens_brl),
    total_despesas_brl: n(row.total_despesas_brl),
    total_geral_brl: n(row.total_geral_brl),
    criado_em: String(row.criado_em),
    status: (row.status as "confirmada" | "cancelada") ?? "confirmada",
    itens,
    despesas,
  };
}
