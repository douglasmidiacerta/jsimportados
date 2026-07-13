import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  ContaFinanceira,
  ContaSaldo,
  LancamentoFinanceiro,
  OrigemLancamento,
  TipoContaFin,
} from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

/** Contas com saldo derivado (vw_contas_saldo). */
export async function listarContasComSaldo(): Promise<ContaSaldo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vw_contas_saldo")
    .select("id, nome, tipo, banco, recebe_pix, maquininha_id, ativo, saldo, n_lancamentos, pendentes_conciliar")
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const t = r as Record<string, unknown>;
    return {
      id: String(t.id),
      nome: String(t.nome),
      tipo: t.tipo as TipoContaFin,
      banco: (t.banco as string) ?? null,
      recebe_pix: Boolean(t.recebe_pix),
      maquininha_id: (t.maquininha_id as string) ?? null,
      ativo: Boolean(t.ativo),
      saldo: n(t.saldo),
      n_lancamentos: n(t.n_lancamentos),
      pendentes_conciliar: n(t.pendentes_conciliar),
    };
  });
}

/** Só as contas ativas — para seletores (transferência etc.). */
export async function listarContasAtivas(): Promise<ContaSaldo[]> {
  return (await listarContasComSaldo()).filter((c) => c.ativo);
}

export async function obterConta(id: string): Promise<ContaFinanceira | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("contas_financeiras")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const t = data as Record<string, unknown>;
  return {
    id: String(t.id),
    nome: String(t.nome),
    tipo: t.tipo as TipoContaFin,
    banco: (t.banco as string) ?? null,
    agencia: (t.agencia as string) ?? null,
    numero_conta: (t.numero_conta as string) ?? null,
    chave_pix: (t.chave_pix as string) ?? null,
    maquininha_id: (t.maquininha_id as string) ?? null,
    recebe_pix: Boolean(t.recebe_pix),
    saldo_inicial: n(t.saldo_inicial),
    data_inicial: String(t.data_inicial),
    observacoes: (t.observacoes as string) ?? null,
    ativo: Boolean(t.ativo),
  };
}

/** Extrato de uma conta (lançamentos, mais recente primeiro). */
export async function listarLancamentos(
  contaId: string,
  limite = 200,
): Promise<LancamentoFinanceiro[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("lancamentos_financeiros")
    .select("id, conta_id, data, valor, origem, descricao, conciliado, criado_em")
    .eq("conta_id", contaId)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const t = r as Record<string, unknown>;
    return {
      id: String(t.id),
      conta_id: String(t.conta_id),
      data: String(t.data),
      valor: n(t.valor),
      origem: t.origem as OrigemLancamento,
      descricao: (t.descricao as string) ?? null,
      conciliado: Boolean(t.conciliado),
      criado_em: String(t.criado_em),
    };
  });
}

/** Cria/edita uma conta. saldo_inicial só entra na criação (imutável depois). */
export async function salvarConta(c: {
  id?: string;
  nome: string;
  tipo: TipoContaFin;
  banco: string | null;
  agencia: string | null;
  numero_conta: string | null;
  chave_pix: string | null;
  maquininha_id: string | null;
  recebe_pix: boolean;
  saldo_inicial: number;
  observacoes: string | null;
  ativo: boolean;
}): Promise<{ id: string | null; error: { message?: string } | null }> {
  const supabase = await criarClienteServidor();
  const comum = {
    nome: c.nome,
    tipo: c.tipo,
    banco: c.banco,
    agencia: c.agencia,
    numero_conta: c.numero_conta,
    chave_pix: c.chave_pix,
    maquininha_id: c.maquininha_id,
    recebe_pix: c.recebe_pix,
    observacoes: c.observacoes,
    ativo: c.ativo,
  };
  if (c.id) {
    // saldo_inicial NÃO vai no update — o banco bloquearia (trg_contas_fin_guard).
    const { error } = await supabase.from("contas_financeiras").update(comum).eq("id", c.id);
    return { id: error ? null : c.id, error };
  }
  const { data, error } = await supabase
    .from("contas_financeiras")
    .insert({ ...comum, saldo_inicial: c.saldo_inicial })
    .select("id")
    .single();
  return { id: data?.id ?? null, error };
}

/** Conta padrão de liquidações (financeiro_config.conta_padrao_id). */
export async function obterContaPadraoId(): Promise<string | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("financeiro_config")
    .select("conta_padrao_id")
    .eq("id", true)
    .maybeSingle();
  return (data?.conta_padrao_id as string) ?? null;
}

export async function definirContaPadrao(contaId: string | null) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("financeiro_config")
    .update({ conta_padrao_id: contaId })
    .eq("id", true);
  return { error };
}

/** Transferência atômica entre contas (RPC = 2 lançamentos). */
export async function transferirEntreContas(
  origem: string,
  destino: string,
  valor: number,
  data: string | null,
  descricao: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("transferir_entre_contas", {
    p_origem: origem,
    p_destino: destino,
    p_valor: valor,
    p_data: data,
    p_descricao: descricao,
  });
  return { error };
}

/** Lançamento manual de ajuste numa conta (exige motivo). */
export async function ajustarConta(
  conta: string,
  valor: number,
  descricao: string,
  data: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("ajustar_conta_financeira", {
    p_conta: conta,
    p_valor: valor,
    p_descricao: descricao,
    p_data: data,
  });
  return { error };
}

/** Conferência em 3 pontas de uma sessão de caixa (dinheiro · Pix · cartão). */
export async function conferenciaSessao(
  sessaoId: string,
): Promise<import("./tipos").ConferenciaSessao | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("conferencia_sessao", {
    p_sessao: sessaoId,
  });
  if (error) throw error;
  return (data as import("./tipos").ConferenciaSessao) ?? null;
}
