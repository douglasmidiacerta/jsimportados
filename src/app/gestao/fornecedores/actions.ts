"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirGestao } from "@/lib/perfil";
import type { EstadoForm } from "@/lib/dados/tipos";

function erroMsg(error: { code?: string }): string {
  if (error.code === "23505")
    return "Já existe um fornecedor com esse nome.";
  return "Não deu para salvar. Tente de novo.";
}

function lerCampos(fd: FormData) {
  const opt = (k: string) => (String(fd.get(k) ?? "").trim() || null);
  return {
    nome: String(fd.get("nome") ?? "").trim(),
    contato: opt("contato"),
    telefone: opt("telefone"),
    cidade: opt("cidade"),
    pais: String(fd.get("pais") ?? "").trim() || "Paraguai",
    observacoes: opt("observacoes"),
  };
}

export async function criarFornecedor(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const c = lerCampos(fd);
  if (!c.nome) return { erro: "Digite o nome do fornecedor." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("fornecedores").insert(c);
  if (error) return { erro: erroMsg(error) };

  revalidatePath("/gestao/fornecedores");
  redirect("/gestao/fornecedores");
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
  const { error } = await supabase
    .from("fornecedores")
    .update(c)
    .eq("id", id);
  if (error) return { erro: erroMsg(error) };

  revalidatePath("/gestao/fornecedores");
  redirect("/gestao/fornecedores");
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
