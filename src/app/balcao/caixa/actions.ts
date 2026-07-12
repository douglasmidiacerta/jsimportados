"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/perfil";
import { abrirCaixa, movimentarCaixa, fecharCaixa } from "@/lib/dados/caixa";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm, EstadoFechar } from "@/lib/dados/tipos";

function traduzErro(error: { message?: string } | null): string {
  const msg = error?.message ?? "";
  if (/ja existe um caixa|já existe um caixa|caixa aberto/i.test(msg))
    return "Já tem um caixa aberto. Feche o atual primeiro.";
  if (/abra o caixa/i.test(msg)) return "Abra o caixa antes de fazer isso.";
  if (/nao ha caixa|não há caixa/i.test(msg)) return "Não há caixa aberto.";
  if (/permiss/i.test(msg)) return "Você não tem permissão para isso.";
  if (/maior que zero|diferente de zero/i.test(msg))
    return "Informe um valor válido.";
  return "Não deu para concluir. Tente de novo.";
}

function revalidar() {
  revalidatePath("/balcao/caixa");
  revalidatePath("/gestao/caixa");
}

export async function abrirCaixaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirPerfil();
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  const obs = String(fd.get("observacoes") ?? "").trim() || null;

  const { error } = await abrirCaixa(valor, obs);
  if (error) return { erro: traduzErro(error) };

  revalidar();
  redirect("/balcao/caixa");
}

async function movimento(
  tipo: "sangria" | "suprimento",
  fd: FormData,
): Promise<EstadoForm> {
  await exigirPerfil();
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  const obs = String(fd.get("observacoes") ?? "").trim() || null;
  if (!(valor > 0)) return { erro: "Informe um valor maior que zero." };

  const { error } = await movimentarCaixa(tipo, valor, obs);
  if (error) return { erro: traduzErro(error) };

  revalidar();
  redirect("/balcao/caixa");
}

export async function sangriaAction(_prev: EstadoForm, fd: FormData) {
  return movimento("sangria", fd);
}
export async function suprimentoAction(_prev: EstadoForm, fd: FormData) {
  return movimento("suprimento", fd);
}

export async function fecharCaixaAction(
  _prev: EstadoFechar,
  fd: FormData,
): Promise<EstadoFechar> {
  await exigirPerfil();
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  const obs = String(fd.get("observacoes") ?? "").trim() || null;

  const { resumo, error } = await fecharCaixa(valor, obs);
  if (error || !resumo) return { erro: traduzErro(error) };

  // sem redirect NEM revalidar a rota atual: a revelação (esperado × contado ×
  // diferença) é mostrada inline pelo PainelCaixa/FecharCaixa, que precisa
  // continuar montado. Revalidar "/balcao/caixa" aqui remontaria a página como
  // "Abrir caixa" (a sessão virou 'fechado') e a conferência sumiria antes de
  // ser vista. Só marcamos a visão da gestão como desatualizada.
  revalidatePath("/gestao/caixa");
  return { resumo };
}
