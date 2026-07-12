import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  ContaReceber,
  ContaReceberDetalhe,
  Recebimento,
  FormaFinanceira,
} from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

function mapConta(
  cr: Record<string, unknown> & { clientes?: { nome: string } | null },
): ContaReceber {
  const liquido = n(cr.valor_liquido);
  const recebido = n(cr.valor_recebido);
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
    valor_liquido: liquido,
    valor_recebido: recebido,
    saldo: Math.round((liquido - recebido) * 100) / 100,
    taxa_percentual: cr.taxa_percentual == null ? null : n(cr.taxa_percentual),
    vencimento: String(cr.vencimento),
    liquidado_em: (cr.liquidado_em as string) ?? null,
    status: cr.status as "aberto" | "liquidado" | "cancelado",
  };
}

function mapRecebimento(r: Record<string, unknown>): Recebimento {
  return {
    id: String(r.id),
    conta_receber_id: String(r.conta_receber_id),
    data_recebimento: String(r.data_recebimento),
    valor: n(r.valor),
    forma_pagamento: (r.forma_pagamento as FormaFinanceira) ?? null,
    estorno_de: (r.estorno_de as string) ?? null,
    observacoes: (r.observacoes as string) ?? null,
    criado_em: String(r.criado_em ?? ""),
  };
}

/** Lista contas a receber (gestão). Filtra por status se informado. */
export async function listarContasReceber(
  status?: "aberto" | "liquidado" | "cancelado",
): Promise<ContaReceber[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("contas_receber")
    .select("*, clientes(nome)")
    .order("vencimento");
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r) =>
    mapConta(r as Record<string, unknown> & { clientes: { nome: string } | null }),
  );
}

/** Conta a receber + histórico de recebimentos (detalhe/baixa). */
export async function obterContaReceber(
  id: string,
): Promise<ContaReceberDetalhe | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("contas_receber")
    .select("*, clientes(nome), recebimentos(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown> & {
    clientes: { nome: string } | null;
    recebimentos: Array<Record<string, unknown>>;
  };
  const recebimentos = (row.recebimentos ?? [])
    .map(mapRecebimento)
    .sort((a, b) => a.data_recebimento.localeCompare(b.data_recebimento));
  return { ...mapConta(row), recebimentos };
}
