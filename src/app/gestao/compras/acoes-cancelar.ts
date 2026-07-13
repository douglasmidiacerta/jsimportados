"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/dados/tipos";

/** Cancela a compra (Onda 1): exige zero pago; reverte o estoque por ajuste. */
export async function cancelarCompraAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const compraId = String(fd.get("compra_id") ?? "");
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!compraId) return { erro: "Compra não encontrada." };
  if (!motivo) return { erro: "Escreva o motivo do cancelamento." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("cancelar_compra", {
    p_compra: compraId,
    p_motivo: motivo,
  });
  if (error) {
    const msg = error.message ?? "";
    if (/Estorne os pagamentos/.test(msg))
      return { erro: "Esta compra já tem pagamento registrado. Estorne em Contas a pagar e tente de novo." };
    if (/ja cancelada/.test(msg)) return { erro: "Esta compra já foi cancelada." };
    return { erro: "Não deu para cancelar. Tente de novo." };
  }

  revalidatePath("/gestao/compras");
  revalidatePath(`/gestao/compras/${compraId}`);
  revalidatePath("/gestao/estoque");
  revalidatePath("/gestao/contas-pagar");
  redirect(`/gestao/compras/${compraId}`);
}
