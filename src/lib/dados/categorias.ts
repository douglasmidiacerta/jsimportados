import { criarClienteServidor } from "@/lib/supabase/server";
import type { Categoria } from "./tipos";

/** Lista categorias (só ativas por padrão), ordenadas por nome. */
export async function listarCategorias(
  incluirInativos = false,
): Promise<Categoria[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("categorias")
    .select("id, nome, ativo")
    .order("nome");
  if (!incluirInativos) query = query.eq("ativo", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Categoria[];
}

/** Obtém uma categoria por id. */
export async function obterCategoria(id: string): Promise<Categoria | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nome, ativo")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Categoria) ?? null;
}
