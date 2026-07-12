import { criarClienteServidor } from "@/lib/supabase/server";
import type { Cliente } from "./tipos";

const COLUNAS = "id, nome, telefone, documento, observacoes, ativo";

/** Lista clientes (só ativos por padrão), ordenados por nome. */
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
  return (data ?? []) as Cliente[];
}

/** Obtém um cliente por id. */
export async function obterCliente(id: string): Promise<Cliente | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .select(COLUNAS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Cliente) ?? null;
}
