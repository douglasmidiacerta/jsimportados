import { criarClienteServidor } from "@/lib/supabase/server";
import type { Fornecedor } from "./tipos";

const COLUNAS = "id, nome, contato, telefone, cidade, pais, observacoes, ativo";

/** Lista fornecedores (só ativos por padrão). Só gestão enxerga (RLS). */
export async function listarFornecedores(
  busca?: string,
  incluirInativos = false,
): Promise<Fornecedor[]> {
  const supabase = await criarClienteServidor();
  let query = supabase.from("fornecedores").select(COLUNAS).order("nome");
  if (!incluirInativos) query = query.eq("ativo", true);
  if (busca && busca.trim()) query = query.ilike("nome", `%${busca.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Fornecedor[];
}

/** Obtém um fornecedor por id. */
export async function obterFornecedor(id: string): Promise<Fornecedor | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("fornecedores")
    .select(COLUNAS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Fornecedor) ?? null;
}
