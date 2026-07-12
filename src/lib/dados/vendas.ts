import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  ProdutoPDV,
  Venda,
  VendaItem,
  VendaDetalhe,
  VendaGestao,
  VendaPayload,
  ContaReceber,
  FormaPagamento,
} from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

function normalizarVenda(row: Record<string, unknown>): Venda {
  return {
    id: String(row.id),
    cliente_id: (row.cliente_id as string) ?? null,
    forma_pagamento: row.forma_pagamento as FormaPagamento,
    data_venda: String(row.data_venda),
    subtotal: n(row.subtotal),
    desconto: n(row.desconto),
    juros: n(row.juros),
    total: n(row.total),
    cartao_modalidade: (row.cartao_modalidade as "debito" | "credito") ?? null,
    cartao_parcelas: row.cartao_parcelas == null ? null : n(row.cartao_parcelas),
    fiado_vencimento: (row.fiado_vencimento as string) ?? null,
    status: row.status as "liquidado" | "a_receber",
    observacoes: (row.observacoes as string) ?? null,
    criado_em: String(row.criado_em),
  };
}

/** Registra uma venda atomicamente via RPC. Sem .select() (RETURNING bate na RLS). */
export async function registrarVenda(payload: VendaPayload) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("registrar_venda", {
    p_payload: payload,
  });
  return { vendaId: (data as string | null) ?? null, error };
}

/** Produtos disponíveis no PDV (com preço; SEM custo), só ativos. */
export async function listarProdutosPDV(busca?: string): Promise<ProdutoPDV[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("produtos")
    .select(
      "id, nome, unidade, foto_path, estoque_atual, preco_venda, categorias(nome)",
    )
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
      preco_venda: n(row.preco_venda),
    };
  });
}

function normalizarItens(
  linhas: Array<
    Record<string, unknown> & { produtos: { nome: string; unidade: string } | null }
  >,
): VendaItem[] {
  return (linhas ?? [])
    .slice()
    .sort((a, b) => n(a.posicao) - n(b.posicao))
    .map((it) => ({
      id: String(it.id),
      produto_id: String(it.produto_id),
      produto_nome: it.produtos?.nome ?? null,
      produto_unidade: it.produtos?.unidade ?? null,
      quantidade: n(it.quantidade),
      preco_unitario: n(it.preco_unitario),
      subtotal: n(it.subtotal),
    }));
}

/** Recibo da venda (operação): venda + itens, SEM custo. */
export async function obterVendaOperacao(
  id: string,
): Promise<VendaDetalhe | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vendas")
    .select("*, clientes(nome), venda_itens(*, produtos(nome, unidade))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as Record<string, unknown> & {
    clientes: { nome: string } | null;
    venda_itens: Array<
      Record<string, unknown> & { produtos: { nome: string; unidade: string } | null }
    >;
  };
  return {
    ...normalizarVenda(row),
    cliente_nome: row.clientes?.nome ?? null,
    itens: normalizarItens(row.venda_itens),
  };
}

/** Lista de vendas (gestão): header + custo/lucro. */
export async function listarVendasGestao(): Promise<VendaGestao[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vendas")
    .select("*, clientes(nome), vendas_custo(custo_total, custo_completo, lucro_bruto)")
    .order("data_venda", { ascending: false })
    .order("criado_em", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown> & {
      clientes: { nome: string } | null;
      vendas_custo:
        | { custo_total: unknown; custo_completo: boolean; lucro_bruto: unknown }
        | { custo_total: unknown; custo_completo: boolean; lucro_bruto: unknown }[]
        | null;
    };
    const vc = Array.isArray(row.vendas_custo)
      ? row.vendas_custo[0]
      : row.vendas_custo;
    return {
      ...normalizarVenda(row),
      cliente_nome: row.clientes?.nome ?? null,
      custo_total: n(vc?.custo_total),
      custo_completo: vc?.custo_completo ?? true,
      lucro_bruto: n(vc?.lucro_bruto),
    };
  });
}

