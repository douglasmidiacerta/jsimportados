import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  ContaPagar,
  ContaPagarDetalhe,
  Pagamento,
  DespesaCategoria,
  DespesaPayload,
  Extrato,
  ExtratoLinha,
  ExtratoOrigem,
  DreMes,
  FinanceiroConfig,
  StatusContaPagar,
  TipoContaPagar,
  FormaFinanceira,
} from "./tipos";

const n = (v: unknown) => Number(v ?? 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Data de hoje (YYYY-MM-DD) no fuso do negócio (America/Sao_Paulo). */
export function hojeBRT(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return partes; // en-CA => "YYYY-MM-DD"
}

/** Primeiro dia do mês corrente (BRT), YYYY-MM-DD. */
export function inicioMesBRT(): string {
  return hojeBRT().slice(0, 8) + "01";
}

// ----------------------------- Contas a pagar -----------------------------

function mapContaPagar(
  row: Record<string, unknown> & {
    despesa_categorias?: { nome: string } | null;
    fornecedores?: { nome: string } | null;
  },
): ContaPagar {
  const valor = n(row.valor);
  const pago = n(row.valor_pago);
  const status = row.status as StatusContaPagar;
  const venc = String(row.vencimento);
  return {
    id: String(row.id),
    tipo: row.tipo as TipoContaPagar,
    categoria_id: (row.categoria_id as string) ?? null,
    categoria_nome: row.despesa_categorias?.nome ?? null,
    fornecedor_id: (row.fornecedor_id as string) ?? null,
    fornecedor_nome: row.fornecedores?.nome ?? null,
    compra_id: (row.compra_id as string) ?? null,
    descricao: String(row.descricao ?? ""),
    valor,
    competencia: String(row.competencia),
    vencimento: venc,
    status,
    valor_pago: pago,
    saldo: r2(valor - pago),
    pago_em: (row.pago_em as string) ?? null,
    observacoes: (row.observacoes as string) ?? null,
    parcial: status === "aberto" && pago > 0,
    vencida: status === "aberto" && venc < hojeBRT(),
  };
}

export async function listarContasPagar(opts?: {
  status?: StatusContaPagar;
  tipo?: TipoContaPagar;
}): Promise<ContaPagar[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("contas_pagar")
    .select("*, despesa_categorias(nome), fornecedores(nome)")
    .order("status")
    .order("vencimento");
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.tipo) query = query.eq("tipo", opts.tipo);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapContaPagar(row as Record<string, unknown>));
}

export async function obterContaPagar(
  id: string,
): Promise<ContaPagarDetalhe | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("contas_pagar")
    .select("*, despesa_categorias(nome), fornecedores(nome), pagamentos(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown> & {
    pagamentos: Array<Record<string, unknown>>;
  };
  const pagamentos: Pagamento[] = (row.pagamentos ?? [])
    .map((p) => ({
      id: String(p.id),
      conta_pagar_id: String(p.conta_pagar_id),
      data_pagamento: String(p.data_pagamento),
      valor: n(p.valor),
      forma_pagamento: (p.forma_pagamento as FormaFinanceira) ?? null,
      estorno_de: (p.estorno_de as string) ?? null,
      observacoes: (p.observacoes as string) ?? null,
      criado_em: String(p.criado_em ?? ""),
    }))
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  return { ...mapContaPagar(row), pagamentos };
}

export async function listarCategoriasDespesa(): Promise<DespesaCategoria[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("despesa_categorias")
    .select("id, nome, ativo")
    .eq("ativo", true)
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: String(c.id),
    nome: String(c.nome),
    ativo: Boolean(c.ativo),
  }));
}

// ------------------------------- Extrato ----------------------------------

const PRIO: Record<ExtratoOrigem, number> = {
  saldo_inicial: 0,
  venda: 1,
  recebimento: 2,
  pagamento: 3,
};

/**
 * Extrato (regime de caixa) na janela [inicio, fim]. A abertura é a soma de
 * todos os lançamentos anteriores a `inicio`; o saldo corrente é recomputado
 * no servidor para exibição estável.
 */
