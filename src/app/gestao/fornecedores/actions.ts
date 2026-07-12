"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirGestao } from "@/lib/perfil";
import type { EstadoForm } from "@/lib/dados/tipos";

function erroMsg(error: { code?: string }): string {
  if (error.code === "23505") return "Já existe um fornecedor com esse nome.";
  return "Não deu para salvar. Tente de novo.";
}

function lerCampos(fd: FormData) {
  const opt = (k: string) => String(fd.get(k) ?? "").trim() || null;
  return {
    nome: String(fd.get("nome") ?? "").trim(),
    tipo_pessoa:
      String(fd.get("tipo_pessoa") ?? "") === "fisica" ? "fisica" : "juridica",
    situacao:
      String(fd.get("situacao") ?? "") === "bloqueado" ? "bloqueado" : "geral",
    razao_social: opt("razao_social"),
    nome_fantasia: opt("nome_fantasia"),
    documento: opt("documento"),
    contato: opt("contato"),
    telefone: opt("telefone"),
    celular: opt("celular"),
    email: opt("email"),
    site: opt("site"),
    cidade: opt("cidade"),
    pais: String(fd.get("pais") ?? "").trim() || "Paraguai",
    eh_transportadora: String(fd.get("eh_transportadora") ?? "") === "true",
    observacoes: opt("observacoes"),
  };
}

function lerColecao(fd: FormData, k: string): unknown[] {
  try {
    const arr = JSON.parse(String(fd.get(k) ?? "[]"));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Salva as 4 coleções filhas de forma ATÔMICA (RPC). Retorna false em falha. */
async function salvarFilhos(
  supabase: SupabaseClient,
  fornecedorId: string,
  fd: FormData,
): Promise<boolean> {
  const documentos = lerColecao(fd, "documentos");
  const novosPaths = new Set(
    documentos
      .map((d) => (d as { arquivo_path?: string }).arquivo_path)
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0),
  );
  // Paths salvos ANTES (para apagar do storage os documentos removidos).
  const { data: antigos } = await supabase
    .from("fornecedor_documentos")
    .select("arquivo_path")
    .eq("fornecedor_id", fornecedorId);

  const { error } = await supabase.rpc("salvar_fornecedor_filhos", {
    p_fornecedor_id: fornecedorId,
    p_enderecos: lerColecao(fd, "enderecos"),
    p_contatos: lerColecao(fd, "contatos"),
    p_bancos: lerColecao(fd, "bancos"),
    p_documentos: documentos,
  });
  if (error) return false;

  // Documentos que saíram: apaga do bucket privado (não deixa órfão sensível).
  const removidos = (antigos ?? [])
    .map((r) => r.arquivo_path as string)
    .filter((p) => p && !novosPaths.has(p));
  if (removidos.length) {
    try {
      await supabase.storage.from("fornecedor-docs").remove(removidos);
    } catch {
      /* best-effort */
    }
  }
  return true;
}

export async function criarFornecedor(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const c = lerCampos(fd);
  if (!c.nome) return { erro: "Digite o nome do fornecedor." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("fornecedores")
    .insert(c)
    .select("id")
    .single();
  if (error) return { erro: erroMsg(error) };

  const ok = await salvarFilhos(supabase, data.id, fd);
  revalidatePath("/gestao/fornecedores");
  redirect(ok ? "/gestao/fornecedores" : `/gestao/fornecedores/${data.id}?erro=filhos`);
}

export async function atualizarFornecedor(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  if (!id) return { erro: "Fornecedor não encontrado." };
  const c = lerCampos(fd);
  if (!c.nome) return { erro: "Digite o nome do fornecedor." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("fornecedores").update(c).eq("id", id);
  if (error) return { erro: erroMsg(error) };

  const ok = await salvarFilhos(supabase, id, fd);
  revalidatePath("/gestao/fornecedores");
  redirect(ok ? "/gestao/fornecedores" : `/gestao/fornecedores/${id}?erro=filhos`);
}

export async function definirAtivoFornecedor(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "true";
  if (!id) redirect("/gestao/fornecedores");

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("fornecedores")
    .update({ ativo })
    .eq("id", id);
  if (error) redirect(`/gestao/fornecedores/${id}?erro=ativo`);

  revalidatePath("/gestao/fornecedores");
  redirect("/gestao/fornecedores");
}
