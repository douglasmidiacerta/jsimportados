"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { parseExtrato } from "@/lib/financeiro/parseExtrato";
import {
  importarExtrato,
  conciliarLinha,
  desconciliarLinha,
} from "@/lib/dados/conciliacao";
import type { EstadoForm } from "@/lib/dados/tipos";

/** Importa um arquivo OFX/CSV de extrato numa conta. */
export async function importarExtratoAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const contaId = String(fd.get("conta_id") ?? "");
  const arquivo = fd.get("arquivo");
  if (!contaId) return { erro: "Escolha a conta do extrato." };
  if (!(arquivo instanceof File) || arquivo.size === 0)
    return { erro: "Anexe o arquivo do extrato (OFX ou CSV)." };
  if (arquivo.size > 5 * 1024 * 1024)
    return { erro: "Arquivo muito grande (máx. 5 MB)." };

  let texto: string;
  try {
    texto = await arquivo.text();
  } catch {
    return { erro: "Não consegui ler o arquivo. Tente exportar de novo." };
  }

  const linhas = parseExtrato(texto);
  if (linhas.length === 0)
    return { erro: "Não encontrei transações no arquivo. Confira se é o extrato em OFX ou CSV." };

  const { resultado, error } = await importarExtrato(contaId, linhas);
  if (error || !resultado) return { erro: "Não deu para importar. Tente de novo." };

  revalidatePath(`/gestao/conciliacao?conta=${contaId}`);
  redirect(
    `/gestao/conciliacao?conta=${contaId}&ok=${resultado.inseridas}&dup=${resultado.duplicadas}`,
  );
}

/** Confirma um casamento sugerido (linha do banco ↔ lançamento). */
export async function conciliarAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const contaId = String(fd.get("conta_id") ?? "");
  const extratoId = String(fd.get("extrato_id") ?? "");
  const lancamentoId = String(fd.get("lancamento_id") ?? "");
  const volta = `/gestao/conciliacao?conta=${contaId}`;
  if (!extratoId || !lancamentoId) redirect(volta);

  const { error } = await conciliarLinha(extratoId, lancamentoId);
  revalidatePath(volta);
  redirect(error ? `${volta}&erro=1` : volta);
}

/** Desfaz um casamento. */
export async function desconciliarAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const contaId = String(fd.get("conta_id") ?? "");
  const extratoId = String(fd.get("extrato_id") ?? "");
  const volta = `/gestao/conciliacao?conta=${contaId}`;
  if (extratoId) await desconciliarLinha(extratoId);
  revalidatePath(volta);
  redirect(volta);
}
