import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  CarteiraCliente,
  Aniversariante,
  Etiqueta,
  CrmInteracao,
  CrmTipo,
  CrmLembretePendente,
  Cliente,
  Venda,
} from "./tipos";
import { obterCliente } from "./clientes";
import { listarVendasDoCliente } from "./vendas";

const n = (v: unknown) => Number(v ?? 0);

/** Data de hoje (YYYY-MM-DD) no fuso do negócio. */
function hojeBRT(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function mesBRT(): number {
  return Number(hojeBRT().slice(5, 7));
}

function mapEtiqueta(r: Record<string, unknown>): Etiqueta {
  return {
    id: String(r.id),
    nome: String(r.nome),
    cor: String(r.cor ?? "accent"),
    ativo: Boolean(r.ativo),
  };
}
function mapInteracao(r: Record<string, unknown>): CrmInteracao {
  return {
    id: String(r.id),
    cliente_id: String(r.cliente_id),
    tipo: r.tipo as CrmTipo,
    texto: String(r.texto ?? ""),
    lembrete_em: (r.lembrete_em as string) ?? null,
    concluido: Boolean(r.concluido),
    criado_em: String(r.criado_em ?? ""),
  };
}

// ----------------------------- Carteira / aniversário -----------------------------

export async function carteiraClientes(): Promise<CarteiraCliente[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vw_carteira_clientes")
    .select("*")
    .order("total_comprado", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      cliente_id: String(row.cliente_id),
      nome: String(row.nome),
      telefone: (row.telefone as string) ?? null,
      n_compras: n(row.n_compras),
      total_comprado: n(row.total_comprado),
      ultima_compra: (row.ultima_compra as string) ?? null,
      ticket_medio: n(row.ticket_medio),
      ranking: n(row.ranking),
    };
  });
}

export async function aniversariantesDoMes(
  mes?: number,
): Promise<Aniversariante[]> {
  const supabase = await criarClienteServidor();
  const alvo = mes ?? mesBRT();
  const { data, error } = await supabase
    .from("vw_aniversariantes")
    .select("*")
    .eq("mes", alvo)
    .order("dia");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      cliente_id: String(row.cliente_id),
      nome: String(row.nome),
      telefone: (row.telefone as string) ?? null,
      aniversario: String(row.aniversario),
      mes: n(row.mes),
      dia: n(row.dia),
    };
  });
}

// ----------------------------- Etiquetas -----------------------------

export async function listarEtiquetas(
  incluirInativas = false,
): Promise<Etiqueta[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("etiquetas")
    .select("id, nome, cor, ativo")
    .order("nome");
  if (!incluirInativas) query = query.eq("ativo", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => mapEtiqueta(r as Record<string, unknown>));
}

export async function criarEtiqueta(nome: string, cor = "accent") {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("etiquetas")
    .insert({ nome: nome.trim(), cor })
    .select("id")
    .single();
  return { id: (data?.id as string) ?? null, error };
}

export async function arquivarEtiqueta(id: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("etiquetas")
    .update({ ativo: false })
    .eq("id", id);
  return { error };
}

export async function etiquetasDoCliente(clienteId: string): Promise<Etiqueta[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("cliente_etiquetas")
    .select("etiquetas(id, nome, cor, ativo)")
    .eq("cliente_id", clienteId);
  if (error) throw error;
  return (data ?? [])
    .map((r) => {
      const e = (r as unknown as { etiquetas: unknown }).etiquetas;
      return Array.isArray(e) ? e[0] : e;
    })
    .filter((e): e is Record<string, unknown> => !!e)
    .map(mapEtiqueta);
}

export async function marcarEtiqueta(clienteId: string, etiquetaId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("cliente_etiquetas")
    .upsert(
      { cliente_id: clienteId, etiqueta_id: etiquetaId },
      { onConflict: "cliente_id,etiqueta_id", ignoreDuplicates: true },
    );
  return { error };
}

export async function desmarcarEtiqueta(clienteId: string, etiquetaId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("cliente_etiquetas")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("etiqueta_id", etiquetaId);
  return { error };
}

// ----------------------------- Interações / lembretes -----------------------------

export async function listarInteracoes(
  clienteId: string,
): Promise<CrmInteracao[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("crm_interacoes")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapInteracao(r as Record<string, unknown>));
}

export async function criarInteracao(
  clienteId: string,
  tipo: CrmTipo,
  texto: string,
  lembreteEm: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("crm_interacoes").insert({
    cliente_id: clienteId,
    tipo,
    texto: texto.trim(),
    lembrete_em: tipo === "lembrete" ? lembreteEm : null,
  });
  return { error };
}

export async function concluirLembrete(id: string, concluido = true) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("crm_interacoes")
    .update({ concluido })
    .eq("id", id);
  return { error };
}

export async function apagarInteracao(id: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("crm_interacoes").delete().eq("id", id);
  return { error };
}

/** Lembretes em aberto com data até hoje (dashboard). */
export async function lembretesPendentes(): Promise<CrmLembretePendente[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("crm_interacoes")
    .select("*, clientes(nome)")
    .eq("tipo", "lembrete")
    .eq("concluido", false)
    .lte("lembrete_em", hojeBRT())
    .order("lembrete_em");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown> & { clientes: { nome: string } | null };
    return { ...mapInteracao(row), cliente_nome: row.clientes?.nome ?? "" };
  });
}

// ----------------------------- Cliente 360 -----------------------------

export type Cliente360 = {
  cliente: Cliente;
  etiquetas: Etiqueta[];
  interacoes: CrmInteracao[];
  historico: Venda[];
  carteira: CarteiraCliente | null;
};

export async function cliente360(clienteId: string): Promise<Cliente360 | null> {
  const cliente = await obterCliente(clienteId);
  if (!cliente) return null;
  const supabase = await criarClienteServidor();
  const [etiquetas, interacoes, historico, carteiraRow] = await Promise.all([
    etiquetasDoCliente(clienteId),
    listarInteracoes(clienteId),
    listarVendasDoCliente(clienteId),
    supabase
      .from("vw_carteira_clientes")
      .select("*")
      .eq("cliente_id", clienteId)
      .maybeSingle(),
  ]);
  const c = carteiraRow.data as Record<string, unknown> | null;
  const carteira: CarteiraCliente | null = c
    ? {
        cliente_id: String(c.cliente_id),
        nome: String(c.nome),
        telefone: (c.telefone as string) ?? null,
        n_compras: n(c.n_compras),
        total_comprado: n(c.total_comprado),
        ultima_compra: (c.ultima_compra as string) ?? null,
        ticket_medio: n(c.ticket_medio),
        ranking: n(c.ranking),
      }
    : null;
  return { cliente, etiquetas, interacoes, historico, carteira };
}
