import { criarClienteServidor } from "@/lib/supabase/server";
import type { Categoria } from "./tipos";

const COLS = "id, nome, ativo, parent_id";

/** Lista categorias (só ativas por padrão), ordenadas por nome. Inclui subcategorias. */
export async function listarCategorias(
  incluirInativos = false,
): Promise<Categoria[]> {
  const supabase = await criarClienteServidor();
  let query = supabase.from("categorias").select(COLS).order("nome");
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
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Categoria) ?? null;
}

/**
 * Cria uma categoria (topo) ou subcategoria (com parent_id) e devolve a linha.
 * Usada pelo botão "+" do cadastro de produto (criar sem sair da tela).
 */
export async function criarCategoriaRapida(
  nome: string,
  parentId: string | null,
): Promise<{ categoria?: Categoria; erro?: string }> {
  const limpo = nome.trim();
  if (!limpo) return { erro: "Digite o nome." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .insert({ nome: limpo, parent_id: parentId })
    .select(COLS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        erro: parentId
          ? "Já existe uma subcategoria com esse nome aqui."
          : "Já existe uma categoria com esse nome.",
      };
    }
    return { erro: "Não deu para criar. Tente de novo." };
  }
  return { categoria: data as Categoria };
}
