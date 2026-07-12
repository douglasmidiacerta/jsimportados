"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirGestao } from "@/lib/perfil";
import type { EstadoForm } from "@/lib/dados/tipos";

function revalidar() {
  revalidatePath("/gestao/categorias");
  revalidatePath("/gestao/produtos");
}

function erroMsg(error: { code?: string }): string {
  if (error.code === "23505")
    return "Já existe uma categoria com esse nome.";
  return "Não deu para salvar. Tente de novo.";
}

export async function criarCategoria(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const nome = String(fd.get("nome") ?? "").trim();
  if (!nome) return { erro: "Digite o nome da categoria." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("categorias").insert({ nome });
  if (error) return { erro: erroMsg(error) };

  revalidar();
  redirect("/gestao/categorias");
}

export async function atualizarCategoria(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const nome = String(fd.get("nome") ?? "").trim();
  if (!id) return { erro: "Categoria não encontrada." };
  if (!nome) return { erro: "Digite o nome da categoria." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("categorias")
    .update({ nome })
    .eq("id", id);
  if (error) return { erro: erroMsg(error) };

  revalidar();
  redirect("/gestao/categorias");
}

export async function definirAtivoCategoria(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "true";
  if (!id) redirect("/gestao/categorias");

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("categorias")
    .update({ ativo })
    .eq("id", id);
  if (error) redirect(`/gestao/categorias/${id}?erro=ativo`);

  revalidar();
  redirect("/gestao/categorias");
}
