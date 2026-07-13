"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { devolverVenda, cancelarVenda } from "@/lib/dados/vendas";
import type { EstadoForm } from "@/lib/dados/tipos";

function traduz(error: { message?: string } | null): string {
  const msg = error?.message ?? "";
  if (/Estorne os recebimentos/.test(msg))
    return "Esta venda já tem recebimento registrado. Estorne no financeiro (Contas a receber → abrir a parcela → estornar) e tente de novo.";
  if (/cancelada por inteiro/.test(msg))
    return "Venda no cartão/fiado só pode ser cancelada por inteiro (não aceita devolução parcial).";
  if (/ja foi cancelada/.test(msg)) return "Esta venda já foi cancelada.";
  if (/Abra o caixa/.test(msg)) return "Abra o caixa para devolver o dinheiro da venda.";
  if (/maior que o restante/.test(msg)) return "Quantidade maior do que o restante do item.";
  if (/motivo/i.test(msg)) return "Escreva o motivo da devolução.";
  if (/Nada restante/.test(msg)) return "Não há nada restante para cancelar.";
  return "Não deu para concluir. Confira e tente de novo.";
}

function revalidar(vendaId: string) {
  revalidatePath("/gestao/vendas");
  revalidatePath(`/gestao/vendas/${vendaId}`);
  revalidatePath("/gestao/estoque");
  revalidatePath("/balcao/estoque");
  revalidatePath("/gestao/contas-receber");
  revalidatePath("/gestao/dre");
  revalidatePath("/gestao/caixa");
}

export async function devolverVendaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const vendaId = String(fd.get("venda_id") ?? "");
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!vendaId) return { erro: "Venda não encontrada." };
  if (!motivo) return { erro: "Escreva o motivo da devolução." };

  let itens: { venda_item_id: string; quantidade: number; revendavel: boolean }[];
  try {
    itens = JSON.parse(String(fd.get("itens") ?? "[]"));
  } catch {
    return { erro: "Dados inválidos. Recarregue a página." };
  }
  itens = (itens ?? []).filter((i) => i.quantidade > 0);
  if (itens.length === 0) return { erro: "Escolha ao menos um item para devolver." };

  const { error } = await devolverVenda(vendaId, itens, motivo);
  if (error) return { erro: traduz(error) };

  revalidar(vendaId);
  redirect(`/gestao/vendas/${vendaId}`);
}

export async function cancelarVendaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const vendaId = String(fd.get("venda_id") ?? "");
  const motivo = String(fd.get("motivo") ?? "").trim();
  const revendavel = String(fd.get("revendavel") ?? "true") === "true";
  if (!vendaId) return { erro: "Venda não encontrada." };
  if (!motivo) return { erro: "Escreva o motivo do cancelamento." };

  const { error } = await cancelarVenda(vendaId, motivo, revendavel);
  if (error) return { erro: traduz(error) };

  revalidar(vendaId);
  redirect(`/gestao/vendas/${vendaId}`);
}
