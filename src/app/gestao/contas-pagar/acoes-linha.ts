"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { pagarConta } from "@/lib/dados/financeiro";

/**
 * "Pagar" direto na linha da grade (padrão FPQ): paga o SALDO integral com a
 * data de hoje (a RPC resolve os dois nulls). Parcial/outra data no detalhe.
 */
export async function pagarLinhaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const contaId = String(fd.get("conta_id") ?? "");
  const voltar = String(fd.get("voltar") ?? "/gestao/contas-pagar");
  if (!contaId) redirect(voltar);

  const { error } = await pagarConta(contaId, null, null, null);
  revalidatePath("/gestao/contas-pagar");
  revalidatePath("/gestao/extrato");
  revalidatePath("/gestao/financeiro");
  redirect(
    error
      ? `${voltar}${voltar.includes("?") ? "&" : "?"}erro=${encodeURIComponent("Não deu para pagar. Abra a conta e tente pelo detalhe.")}`
      : voltar,
  );
}
