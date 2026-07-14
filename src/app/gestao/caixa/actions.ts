"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import {
  abrirCaixa,
  movimentarCaixa,
  fecharCaixa,
  ultimoFechamento,
} from "@/lib/dados/caixa";
import { traduzErroCaixa } from "@/lib/caixa/erros";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm, EstadoFechar, EstadoAbrir } from "@/lib/dados/tipos";

/**
 * Mesmo caixa do balcão, operado pela gestão. Antes /gestao/caixa só mostrava
 * histórico e mandava "o balcão abre o caixa" — mas o dono também precisa
 * abrir/fechar (ele que fica na loja em muitos dias).
 */

function revalidar() {
  revalidatePath("/gestao/caixa");
  revalidatePath("/balcao/caixa");
}

export async function abrirCaixaAction(
  _prev: EstadoAbrir,
  fd: FormData,
): Promise<EstadoAbrir> {
  await exigirGestao();
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  const obs = String(fd.get("observacoes") ?? "").trim() || null;

  // confere com o que sobrou no último fechamento (ver 0022)
  const anterior = await ultimoFechamento();
  if (anterior !== null && !obs) {
    const diferenca = Number((valor - anterior).toFixed(2));
    if (diferenca !== 0) {
      return {
        conferencia: { fechamento_anterior: anterior, contado: valor, diferenca },
      };
    }
  }

  const { error } = await abrirCaixa(valor, obs);
  if (error) return { erro: traduzErroCaixa(error) };

  revalidar();
  redirect("/gestao/caixa");
}

async function movimento(
  tipo: "sangria" | "suprimento",
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  const obs = String(fd.get("observacoes") ?? "").trim() || null;
  if (!(valor > 0)) return { erro: "Informe um valor maior que zero." };

  const { error } = await movimentarCaixa(tipo, valor, obs);
  if (error) return { erro: traduzErroCaixa(error) };

  revalidar();
  redirect("/gestao/caixa");
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
  await exigirGestao();
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  const obs = String(fd.get("observacoes") ?? "").trim() || null;

  const { resumo, error } = await fecharCaixa(valor, obs);
  if (error || !resumo) return { erro: traduzErroCaixa(error) };

  // NÃO revalida a rota atual: a revelação (esperado × contado × diferença)
  // é mostrada inline e sumiria se a página remontasse como "Abrir caixa".
  revalidatePath("/balcao/caixa");
  return { resumo };
}
