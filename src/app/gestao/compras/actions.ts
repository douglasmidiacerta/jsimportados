"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { registrarCompra } from "@/lib/dados/compras";
import type { EstadoForm, CompraPayload } from "@/lib/dados/tipos";

function traduzErro(error: { code?: string; message?: string } | null): string {
  const msg = error?.message ?? "";
  if (error?.code === "23505" || /produto_unico/.test(msg)) {
    return "O mesmo produto aparece duas vezes. Junte as quantidades numa linha só.";
  }
  if (/[Cc]ambio/.test(msg)) return "Informe um câmbio maior que zero.";
  if (/pelo menos um item/.test(msg)) return "Adicione ao menos um item.";
  if (/gestao/.test(msg)) return "Apenas a gestão pode registrar compras.";
  return "Não deu para registrar a compra. Confira os dados e tente de novo.";
}

export async function registrarCompraAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();

  let payload: CompraPayload;
  try {
    payload = JSON.parse(String(fd.get("payload") ?? "{}"));
  } catch {
    return { erro: "Dados inválidos. Recarregue a página e tente de novo." };
  }

  if (!payload.itens || payload.itens.length === 0) {
    return { erro: "Adicione ao menos um item (com produto e quantidade)." };
  }
  if (payload.moeda !== "BRL" && (!payload.cambio || payload.cambio <= 0)) {
    return { erro: "Informe o câmbio (quanto vale 1 da moeda em reais)." };
  }

  const { compraId, error } = await registrarCompra(payload);
  if (error || !compraId) return { erro: traduzErro(error) };

  revalidatePath("/gestao/compras");
  revalidatePath("/gestao/estoque");
  revalidatePath("/gestao/produtos");
  revalidatePath("/balcao/estoque");
  redirect(`/gestao/compras/${compraId}`);
}
