"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import {
  convidarUsuario,
  revogarConvite,
  definirPapelUsuario,
  definirAtivoUsuario,
  definirCadastroAberto,
  type Papel,
} from "@/lib/dados/usuarios";
import type { EstadoForm } from "@/lib/dados/tipos";

function traduz(error: { message?: string } | null): string {
  const msg = error?.message ?? "";
  if (/ultimo gestor|ao menos um gestor/i.test(msg)) return "Precisa de ao menos um gestor ativo.";
  if (/si mesmo|se rebaixar/i.test(msg)) return "Você não pode fazer isso com a sua própria conta.";
  if (/ja existe um usuario/i.test(msg)) return "Já existe um usuário com esse e-mail.";
  if (/invalido/i.test(msg)) return "E-mail inválido.";
  if (/permiss|gestao/i.test(msg)) return "Apenas a gestão pode fazer isso.";
  return "Não deu para concluir. Tente de novo.";
}

export async function convidarAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const email = String(fd.get("email") ?? "").trim();
  const papel = (String(fd.get("papel") ?? "operacao") as Papel);
  if (!email) return { erro: "Digite o e-mail para convidar." };

  const { error } = await convidarUsuario(email, papel);
  if (error) return { erro: traduz(error) };

  revalidatePath("/gestao/usuarios");
  return {};
}

export async function revogarConviteAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const email = String(fd.get("email") ?? "");
  if (email) await revogarConvite(email);
  revalidatePath("/gestao/usuarios");
  redirect("/gestao/usuarios");
}

export async function definirPapelAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const papel = String(fd.get("papel") ?? "operacao") as Papel;
  const { error } = await definirPapelUsuario(id, papel);
  revalidatePath("/gestao/usuarios");
  redirect(error ? `/gestao/usuarios?erro=${encodeURIComponent(traduz(error))}` : "/gestao/usuarios");
}

export async function definirAtivoAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "true";
  const { error } = await definirAtivoUsuario(id, ativo);
  revalidatePath("/gestao/usuarios");
  redirect(error ? `/gestao/usuarios?erro=${encodeURIComponent(traduz(error))}` : "/gestao/usuarios");
}

export async function definirCadastroAbertoAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const aberto = String(fd.get("aberto") ?? "") === "true";
  const { error } = await definirCadastroAberto(aberto);
  revalidatePath("/gestao/usuarios");
  redirect(error ? `/gestao/usuarios?erro=${encodeURIComponent(traduz(error))}` : "/gestao/usuarios");
}
