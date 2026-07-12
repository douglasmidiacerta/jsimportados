"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/perfil";
import { registrarEntradaBalcao } from "@/lib/dados/estoque";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

export async function entradaBalcaoAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirPerfil();

  const produtoId = String(fd.get("produto_id") ?? "");
  const quantidade = parseMoedaBR(String(fd.get("quantidade") ?? ""));

  if (!produtoId) return { erro: "Escolha o produto." };
  if (!(quantidade > 0)) return { erro: "Informe uma quantidade maior que zero." };

  const { error } = await registrarEntradaBalcao(produtoId, quantidade);
  if (error) return { erro: "Não deu para registrar a entrada. Tente de novo." };

  revalidatePath("/balcao/estoque");
  revalidatePath("/gestao/estoque");
  revalidatePath("/gestao/produtos");
  redirect("/balcao/estoque?ok=entrada");
}
