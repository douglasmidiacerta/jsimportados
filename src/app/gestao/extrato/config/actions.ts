"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { salvarSaldoInicial } from "@/lib/dados/financeiro";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function salvarSaldoInicialAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const saldo = parseMoedaBR(String(fd.get("saldo") ?? ""));
  const data = String(fd.get("data") ?? "").trim();
  if (!RE_DATA.test(data)) return { erro: "Informe a data de início." };

  const { error } = await salvarSaldoInicial(saldo, data);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };

  revalidatePath("/gestao/extrato");
  revalidatePath("/gestao/financeiro");
  redirect("/gestao/extrato");
}