export async function lerExtrato(inicio: string, fim: string): Promise<Extrato> {
  const supabase = await criarClienteServidor();

  // Pagina o ledger em blocos para não esbarrar no cap de linhas do PostgREST
  // (que truncaria silenciosamente e erraria o saldo). Ordem estável: data, ref_id.
  const PAGINA = 1000;
  const brutas: Record<string, unknown>[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from("vw_extrato")
      .select("data, origem, descricao, entrada, saida, valor, ref_id")
      .lte("data", fim)
      .order("data", { ascending: true })
      .order("ref_id", { ascending: true, nullsFirst: true })
      .range(de, de + PAGINA - 1);
    if (error) throw error;
    const pagina = data ?? [];
    brutas.push(...(pagina as Record<string, unknown>[]));
    if (pagina.length < PAGINA) break;
  }

  const linhas = brutas.map((l) => ({
    data: String(l.data),
    origem: l.origem as ExtratoOrigem,
    descricao: String(l.descricao ?? ""),
    entrada: n(l.entrada),
    saida: n(l.saida),
    valor: n(l.valor),
    ref_id: (l.ref_id as string) ?? null,
  }));

  const abertura = r2(
    linhas.filter((l) => l.data < inicio).reduce((s, l) => s + l.valor, 0),
  );

  const janela = linhas
    .filter((l) => l.data >= inicio && l.data <= fim)
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) ||
        PRIO[a.origem] - PRIO[b.origem] ||
        (a.ref_id ?? "").localeCompare(b.ref_id ?? ""),
    );

  let saldo = abertura;
  let entradas = 0;
  let saidas = 0;
  const comSaldo: ExtratoLinha[] = janela.map((l) => {
    saldo = r2(saldo + l.valor);
    entradas += l.entrada;
    saidas += l.saida;
    return { ...l, saldo };
  });

  return {
    linhas: comSaldo,
    abertura,
    entradas: r2(entradas),
    saidas: r2(saidas),
    saldo_final: comSaldo.length ? saldo : abertura,
  };
}

// --------------------------------- DRE ------------------------------------

export async function lerDreMensal(
  inicio: string,
  fim: string,
): Promise<DreMes[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vw_dre_mensal")
    .select("*")
    .gte("mes", inicio)
    .lte("mes", fim)
    .order("mes", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const d = row as Record<string, unknown>;
    return {
      mes: String(d.mes),
      receita_produtos: n(d.receita_produtos),
      cmv: n(d.cmv),
      cmv_completo: Boolean(d.cmv_completo),
      lucro_bruto: n(d.lucro_bruto),
      despesas_operacionais: n(d.despesas_operacionais),
      taxas_cartao: n(d.taxas_cartao),
      juros_fiado: n(d.juros_fiado),
      resultado: n(d.resultado),
    };
  });
}

export async function obterFinanceiroConfig(): Promise<FinanceiroConfig> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("financeiro_config")
    .select("saldo_inicial, data_inicial")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return {
    saldo_inicial: n(data?.saldo_inicial),
    data_inicial: String(data?.data_inicial ?? hojeBRT()),
  };
}

// ------------------------------- Escritas ---------------------------------

export async function registrarDespesa(payload: DespesaPayload) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("registrar_despesa", {
    p_payload: payload,
  });
  return { contaId: (data as string | null) ?? null, error };
}

export async function pagarConta(
  id: string,
  data: string | null,
  valor: number | null,
  forma: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("pagar_conta", {
    p_conta: id,
    p_data: data,
    p_valor: valor,
    p_forma: forma,
  });
  return { error };
}

export async function estornarPagamento(pagamentoId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("estornar_pagamento", {
    p_pagamento: pagamentoId,
  });
  return { error };
}

export async function cancelarContaPagar(id: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("cancelar_conta_pagar", { p_conta: id });
  return { error };
}

export async function baixarReceber(
  id: string,
  data: string | null,
  valor: number | null,
  forma: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("baixar_receber", {
    p_conta: id,
    p_data: data,
    p_valor: valor,
    p_forma: forma,
  });
  return { error };
}

export async function estornarReceber(recebimentoId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("estornar_receber", {
    p_recebimento: recebimentoId,
  });
  return { error };
}

export async function salvarSaldoInicial(saldo: number, data: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("financeiro_config")
    .update({ saldo_inicial: saldo, data_inicial: data })
    .eq("id", true);
  return { error };
}
