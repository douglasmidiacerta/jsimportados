"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import {
  criarCategoriaDespesa,
  renomearCategoriaDespesa,
  definirAtivoCategoriaDespesa,
} from "@/lib/dados/resultado";

function volta(erro?: string) {
  redirect(erro ? `/gestao/plano-contas?erro=${erro}` : "/gestao/plano-contas");
}

export async function criarCategoriaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const nome = String(fd.get("nome") ?? "").trim();
  if (!nome) volta("nome");
  const { error } = await criarCategoriaDespesa(nome);
  revalidatePath("/gestao/plano-contas");
  volta(error ? "dup" : undefined);
}

export async function renomearCategoriaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const nome = String(fd.get("nome") ?? "").trim();
  if (!id || !nome) volta("nome");
  const { error } = await renomearCategoriaDespesa(id, nome);
  revalidatePath("/gestao/plano-contas");
  volta(error ? "dup" : undefined);
}

export async function arquivarCategoriaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "true";
  if (id) await definirAtivoCategoriaDespesa(id, ativo);
  revalidatePath("/gestao/plano-contas");
  volta();
}
