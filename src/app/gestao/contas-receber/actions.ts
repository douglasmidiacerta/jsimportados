"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { baixarReceber, estornarReceber } from "@/lib/dados/financeiro";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

function traduzErro(error: { message?: string } | null): string {
  const msg = error?.message ?? "";
  if (/gestao|permiss/i.test(msg)) return "Apenas a gestão pode fazer isso.";
  if (/ja recebida/i.test(msg)) return "Essa conta já foi recebida.";
  if (/cancelada/i.test(msg)) return "Essa conta está cancelada.";
  if (/cartao liquida integralmente/i.test(msg))
    return "A parcela do cartão é recebida por inteiro.";
  if (/invalido|maior que zero/i.test(msg)) return "Informe um valor válido.";
  if (/ja estornado|estornar um estorno/i.test(msg))
    return "Esse recebimento já foi estornado.";
  return "Não deu para concluir. Tente de novo.";
}

function revalidar() {
  revalidatePath("/gestao/contas-receber");
  revalidatePath("/gestao/extrato");
  revalidatePath("/gestao/financeiro");
}

export async function baixarReceberAction(
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

  const { error } = await baixarReceber(contaId, data, valor, forma);
  if (error) return { erro: traduzErro(error) };

  revalidar();
  redirect(`/gestao/contas-receber/${contaId}`);
}

/**
 * "Receber" direto na linha da grade (padrão FPQ): recebe o SALDO integral
 * com a data de hoje (a RPC resolve os dois). Recebimento parcial ou com
 * outra data continua na tela de detalhe.
 */
export async function receberLinhaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const contaId = String(fd.get("conta_id") ?? "");
  const voltar = String(fd.get("voltar") ?? "/gestao/contas-receber");
  if (!contaId) redirect(voltar);

  const { error } = await baixarReceber(contaId, null, null, null);
  revalidar();
  redirect(error ? `${voltar}${voltar.includes("?") ? "&" : "?"}erro=${encodeURIComponent(traduzErro(error))}` : voltar);
}

export async function estornarRecebimentoAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const recebimentoId = String(fd.get("recebimento_id") ?? "");
  const contaId = String(fd.get("conta_id") ?? "");
  if (!recebimentoId) return { erro: "Recebimento não encontrado." };

  const { error } = await estornarReceber(recebimentoId);
  if (error) return { erro: traduzErro(error) };

  revalidar();
  if (contaId) revalidatePath(`/gestao/contas-receber/${contaId}`);
  return {};
}
