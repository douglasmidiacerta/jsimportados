import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  CaixaResumo,
  CaixaMovimento,
  CaixaStatus,
  CaixaTipoMov,
  CaixaMeio,
  FechamentoResumo,
} from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

function normalizarResumo(r: Record<string, unknown>): CaixaResumo {
  return {
    id: String(r.id),
    status: r.status as CaixaStatus,
    valor_abertura: n(r.valor_abertura),
    valor_contado: r.valor_contado == null ? null : n(r.valor_contado),
    esperado_dinheiro: r.esperado_dinheiro == null ? null : n(r.esperado_dinheiro),
    diferenca: r.diferenca == null ? null : n(r.diferenca),
    observacoes_abertura: (r.observacoes_abertura as string) ?? null,
    observacoes_fechamento: (r.observacoes_fechamento as string) ?? null,
    aberto_por: (r.aberto_por as string) ?? null,
    aberto_em: String(r.aberto_em),
    fechado_em: (r.fechado_em as string) ?? null,
    vendas_dinheiro: n(r.vendas_dinheiro),
    vendas_pix: n(r.vendas_pix),
    suprimentos: n(r.suprimentos),
    sangrias: n(r.sangrias),
    ajustes: n(r.ajustes),
    esperado_dinheiro_atual: n(r.esperado_dinheiro_atual),
    n_movimentos: n(r.n_movimentos),
  };
}

/** Sessão de caixa aberta no momento (ou null). */
export async function obterCaixaAberto(): Promise<CaixaResumo | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vw_caixa_resumo")
    .select("*")
    .eq("status", "aberto")
    .maybeSingle();
  if (error) throw error;
  return data ? normalizarResumo(data as Record<string, unknown>) : null;
}

/** Resumo de uma sessão específica. */
export async function obterSessaoResumo(
  id: string,
): Promise<CaixaResumo | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vw_caixa_resumo")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizarResumo(data as Record<string, unknown>) : null;
}

/** Histórico de sessões de caixa (gestão). */
export async function listarSessoesCaixa(): Promise<CaixaResumo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vw_caixa_resumo")
    .select("*")
    .order("aberto_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => normalizarResumo(r as Record<string, unknown>));
}

/** Movimentos de uma sessão. */
export async function listarMovimentos(
  sessaoId: string,
): Promise<CaixaMovimento[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("caixa_movimentos")
    .select("id, sessao_id, tipo, meio, valor, venda_id, observacoes, criado_em")
    .eq("sessao_id", sessaoId)
    .order("criado_em");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const m = r as Record<string, unknown>;
    return {
      id: String(m.id),
      sessao_id: String(m.sessao_id),
      tipo: m.tipo as CaixaTipoMov,
      meio: m.meio as CaixaMeio,
      valor: n(m.valor),
      venda_id: (m.venda_id as string) ?? null,
      observacoes: (m.observacoes as string) ?? null,
      criado_em: String(m.criado_em),
    };
  });
}

/** Totais de cartão/fiado vinculados à sessão (gestão). */
export async function totaisAReceberDaSessao(
  sessaoId: string,
): Promise<{ cartao: number; fiado: number }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vendas")
    .select("forma_pagamento, total")
    .eq("caixa_sessao_id", sessaoId);
  if (error) throw error;
  let cartao = 0;
  let fiado = 0;
  for (const r of data ?? []) {
    const row = r as { forma_pagamento: string; total: unknown };
    if (row.forma_pagamento === "cartao") cartao += n(row.total);
    else if (row.forma_pagamento === "fiado") fiado += n(row.total);
  }
  return { cartao, fiado };
}

/**
 * Quanto sobrou na gaveta no último fechamento (null se nunca fechou um caixa).
 *
 * ⚠️ SÓ pode ser chamada DENTRO da Server Action, depois que a pessoa já digitou
 * a contagem dela. NUNCA no render da página de abertura: o valor iria ao
 * cliente no payload do RSC e entregaria a resposta antes da pergunta —
 * furando a contagem às cegas, igual ao esperado_dinheiro_atual.
 */
export async function ultimoFechamento(): Promise<number | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("ultimo_fechamento_caixa");
  if (error || data == null) return null;
  return Number(data);
}

/** Abre o caixa (via RPC). */
export async function abrirCaixa(valor: number, obs: string | null) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("abrir_caixa", {
    p_valor: valor,
    p_obs: obs,
  });
  return { sessaoId: (data as string | null) ?? null, error };
}

/** Registra sangria/suprimento/ajuste (via RPC). */
export async function movimentarCaixa(
  tipo: "sangria" | "suprimento" | "ajuste",
  valor: number,
  obs: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("movimentar_caixa", {
    p_tipo: tipo,
    p_valor: valor,
    p_obs: obs,
  });
  return { error };
}

/** Fecha o caixa (via RPC). Retorna o resumo do fechamento. */
export async function fecharCaixa(contado: number, obs: string | null) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("fechar_caixa", {
    p_contado: contado,
    p_obs: obs,
  });
  const d = (data ?? null) as Record<string, unknown> | null;
  const resumo: FechamentoResumo | null = d
    ? {
        sessao_id: String(d.sessao_id),
        esperado: n(d.esperado),
        contado: n(d.contado),
        diferenca: n(d.diferenca),
        vendas_dinheiro: n(d.vendas_dinheiro),
        vendas_pix: n(d.vendas_pix),
        suprimentos: n(d.suprimentos),
        sangrias: n(d.sangrias),
        ajustes: n(d.ajustes),
        cartao: n(d.cartao),
        fiado: n(d.fiado),
      }
    : null;
  return { resumo, error };
}
