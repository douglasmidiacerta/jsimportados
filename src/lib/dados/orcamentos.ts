import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  Orcamento,
  OrcamentoDetalhe,
  OrcamentoItem,
  OrcamentoPayload,
  StatusOrcamento,
} from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

function normalizar(row: Record<string, unknown> & { clientes?: { nome: string } | null }): Orcamento {
  return {
    id: String(row.id),
    numero: n(row.numero),
    cliente_id: (row.cliente_id as string) ?? null,
    cliente_nome: row.clientes?.nome ?? null,
    lista_preco_id: (row.lista_preco_id as string) ?? null,
    observacoes: (row.observacoes as string) ?? null,
    validade: (row.validade as string) ?? null,
    status: row.status as StatusOrcamento,
    venda_id: (row.venda_id as string) ?? null,
    cancelado_motivo: (row.cancelado_motivo as string) ?? null,
    subtotal: n(row.subtotal),
    desconto: n(row.desconto),
    total: n(row.total),
    criado_em: String(row.criado_em),
  };
}

/** Lista de orçamentos (gestão vê todos; operação vê os próprios — RLS). */
export async function listarOrcamentos(): Promise<Orcamento[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("*, clientes(nome)")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => normalizar(r as Record<string, unknown> & { clientes?: { nome: string } | null }));
}

/** Orçamento com itens (detalhe). */
export async function obterOrcamento(id: string): Promise<OrcamentoDetalhe | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("*, clientes(nome), orcamento_itens(*, produtos(nome, unidade))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown> & {
    clientes?: { nome: string } | null;
    orcamento_itens?: (Record<string, unknown> & { produtos?: { nome: string } | null })[];
  };
  const itens: OrcamentoItem[] = (row.orcamento_itens ?? [])
    .slice()
    .sort((a, b) => n(a.posicao) - n(b.posicao))
    .map((it) => ({
      id: String(it.id),
      produto_id: String(it.produto_id),
      produto_nome: it.produtos?.nome ?? null,
      quantidade: n(it.quantidade),
      preco_unitario: n(it.preco_unitario),
      subtotal: n(it.subtotal),
    }));
  return { ...normalizar(row), itens };
}

export async function registrarOrcamento(payload: OrcamentoPayload) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("registrar_orcamento", { p_payload: payload });
  return { orcamentoId: (data as string | null) ?? null, error };
}

/** Converte um orçamento em venda (aplica as travas de venda). */
export async function converterOrcamento(
  orcamentoId: string,
  pagamento: Record<string, unknown>,
) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("converter_orcamento", {
    p_orcamento: orcamentoId,
    p_pagamento: pagamento,
  });
  return { vendaId: (data as string | null) ?? null, error };
}

export async function cancelarOrcamento(orcamentoId: string, motivo: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("cancelar_orcamento", {
    p_orcamento: orcamentoId,
    p_motivo: motivo,
  });
  return { error };
}
