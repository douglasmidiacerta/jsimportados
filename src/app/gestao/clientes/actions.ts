"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirPerfil, exigirGestao } from "@/lib/perfil";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

function lerCampos(fd: FormData) {
  const opt = (k: string) => (String(fd.get(k) ?? "").trim() || null);
  const limiteTxt = String(fd.get("limite_credito") ?? "").trim();
  const uf = opt("uf");
  return {
    nome: String(fd.get("nome") ?? "").trim(),
    telefone: opt("telefone"),
    documento: opt("documento"),
    observacoes: opt("observacoes"),
    aniversario: opt("aniversario"), // Fase 7 (YYYY-MM-DD ou null)
    lista_preco_id: opt("lista_preco_id"), // Fase 7 (uuid ou null = Varejo)
    // Leva D — Cliente 2.0
    email: opt("email"),
    cep: opt("cep"),
    logradouro: opt("logradouro"),
    numero: opt("numero"),
    complemento: opt("complemento"),
    bairro: opt("bairro"),
    cidade: opt("cidade"),
    uf: uf && /^[A-Za-z]{2}$/.test(uf) ? uf.toUpperCase() : null,
    limite_credito: limiteTxt ? parseMoedaBR(limiteTxt) : null,
    situacao: String(fd.get("bloqueado") ?? "") === "true" ? "bloqueado" : "geral",
  };
}

export async function criarCliente(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirPerfil(); // operação também pode cadastrar cliente
  const c = lerCampos(fd);
  if (!c.nome) return { erro: "Digite o nome do cliente." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("clientes").insert(c);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };

  revalidatePath("/gestao/clientes");
  redirect("/gestao/clientes");
}

export async function atualizarCliente(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  if (!id) return { erro: "Cliente não encontrado." };
  const c = lerCampos(fd);
  if (!c.nome) return { erro: "Digite o nome do cliente." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("clientes").update(c).eq("id", id);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };

  revalidatePath("/gestao/clientes");
  redirect("/gestao/clientes");
}

export async function definirAtivoCliente(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "true";
  if (!id) redirect("/gestao/clientes");

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("clientes")
    .update({ ativo })
    .eq("id", id);
  if (error) redirect(`/gestao/clientes/${id}?erro=ativo`);

  revalidatePath("/gestao/clientes");
  redirect("/gestao/clientes");
}
