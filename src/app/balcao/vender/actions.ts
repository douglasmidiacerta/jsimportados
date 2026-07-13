"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/perfil";
import { registrarVenda } from "@/lib/dados/vendas";
import type { EstadoForm, VendaPayload } from "@/lib/dados/tipos";

function traduzErro(error: { message?: string } | null): string {
  const msg = error?.message ?? "";
  if (/Abra o caixa/.test(msg))
    return "Abra o caixa antes de vender (Caixa → Abrir).";
  if (/nao vende sem estoque/.test(msg)) {
    const m = msg.match(/Sem estoque de "([^"]+)" \(restam ([\d.,-]+)\)/);
    return m
      ? `Sem estoque de "${m[1]}" (restam ${m[2]}). Ajuste a quantidade.`
      : "Produto sem estoque suficiente. Ajuste a quantidade.";
  }
  if (/[Ee]scolha a maquininha|[Mm]aquininha invalida/.test(msg))
    return "Escolha a maquininha que passou o cartão.";
  if (/[Tt]axa de cartao/.test(msg))
    return "Configure as taxas do cartão (Gestão → Taxas do cartão) antes de vender no cartão.";
  if (/fiado exige um cliente/.test(msg))
    return "Escolha um cliente para a venda fiado.";
  if (/existe mais|não existe/.test(msg))
    return "Algum produto do carrinho não existe mais. Refaça a venda.";
  if (/permiss/.test(msg))
    return "Você não tem permissão para registrar vendas.";
  if (/pelo menos um produto/.test(msg)) return "Adicione ao menos um produto.";
  return "Não deu para registrar a venda. Confira e tente de novo.";
}

/**
 * Cancela a venda inteira pelo balcão (a operadora corrige o próprio erro).
 * As regras duras valem no banco (D3): só a própria venda, de hoje, com caixa
 * aberto — a gestão pode qualquer uma.
 */
export async function cancelarVendaBalcaoAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirPerfil();
  const vendaId = String(fd.get("venda_id") ?? "");
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!vendaId) return { erro: "Venda não encontrada." };
  if (!motivo) return { erro: "Escreva o que aconteceu (motivo)." };

  const { cancelarVenda } = await import("@/lib/dados/vendas");
  const { error } = await cancelarVenda(vendaId, motivo, true);
  if (error) {
    const msg = error.message ?? "";
    if (/por voce/.test(msg)) return { erro: "Essa venda foi feita por outra pessoa. Chame a gestão." };
    if (/de hoje/.test(msg)) return { erro: "Só dá para cancelar vendas de hoje. Chame a gestão." };
    if (/Abra o caixa/.test(msg)) return { erro: "Abra o caixa para devolver o dinheiro." };
    if (/Estorne os recebimentos/.test(msg)) return { erro: "Essa venda já teve recebimento. Chame a gestão." };
    if (/ja foi cancelada/.test(msg)) return { erro: "Essa venda já foi cancelada." };
    return { erro: "Não deu para cancelar. Chame a gestão." };
  }

  revalidatePath("/balcao/vender");
  revalidatePath("/balcao/estoque");
  revalidatePath("/balcao/caixa");
  revalidatePath("/gestao/vendas");
  redirect("/balcao/vender?cancelada=1");
}

export async function registrarVendaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirPerfil();

  let payload: VendaPayload;
  try {
    payload = JSON.parse(String(fd.get("payload") ?? "{}"));
  } catch {
    return { erro: "Dados inválidos. Recarregue a página e tente de novo." };
  }

  if (!payload.itens || payload.itens.length === 0) {
    return { erro: "Adicione ao menos um produto." };
  }
  if (payload.forma_pagamento === "fiado" && !payload.cliente_id) {
    return { erro: "Escolha um cliente para a venda fiado." };
  }

  const { vendaId, error } = await registrarVenda(payload);
  if (error || !vendaId) return { erro: traduzErro(error) };

  revalidatePath("/balcao/vender");
  revalidatePath("/balcao/estoque");
  revalidatePath("/gestao/vendas");
  revalidatePath("/gestao/estoque");
  revalidatePath("/gestao/contas-receber");
  redirect(`/balcao/vender/${vendaId}`);
}