export type VendaGestaoDetalhe = VendaGestao & {
  itens: (VendaItem & { custo_unitario: number | null; custo_total: number | null })[];
  contas: ContaReceber[];
};

/** Venda completa (gestão): itens com custo + contas a receber. */
export async function obterVendaGestao(
  id: string,
): Promise<VendaGestaoDetalhe | null> {
  const supabase = await criarClienteServidor();

  const { data: v, error: ev } = await supabase
    .from("vendas")
    .select("*, clientes(nome), vendas_custo(custo_total, custo_completo, lucro_bruto)")
    .eq("id", id)
    .maybeSingle();
  if (ev) throw ev;
  if (!v) return null;
  const row = v as unknown as Record<string, unknown> & {
    clientes: { nome: string } | null;
    vendas_custo:
      | { custo_total: unknown; custo_completo: boolean; lucro_bruto: unknown }
      | { custo_total: unknown; custo_completo: boolean; lucro_bruto: unknown }[]
      | null;
  };
  const vc = Array.isArray(row.vendas_custo) ? row.vendas_custo[0] : row.vendas_custo;

  const { data: itensData, error: ei } = await supabase
    .from("venda_itens")
    .select("*, produtos(nome, unidade), venda_itens_custo(custo_unitario, custo_total)")
    .eq("venda_id", id)
    .order("posicao");
  if (ei) throw ei;

  const itens = (itensData ?? []).map((r) => {
    const it = r as unknown as Record<string, unknown> & {
      produtos: { nome: string; unidade: string } | null;
      venda_itens_custo:
        | { custo_unitario: unknown; custo_total: unknown }
        | { custo_unitario: unknown; custo_total: unknown }[]
        | null;
    };
    const c = Array.isArray(it.venda_itens_custo)
      ? it.venda_itens_custo[0]
      : it.venda_itens_custo;
    return {
      id: String(it.id),
      produto_id: String(it.produto_id),
      produto_nome: it.produtos?.nome ?? null,
      produto_unidade: it.produtos?.unidade ?? null,
      quantidade: n(it.quantidade),
      preco_unitario: n(it.preco_unitario),
      subtotal: n(it.subtotal),
      custo_unitario: c?.custo_unitario == null ? null : n(c.custo_unitario),
      custo_total: c?.custo_total == null ? null : n(c.custo_total),
    };
  });

  const { data: crData, error: ec } = await supabase
    .from("contas_receber")
    .select("*, clientes(nome)")
    .eq("venda_id", id)
    .order("parcela_num");
  if (ec) throw ec;
  const contas: ContaReceber[] = (crData ?? []).map((r) => {
    const cr = r as unknown as Record<string, unknown> & {
      clientes: { nome: string } | null;
    };
    return {
      id: String(cr.id),
      venda_id: String(cr.venda_id),
      cliente_id: (cr.cliente_id as string) ?? null,
      cliente_nome: cr.clientes?.nome ?? null,
      tipo: cr.tipo as "cartao" | "fiado",
      parcela_num: n(cr.parcela_num),
      parcela_total: n(cr.parcela_total),
      valor_bruto: n(cr.valor_bruto),
      valor_taxa: n(cr.valor_taxa),
      valor_liquido: n(cr.valor_liquido),
      valor_recebido: n(cr.valor_recebido),
      saldo: Math.round((n(cr.valor_liquido) - n(cr.valor_recebido)) * 100) / 100,
      taxa_percentual: cr.taxa_percentual == null ? null : n(cr.taxa_percentual),
      vencimento: String(cr.vencimento),
      liquidado_em: (cr.liquidado_em as string) ?? null,
      status: cr.status as "aberto" | "liquidado" | "cancelado",
    };
  });

  return {
    ...normalizarVenda(row),
    cliente_nome: row.clientes?.nome ?? null,
    custo_total: n(vc?.custo_total),
    custo_completo: vc?.custo_completo ?? true,
    lucro_bruto: n(vc?.lucro_bruto),
    itens,
    contas,
  };
}
