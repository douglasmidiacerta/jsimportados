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
