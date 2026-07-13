"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { salvarMaquininha, upsertTaxasMaquininha } from "@/lib/dados/maquininhas";
import type { EstadoForm } from "@/lib/dados/tipos";

function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
}

function traduz(msg: string | undefined): string {
  const m = msg ?? "";
  if (/maquininhas_nome_uq|duplicate|unique/i.test(m))
    return "Já existe uma maquininha com esse nome.";
  return "Não deu para salvar. Confira os dados e tente de novo.";
}

/**
 * Lê a tabela de taxas (JSON do campo oculto). O cliente JÁ converteu os
 * números (parseMoedaBR no FormularioMaquininha), então aqui NÃO reparseamos —
 * reparsear "2.5" trataria o ponto como milhar e viraria 25. Só validamos.
 */
function lerTaxas(fd: FormData) {
  try {
    const arr = JSON.parse(String(fd.get("taxas") ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((t) => ({
        modalidade: t.modalidade as "debito" | "credito",
        parcelas: Math.max(1, Math.floor(Number(t.parcelas) || 1)),
        percentual: Number(t.percentual) || 0,
        prazo_dias: Math.max(0, Math.floor(Number(t.prazo_dias) || 0)),
        ativo: true,
      }))
      .filter((t) => t.percentual > 0 || t.prazo_dias > 0);
  } catch {
    return [];
  }
}

export async function criarMaquininha(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirGestao();
  const nome = String(fd.get("nome") ?? "").trim();
  if (!nome) return { erro: "Dê um nome para a maquininha." };

  const { id, error } = await salvarMaquininha({
    nome,
    adquirente: txt(fd, "adquirente"),
    observacoes: txt(fd, "observacoes"),
    ativo: true,
  });
  if (error || !id) return { erro: traduz(error?.message) };

  const taxas = lerTaxas(fd);
  if (taxas.length > 0) await upsertTaxasMaquininha(id, taxas);

  revalidatePath("/gestao/maquininhas");
  redirect("/gestao/maquininhas");
}

export async function atualizarMaquininha(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  if (!id) return { erro: "Maquininha não encontrada." };
  const nome = String(fd.get("nome") ?? "").trim();
  if (!nome) return { erro: "Dê um nome para a maquininha." };

  const { error } = await salvarMaquininha({
    id,
    nome,
    adquirente: txt(fd, "adquirente"),
    observacoes: txt(fd, "observacoes"),
    ativo: String(fd.get("ativo") ?? "true") === "true",
  });
  if (error) return { erro: traduz(error?.message) };

  const taxas = lerTaxas(fd);
  if (taxas.length > 0) await upsertTaxasMaquininha(id, taxas);

  revalidatePath("/gestao/maquininhas");
  revalidatePath(`/gestao/maquininhas/${id}`);
  redirect("/gestao/maquininhas");
}
