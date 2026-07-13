"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { parseMoedaBR } from "@/lib/formato";
import {
  salvarConta,
  definirContaPadrao,
  obterContaPadraoId,
  transferirEntreContas,
  ajustarConta,
} from "@/lib/dados/contasFinanceiras";
import type { EstadoForm, TipoContaFin } from "@/lib/dados/tipos";

function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
}
function bool(fd: FormData, k: string): boolean {
  return String(fd.get(k) ?? "") === "true";
}

function traduz(msg: string | undefined): string {
  const m = msg ?? "";
  if (/cf_recebe_pix_uq|recebe_pix/i.test(m))
    return "Já existe uma conta marcada como “recebe Pix”. Desmarque a outra primeiro.";
  if (/cf_maquininha_uq|maquininha/i.test(m))
    return "Essa maquininha já está vinculada a outra conta.";
  if (/cf_nome_uq|duplicate|unique/i.test(m))
    return "Já existe uma conta com esse nome.";
  if (/cf_adq_maq/i.test(m))
    return "Só conta do tipo Maquininha pode vincular uma maquininha.";
  return "Não deu para salvar. Confira os dados e tente de novo.";
}

async function lerConta(fd: FormData) {
  const tipo = (String(fd.get("tipo") ?? "banco") as TipoContaFin);
  return {
    nome: String(fd.get("nome") ?? "").trim(),
    tipo,
    banco: tipo === "banco" ? txt(fd, "banco") : null,
    agencia: tipo === "banco" ? txt(fd, "agencia") : null,
    numero_conta: tipo === "banco" ? txt(fd, "numero_conta") : null,
    chave_pix: tipo === "banco" ? txt(fd, "chave_pix") : null,
    maquininha_id: tipo === "adquirente" ? txt(fd, "maquininha_id") : null,
    recebe_pix: tipo === "banco" ? bool(fd, "recebe_pix") : false,
    saldo_inicial: parseMoedaBR(String(fd.get("saldo_inicial") ?? "0")),
    observacoes: txt(fd, "observacoes"),
    ativo: fd.get("ativo") != null ? bool(fd, "ativo") : true,
  };
}

export async function criarConta(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirGestao();
  const c = await lerConta(fd);
  if (!c.nome) return { erro: "Dê um nome para a conta." };
  if (c.tipo === "adquirente" && !c.maquininha_id)
    return { erro: "Escolha a maquininha vinculada." };

  const { id, error } = await salvarConta(c);
  if (error || !id) return { erro: traduz(error?.message) };

  if (bool(fd, "conta_padrao")) await definirContaPadrao(id);

  revalidatePath("/gestao/contas");
  redirect("/gestao/contas");
}

export async function atualizarConta(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  if (!id) return { erro: "Conta não encontrada." };
  const c = await lerConta(fd);
  if (!c.nome) return { erro: "Dê um nome para a conta." };
  if (c.tipo === "adquirente" && !c.maquininha_id)
    return { erro: "Escolha a maquininha vinculada." };

  const { error } = await salvarConta({ ...c, id });
  if (error) return { erro: traduz(error?.message) };

  // padrão: liga se marcado; se desmarcado e era esta conta, limpa.
  const padrao = await obterContaPadraoId();
  if (bool(fd, "conta_padrao")) {
    if (padrao !== id) await definirContaPadrao(id);
  } else if (padrao === id) {
    await definirContaPadrao(null);
  }

  revalidatePath("/gestao/contas");
  revalidatePath(`/gestao/contas/${id}`);
  redirect("/gestao/contas");
}

/** Transferência entre contas (tela /gestao/transferencias). */
export async function transferirAction(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirGestao();
  const origem = String(fd.get("origem_id") ?? "");
  const destino = String(fd.get("destino_id") ?? "");
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  const descricao = txt(fd, "descricao");

  if (!origem || !destino) return { erro: "Escolha a conta de origem e a de destino." };
  if (origem === destino) return { erro: "Origem e destino têm que ser contas diferentes." };
  if (!(valor > 0)) return { erro: "Informe um valor maior que zero." };

  const { error } = await transferirEntreContas(origem, destino, valor, null, descricao);
  if (error) {
    const m = error.message ?? "";
    if (/mesma conta|diff/i.test(m)) return { erro: "Origem e destino têm que ser diferentes." };
    if (/invalida|inativa/i.test(m)) return { erro: "Conta de origem ou destino inválida/inativa." };
    return { erro: "Não deu para transferir. Tente de novo." };
  }

  revalidatePath("/gestao/contas");
  revalidatePath("/gestao/transferencias");
  redirect("/gestao/contas?ok=transferencia");
}

/** Ajuste manual no extrato de uma conta (exige motivo). */
export async function ajustarContaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const conta = String(fd.get("conta_id") ?? "");
  const direcao = String(fd.get("direcao") ?? "saida");
  const valor = parseMoedaBR(String(fd.get("valor") ?? ""));
  const motivo = String(fd.get("motivo") ?? "").trim();

  const volta = (e: string) =>
    redirect(`/gestao/contas/${conta}?erro=${encodeURIComponent(e)}`);
  if (!conta) redirect("/gestao/contas");
  if (!(valor > 0)) volta("Informe um valor maior que zero.");
  if (!motivo) volta("Descreva o motivo do ajuste.");

  const { error } = await ajustarConta(
    conta,
    direcao === "saida" ? -valor : valor,
    motivo,
    null,
  );
  if (error) volta("Não deu para lançar o ajuste.");

  revalidatePath(`/gestao/contas/${conta}`);
  revalidatePath("/gestao/contas");
  redirect(`/gestao/contas/${conta}`);
}
