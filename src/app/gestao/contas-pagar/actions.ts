"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import {
  registrarDespesa,
  pagarConta,
  estornarPagamento,
  cancelarContaPagar,
} from "@/lib/dados/financeiro";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm, DespesaPayload } from "@/lib/dados/tipos";

function traduzErro(error: { message?: string } | null): string {
  const msg = error?.message ?? "";
  if (/gestao|permiss/i.test(msg)) return "Apenas a gestão pode fazer isso.";
  if (/ja quitada/i.test(msg)) return "Essa conta já está quitada.";
  if (/cancelada/i.test(msg)) return "Essa conta está cancelada.";
  if (/maior que o saldo/i.test(msg)) return "O valor é maior que o saldo devedor.";
  if (/maior que zero|invalido/i.test(msg)) return "Informe um valor válido.";
  if (/Estorne os pagamentos/i.test(msg))
    return "Estorne os pagamentos antes de cancelar a conta.";
  if (/ja estornado|estornar um estorno/i.test(msg))
    return "Esse lançamento já foi estornado.";
  return "Não deu para concluir. Tente de novo.";
}

function revalidarFinanceiro() {
  revalidatePath("/gestao/contas-pagar");
  revalidatePath("/gestao/extrato");
  revalidatePath("/gestao/dre");
  revalidatePath("/gestao/financeiro");
}

export async function registrarDespesaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  if (!(valor > 0)) return { erro: "Informe um valor maior que zero." };

  const payload: DespesaPayload = {
    descricao: String(fd.get("descricao") ?? "").trim() || "Despesa",
    categoria_id: String(fd.get("categoria_id") ?? "").trim() || null,
    fornecedor_id: String(fd.get("fornecedor_id") ?? "").trim() || null,
    valor,
    vencimento: String(fd.get("vencimento") ?? "").trim() || null,
    competencia: String(fd.get("competencia") ?? "").trim() || null,
    pagar_agora: fd.get("pagar_agora") === "on",
    forma_pagamento: String(fd.get("forma") ?? "").trim() || null,
    observacoes: null,
  };

  const { error } = await registrarDespesa(payload);
  if (error) return { erro: traduzErro(error) };

  revalidarFinanceiro();
  redirect("/gestao/contas-pagar");
}

export async function pagarContaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const contaId = String(fd.get("conta_id") ?? "");
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  const data = String(fd.get("data") ?? "").trim() || null;
  const forma = String(fd.get("forma") ?? "").trim() || null;
  if (!contaId) return { erro: "Conta não encontrada." };
  if (!(valor > 0)) return { erro: "Informe um valor maior que zero." };

  const { error } = await pagarConta(contaId, data, valor, forma);
  if (error) return { erro: traduzErro(error) };

  revalidarFinanceiro();
  redirect(`/gestao/contas-pagar/${contaId}`);
}

export async function estornarPagamentoAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const pagamentoId = String(fd.get("pagamento_id") ?? "");
  const contaId = String(fd.get("conta_id") ?? "");
  if (!pagamentoId) return { erro: "Pagamento não encontrado." };

  const { error } = await estornarPagamento(pagamentoId);
  if (error) return { erro: traduzErro(error) };

  revalidarFinanceiro();
  if (contaId) revalidatePath(`/gestao/contas-pagar/${contaId}`);
  return {};
}

export async function cancelarContaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const contaId = String(fd.get("conta_id") ?? "");
  if (!contaId) return { erro: "Conta não encontrada." };

  const { error } = await cancelarContaPagar(contaId);
  if (error) return { erro: traduzErro(error) };

  revalidarFinanceiro();
  redirect("/gestao/contas-pagar");
}
