"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import {
  criarLista,
  atualizarLista,
  tornarPadrao,
  apagarLista,
  definirPreco,
  removerPreco,
} from "@/lib/dados/listasPreco";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

function traduzErro(error: { message?: string } | null): string {
  const msg = error?.message ?? "";
  if (/padrao nao pode ser apagada/i.test(msg))
    return "A lista padrão não pode ser apagada. Defina outra como padrão antes.";
  if (/padrao nao pode ser desativada/i.test(msg))
    return "A lista padrão não pode ser desativada. Defina outra como padrão antes.";
  if (/duplicate|unique|ja existe/i.test(msg))
    return "Já existe uma lista com esse nome.";
  return "Não deu para concluir. Tente de novo.";
}

export async function criarListaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const nome = String(fd.get("nome") ?? "").trim();
  const ordem = Number(fd.get("ordem") ?? 100) || 100;
  if (!nome) return { erro: "Digite o nome da lista." };

  const { error } = await criarLista(nome, ordem);
  if (error) return { erro: traduzErro(error) };

  revalidatePath("/gestao/listas-preco");
  redirect("/gestao/listas-preco");
}

export async function renomearListaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const nome = String(fd.get("nome") ?? "").trim();
  const ordem = Number(fd.get("ordem") ?? 100) || 100;
  if (!id) return { erro: "Lista não encontrada." };
  if (!nome) return { erro: "Digite o nome da lista." };

  const { error } = await atualizarLista(id, { nome, ordem });
  if (error) return { erro: traduzErro(error) };

  revalidatePath("/gestao/listas-preco");
  redirect("/gestao/listas-preco");
}

export async function tornarPadraoAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  if (id) await tornarPadrao(id);
  revalidatePath("/gestao/listas-preco");
  redirect("/gestao/listas-preco");
}

export async function definirAtivoListaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "true";
  if (!id) redirect("/gestao/listas-preco");
  const { error } = await atualizarLista(id, { ativo });
  if (error) redirect("/gestao/listas-preco?erro=guard");
  revalidatePath("/gestao/listas-preco");
  redirect("/gestao/listas-preco");
}

export async function apagarListaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  if (!id) redirect("/gestao/listas-preco");
  const { error } = await apagarLista(id);
  if (error) redirect("/gestao/listas-preco?erro=guard");
  revalidatePath("/gestao/listas-preco");
  redirect("/gestao/listas-preco");
}

/** Edição inline de preço na matriz da lista (e no bloco do produto). */
export async function definirPrecoAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const produtoId = String(fd.get("produto_id") ?? "");
  const listaId = String(fd.get("lista_id") ?? "");
  const bruto = String(fd.get("preco") ?? "").trim();
  const revalidar = String(fd.get("revalidar") ?? "");
  if (!produtoId || !listaId) return;

  if (bruto === "") {
    await removerPreco(produtoId, listaId);
  } else {
    const preco = parseMoedaBR(bruto);
    if (preco > 0) await definirPreco(produtoId, listaId, preco);
    else await removerPreco(produtoId, listaId);
  }
  if (revalidar) revalidatePath(revalidar);
}
