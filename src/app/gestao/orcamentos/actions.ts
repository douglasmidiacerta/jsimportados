"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPerfil, exigirGestao } from "@/lib/perfil";
import {
  registrarOrcamento,
  converterOrcamento,
  cancelarOrcamento,
} from "@/lib/dados/orcamentos";
import type { EstadoForm, OrcamentoPayload } from "@/lib/dados/tipos";

export async function criarOrcamentoAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirPerfil();
  let payload: OrcamentoPayload;
  try {
    payload = JSON.parse(String(fd.get("payload") ?? "{}"));
  } catch {
    return { erro: "Dados inválidos. Recarregue a página." };
  }
  if (!payload.itens || payload.itens.length === 0)
    return { erro: "Adicione ao menos um produto." };

  const { orcamentoId, error } = await registrarOrcamento(payload);
  if (error || !orcamentoId) return { erro: "Não deu para salvar o orçamento. Tente de novo." };

  revalidatePath("/gestao/orcamentos");
  redirect(`/gestao/orcamentos/${orcamentoId}`);
}

/** Converte o orçamento em venda com a forma escolhida no detalhe. */
export async function converterOrcamentoAction(fd: FormData): Promise<void> {
  await exigirPerfil();
  const id = String(fd.get("id") ?? "");
  const forma = String(fd.get("forma_pagamento") ?? "dinheiro");
  const volta = `/gestao/orcamentos/${id}`;
  if (!id) redirect("/gestao/orcamentos");

  const pagamento: Record<string, unknown> = { forma_pagamento: forma };
  if (forma === "cartao") {
    pagamento.cartao = {
      modalidade: String(fd.get("modalidade") ?? "credito"),
      parcelas: Number(fd.get("parcelas") ?? 1) || 1,
      maquininha_id: String(fd.get("maquininha_id") ?? "") || null,
    };
  }
  if (forma === "fiado") {
    pagamento.fiado = { juros: 0, prazo_dias: 30, vencimento: null };
  }

  const { vendaId, error } = await converterOrcamento(id, pagamento);
  if (error || !vendaId) {
    const m = error?.message ?? "";
    let cod = "erro";
    if (/Abra o caixa/.test(m)) cod = "caixa";
    else if (/maquininha/i.test(m)) cod = "maquininha";
    else if (/fiado exige/.test(m)) cod = "cliente";
    redirect(`${volta}?erro=${cod}`);
  }
  revalidatePath(volta);
  revalidatePath("/gestao/orcamentos");
  revalidatePath("/gestao/vendas");
  redirect(`/gestao/vendas/${vendaId}`);
}

export async function cancelarOrcamentoAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const motivo = String(fd.get("motivo") ?? "").trim();
  const volta = `/gestao/orcamentos/${id}`;
  if (!id) redirect("/gestao/orcamentos");
  const { error } = await cancelarOrcamento(id, motivo);
  revalidatePath(volta);
  redirect(error ? `${volta}?erro=cancelar` : volta);
}
