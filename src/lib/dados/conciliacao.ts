import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  ExtratoLinha2,
  SugestaoConciliacao,
  FluxoCaixaLinha,
  ResultadoImportacao,
} from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

/** Linhas do extrato importado de uma conta (mais recente primeiro). */
export async function listarExtratoImportado(
  contaId: string,
): Promise<ExtratoLinha2[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("extrato_importado")
    .select("id, conta_id, data, valor, descricao, fitid, lancamento_id")
    .eq("conta_id", contaId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const t = r as Record<string, unknown>;
    return {
      id: String(t.id),
      conta_id: String(t.conta_id),
      data: String(t.data),
      valor: n(t.valor),
      descricao: (t.descricao as string) ?? null,
      fitid: String(t.fitid),
      lancamento_id: (t.lancamento_id as string) ?? null,
      conciliado: t.lancamento_id != null,
    };
  });
}

/** Importa linhas parseadas de OFX/CSV (RPC dedupe por fitid). */
export async function importarExtrato(
  contaId: string,
  linhas: { data: string; valor: number; descricao: string | null; fitid: string }[],
): Promise<{ resultado: ResultadoImportacao | null; error: { message?: string } | null }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("importar_extrato", {
    p_conta: contaId,
    p_linhas: linhas,
  });
  return { resultado: (data as ResultadoImportacao) ?? null, error };
}

/** Sugestões de casamento (valor igual, data ±3 dias). */
export async function sugestoesConciliacao(
  contaId: string,
): Promise<SugestaoConciliacao[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("sugestoes_conciliacao", {
    p_conta: contaId,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    extrato_id: String(r.extrato_id),
    extrato_data: String(r.extrato_data),
    extrato_valor: n(r.extrato_valor),
    extrato_desc: (r.extrato_desc as string) ?? null,
    lancamento_id: String(r.lancamento_id),
    lancamento_data: String(r.lancamento_data),
    lancamento_desc: (r.lancamento_desc as string) ?? null,
    dias: n(r.dias),
  }));
}

export async function conciliarLinha(extratoId: string, lancamentoId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("conciliar_linha", {
    p_extrato: extratoId,
    p_lancamento: lancamentoId,
  });
  return { error };
}

export async function desconciliarLinha(extratoId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("desconciliar_linha", {
    p_extrato: extratoId,
  });
  return { error };
}

/** Fluxo de caixa por conta num período (rel_fluxo_caixa). */
export async function relFluxoCaixa(
  inicio: string,
  fim: string,
): Promise<FluxoCaixaLinha[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("rel_fluxo_caixa", {
    p_inicio: inicio,
    p_fim: fim,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    conta_id: String(r.conta_id),
    conta_nome: String(r.conta_nome),
    saldo_inicial: n(r.saldo_inicial),
    entradas: n(r.entradas),
    saidas: n(r.saidas),
    saldo_final: n(r.saldo_final),
  }));
}
