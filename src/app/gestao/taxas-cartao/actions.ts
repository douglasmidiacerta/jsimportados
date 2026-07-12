"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { upsertTaxasCartao } from "@/lib/dados/taxasCartao";
import type { EstadoForm } from "@/lib/dados/tipos";

type LinhaTaxa = {
  modalidade: "debito" | "credito";
  parcelas: number;
  percentual: number;
  prazo_dias: number;
  ativo: boolean;
};

export async function salvarTaxasCartao(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();

  let linhas: LinhaTaxa[];
  try {
    linhas = JSON.parse(String(fd.get("linhas") ?? "[]"));
  } catch {
    return { erro: "Dados inválidos. Recarregue a página." };
  }
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return { erro: "Nada para salvar." };
  }
  if (linhas.some((l) => l.percentual < 0 || l.percentual >= 100)) {
    return { erro: "As taxas devem ficar entre 0% e 100%." };
  }

  const { error } = await upsertTaxasCartao(linhas);
  if (error) return { erro: "Não deu para salvar as taxas. Tente de novo." };

  revalidatePath("/gestao/taxas-cartao");
  redirect("/gestao");
}
