import { criarClienteServidor } from "@/lib/supabase/server";
import type { Cliente } from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

const COLUNAS =
  "id, nome, telefone, documento, observacoes, ativo, aniversario, lista_preco_id, " +
  "email, cep, logradouro, numero, complemento, bairro, cidade, uf, limite_credito, situacao";

function normalizar(r: Record<string, unknown>, saldo?: number): Cliente {
  return {
    id: String(r.id),
    nome: String(r.nome),
    telefone: (r.telefone as string) ?? null,
    documento: (r.documento as string) ?? null,
    observacoes: (r.observacoes as string) ?? null,
    ativo: Boolean(r.ativo),
    aniversario: (r.aniversario as string) ?? null,
    lista_preco_id: (r.lista_preco_id as string) ?? null,
    email: (r.email as string) ?? null,
    cep: (r.cep as string) ?? null,
    logradouro: (r.logradouro as string) ?? null,
    numero: (r.numero as string) ?? null,
    complemento: (r.complemento as string) ?? null,
    bairro: (r.bairro as string) ?? null,
    cidade: (r.cidade as string) ?? null,
    uf: (r.uf as string) ?? null,
    limite_credito: r.limite_credito == null ? null : n(r.limite_credito),
    situacao: (r.situacao as "geral" | "bloqueado") ?? "geral",
    saldo_devedor: saldo,
  };
}

/** Mapa cliente_id -> saldo devedor (fiado em aberto), da view. */
async function mapaSaldos(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
): Promise<Record<string, number>> {
  const { data } = await supabase.from("vw_cliente_fiado").select("cliente_id, saldo_devedor");
  const m: Record<string, number> = {};
  for (const r of (data ?? []) as { cliente_id: string; saldo_devedor: number }[]) {
    m[String(r.cliente_id)] = n(r.saldo_devedor);
  }
  return m;
}

/** Lista clientes (só ativos por padrão), com saldo devedor de fiado. */
export async function listarClientes(
  busca?: string,
  incluirInativos = false,
): Promise<Cliente[]> {
  const supabase = await criarClienteServidor();
  let query = supabase.from("clientes").select(COLUNAS).order("nome");
  if (!incluirInativos) query = query.eq("ativo", true);
  if (busca && busca.trim()) query = query.ilike("nome", `%${busca.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  const saldos = await mapaSaldos(supabase);
  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return normalizar(row, saldos[String(row.id)] ?? 0);
  });
}

/** Obtém um cliente por id (com saldo devedor). */
export async function obterCliente(id: string): Promise<Cliente | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("clientes").select(COLUNAS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: fiado } = await supabase
    .from("vw_cliente_fiado")
    .select("saldo_devedor")
    .eq("cliente_id", id)
    .maybeSingle();
  return normalizar(data as unknown as Record<string, unknown>, n(fiado?.saldo_devedor));
}
