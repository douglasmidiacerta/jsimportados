import { criarClienteServidor } from "@/lib/supabase/server";
import {
  hojeBRT,
  inicioMesBRT,
  listarContasPagar,
} from "./financeiro";
import { listarContasReceber } from "./contasReceber";
import { listarSessoesCaixa } from "./caixa";
import type {
  ProdutoLucro,
  VendasResumo,
  VendaDia,
  VendaForma,
  EstoqueParado,
  ClientePeriodo,
  EmAbertoResumo,
  CaixaResumo,
  ContaReceber,
  ContaPagar,
} from "./tipos";

const n = (v: unknown) => Number(v ?? 0);
export { hojeBRT, inicioMesBRT };

/** Data (YYYY-MM-DD) no fuso BRT a partir de um timestamp ISO. */
export function dataBRT(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 10);
  }
}

// ----------------------------- Lucratividade / vendas -----------------------------

export async function lucratividadeProdutos(
  inicio: string,
  fim: string,
): Promise<ProdutoLucro[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("rel_lucratividade_produtos", {
    p_inicio: inicio,
    p_fim: fim,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    produto_id: String(r.produto_id),
    nome: String(r.nome ?? ""),
    quantidade: n(r.quantidade),
    faturamento: n(r.faturamento),
    custo: n(r.custo),
    lucro: n(r.lucro),
    margem: n(r.margem),
    custo_incompleto: Boolean(r.custo_incompleto),
  }));
}

export async function vendasResumo(
  inicio: string,
  fim: string,
): Promise<VendasResumo> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("rel_vendas_resumo", {
    p_inicio: inicio,
    p_fim: fim,
  });
  if (error) throw error;
  const r = (data?.[0] ?? {}) as Record<string, unknown>;
  return {
    n_vendas: n(r.n_vendas),
    faturamento: n(r.faturamento),
    custo: n(r.custo),
    lucro: n(r.lucro),
    desconto: n(r.desconto),
    juros: n(r.juros),
    ticket_medio: n(r.ticket_medio),
    custo_completo: r.custo_completo == null ? true : Boolean(r.custo_completo),
  };
}

export async function vendasPorDia(
  inicio: string,
  fim: string,
): Promise<VendaDia[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("rel_vendas_por_dia", {
    p_inicio: inicio,
    p_fim: fim,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    dia: String(r.dia),
    n_vendas: n(r.n_vendas),
    faturamento: n(r.faturamento),
    lucro: n(r.lucro),
  }));
}

export async function vendasPorForma(
  inicio: string,
  fim: string,
): Promise<VendaForma[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("rel_vendas_por_forma", {
    p_inicio: inicio,
    p_fim: fim,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    forma: String(r.forma),
    n_vendas: n(r.n_vendas),
    faturamento: n(r.faturamento),
    lucro: n(r.lucro),
  }));
}

export async function estoqueParado(): Promise<EstoqueParado[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("vw_rel_estoque_parado").select("*");
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    produto_id: String(r.produto_id),
    nome: String(r.nome ?? ""),
    estoque_atual: n(r.estoque_atual),
    custo: r.custo == null ? null : n(r.custo),
    valor_parado: n(r.valor_parado),
    custo_ausente: Boolean(r.custo_ausente),
  }));
}

export async function clientesPeriodo(
  inicio: string,
  fim: string,
): Promise<ClientePeriodo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("rel_clientes_periodo", {
    p_inicio: inicio,
    p_fim: fim,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    cliente_id: String(r.cliente_id),
    nome: String(r.nome ?? ""),
    n_compras: n(r.n_compras),
    faturamento: n(r.faturamento),
    lucro: n(r.lucro),
    ticket_medio: n(r.ticket_medio),
    custo_completo: r.custo_completo == null ? true : Boolean(r.custo_completo),
  }));
}

// ----------------------------- Em aberto / auditoria -----------------------------

/** Resumo a receber/a pagar a partir das listas já buscadas (fonte única). */
export function resumoEmAberto(
  receber: ContaReceber[],
  pagar: ContaPagar[],
): EmAbertoResumo {
  const hoje = hojeBRT();
  const r2 = (x: number) => Math.round(x * 100) / 100;

  const recAberto = receber.filter((c) => c.status === "aberto");
  const recVencidas = recAberto.filter((c) => c.vencimento < hoje);
  const pagAberto = pagar.filter((c) => c.status === "aberto");
  const pagVencidas = pagAberto.filter((c) => c.vencida);

  const recTotal = r2(recAberto.reduce((s, c) => s + c.saldo, 0));
  const pagTotal = r2(pagAberto.reduce((s, c) => s + c.saldo, 0));

  return {
    receber: {
      total: recTotal,
      vencido: r2(recVencidas.reduce((s, c) => s + c.saldo, 0)),
      n: recAberto.length,
      nVencidas: recVencidas.length,
    },
    pagar: {
      total: pagTotal,
      vencido: r2(pagVencidas.reduce((s, c) => s + c.saldo, 0)),
      n: pagAberto.length,
      nVencidas: pagVencidas.length,
    },
    saldo: r2(recTotal - pagTotal),
  };
}

/** Sessões de caixa FECHADAS no período (auditoria), piores diferenças primeiro. */
export async function auditoriaCaixa(
  inicio: string,
  fim: string,
): Promise<CaixaResumo[]> {
  const sessoes = await listarSessoesCaixa();
  return sessoes
    .filter((s) => s.status === "fechado" && s.fechado_em != null)
    .filter((s) => {
      const d = dataBRT(s.fechado_em as string);
      return d >= inicio && d <= fim;
    })
    .sort((a, b) => Math.abs(b.diferenca ?? 0) - Math.abs(a.diferenca ?? 0));
}

/** Reexporta as buscas de contas p/ as telas montarem o drill-down. */
export { listarContasReceber, listarContasPagar };
