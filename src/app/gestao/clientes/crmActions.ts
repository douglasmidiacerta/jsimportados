"use server";

import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import {
  marcarEtiqueta,
  desmarcarEtiqueta,
  criarEtiqueta,
  criarInteracao,
  concluirLembrete,
  apagarInteracao,
} from "@/lib/dados/crm";
import type { EstadoForm, CrmTipo } from "@/lib/dados/tipos";

function revalidarCliente(id: string) {
  if (id) revalidatePath(`/gestao/clientes/${id}`);
}

// ------- toggles (form action, void) -------

export async function marcarEtiquetaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const cliente = String(fd.get("cliente_id") ?? "");
  const etiqueta = String(fd.get("etiqueta_id") ?? "");
  if (cliente && etiqueta) await marcarEtiqueta(cliente, etiqueta);
  revalidarCliente(cliente);
}

export async function desmarcarEtiquetaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const cliente = String(fd.get("cliente_id") ?? "");
  const etiqueta = String(fd.get("etiqueta_id") ?? "");
  if (cliente && etiqueta) await desmarcarEtiqueta(cliente, etiqueta);
  revalidarCliente(cliente);
}

export async function concluirLembreteAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("interacao_id") ?? "");
  const cliente = String(fd.get("cliente_id") ?? "");
  const concluido = String(fd.get("concluido") ?? "true") === "true";
  if (id) await concluirLembrete(id, concluido);
  revalidarCliente(cliente);
}

export async function apagarInteracaoAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("interacao_id") ?? "");
  const cliente = String(fd.get("cliente_id") ?? "");
  if (id) await apagarInteracao(id);
  revalidarCliente(cliente);
}

// ------- forms com validação (useActionState, EstadoForm) -------

export async function criarEtiquetaAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const nome = String(fd.get("nome") ?? "").trim();
  const cor = String(fd.get("cor") ?? "accent").trim() || "accent";
  const cliente = String(fd.get("cliente_id") ?? "");
  if (!nome) return { erro: "Digite o nome da etiqueta." };

  const { id, error } = await criarEtiqueta(nome, cor);
  if (error || !id) return { erro: "Já existe uma etiqueta com esse nome." };

  // vincula ao cliente atual usando o id retornado (sem re-busca por nome)
  if (cliente) await marcarEtiqueta(cliente, id);
  revalidarCliente(cliente);
  return {};
}

export async function criarInteracaoAction(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const cliente = String(fd.get("cliente_id") ?? "");
  const tipo = String(fd.get("tipo") ?? "nota") as CrmTipo;
  const texto = String(fd.get("texto") ?? "").trim();
  const lembreteEm = String(fd.get("lembrete_em") ?? "").trim() || null;
  if (!cliente) return { erro: "Cliente não encontrado." };
  if (!texto) return { erro: "Escreva alguma coisa." };
  if (tipo === "lembrete" && !lembreteEm)
    return { erro: "Escolha a data do lembrete." };

  const { error } = await criarInteracao(cliente, tipo, texto, lembreteEm);
  if (error) return { erro: "Não deu para salvar. Tente de novo." };

  revalidarCliente(cliente);
  return {};
}
