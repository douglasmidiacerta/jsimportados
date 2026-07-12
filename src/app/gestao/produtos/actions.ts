"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirGestao } from "@/lib/perfil";
import { parseMoedaBR } from "@/lib/formato";
import { criarCategoriaRapida } from "@/lib/dados/categorias";
import type { Categoria, EstadoForm } from "@/lib/dados/tipos";

function revalidarProdutos() {
  revalidatePath("/gestao/produtos");
  revalidatePath("/balcao/estoque");
}

function mensagemErro(error: { code?: string; message?: string }): string {
  if (error.code === "23505") {
    return "Já existe um produto com esse nome nessa categoria.";
  }
  return "Não deu para salvar. Tente de novo.";
}

/** Texto opcional: string vazia -> null. */
function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
}
/** Número opcional (moeda/qtd em formato BR): vazio -> null. */
function numOpc(fd: FormData, k: string): number | null {
  const v = String(fd.get(k) ?? "").trim();
  return v ? parseMoedaBR(v) : null;
}
/** Interruptor: hidden input "true"/"false". */
function bool(fd: FormData, k: string): boolean {
  return String(fd.get(k) ?? "") === "true";
}

// Obs.: o custo NÃO é definido aqui — é o custo médio/última compra, mantido
// pelas compras (trigger de estoque). Editar o produto não mexe no custo.
function lerCampos(fd: FormData) {
  return {
    nome: String(fd.get("nome") ?? "").trim(),
    categoria_id: txt(fd, "categoria_id"),
    subcategoria_id: txt(fd, "subcategoria_id"),
    unidade: String(fd.get("unidade") ?? "un").trim() || "un",
    marca: txt(fd, "marca"),
    modelo: txt(fd, "modelo"),
    preco_venda: parseMoedaBR(String(fd.get("preco_venda") ?? "")),
    preco_atacado: numOpc(fd, "preco_atacado"),
    qtde_min_atacado: numOpc(fd, "qtde_min_atacado"),
    foto_path: txt(fd, "foto_path"),
    observacoes: txt(fd, "observacoes"),
    loja_ativo: bool(fd, "loja_ativo"),
    destaque_home: bool(fd, "destaque_home"),
    descricao: txt(fd, "descricao"),
    garantia: txt(fd, "garantia"),
    itens_inclusos: txt(fd, "itens_inclusos"),
    especificacoes: txt(fd, "especificacoes"),
  };
}

/** Lê a galeria (JSON de paths ordenados) enviada pelo campo oculto. */
function lerFotos(fd: FormData): string[] {
  try {
    const arr = JSON.parse(String(fd.get("fotos") ?? "[]"));
    return Array.isArray(arr)
      ? arr
          .map((p) => (typeof p === "string" ? p.trim() : ""))
          .filter((p) => p.length > 0)
      : [];
  } catch {
    return [];
  }
}

/**
 * Substitui a galeria do produto pelo conjunto atual, de forma ATÔMICA (RPC):
 * o delete + insert acontecem numa transação só — se algo falhar, a galeria
 * antiga é preservada (nada de perda silenciosa). Retorna false em falha.
 */
async function sincronizarFotos(
  supabase: SupabaseClient,
  produtoId: string,
  paths: string[],
): Promise<boolean> {
  const { error } = await supabase.rpc("sincronizar_produto_fotos", {
    p_produto_id: produtoId,
    p_paths: paths,
  });
  return !error;
}

export async function criarProduto(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const c = lerCampos(fd);
  if (!c.nome) return { erro: "Digite o nome do produto." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("produtos")
    .insert(c)
    .select("id")
    .single();
  if (error) return { erro: mensagemErro(error) };

  const okFotos = await sincronizarFotos(supabase, data.id, lerFotos(fd));
  revalidarProdutos();
  // Produto criado; se as fotos falharem, leva à edição avisando (evita duplicar).
  redirect(okFotos ? "/gestao/produtos" : `/gestao/produtos/${data.id}?erro=fotos`);
}

export async function atualizarProduto(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  if (!id) return { erro: "Produto não encontrado." };
  const c = lerCampos(fd);
  if (!c.nome) return { erro: "Digite o nome do produto." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("produtos").update(c).eq("id", id);
  if (error) return { erro: mensagemErro(error) };

  const okFotos = await sincronizarFotos(supabase, id, lerFotos(fd));
  revalidarProdutos();
  // Se as fotos falharem, a galeria antiga é preservada (RPC atômica); avisa.
  redirect(okFotos ? "/gestao/produtos" : `/gestao/produtos/${id}?erro=fotos`);
}

/** Arquiva (ativo=false) ou reativa (ativo=true) um produto. */
export async function definirAtivoProduto(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "true";
  if (!id) redirect("/gestao/produtos");

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("produtos")
    .update({ ativo })
    .eq("id", id);
  if (error) redirect(`/gestao/produtos/${id}?erro=ativo`);

  revalidarProdutos();
  redirect("/gestao/produtos");
}

/**
 * Cria categoria/subcategoria "na hora" (botão "+" do cadastro). Chamada pelo
 * cliente; devolve a categoria criada (ou erro) para atualizar o select.
 */
export async function criarCategoriaAction(
  nome: string,
  parentId: string | null,
): Promise<{ categoria?: Categoria; erro?: string }> {
  await exigirGestao();
  return criarCategoriaRapida(nome, parentId);
}
