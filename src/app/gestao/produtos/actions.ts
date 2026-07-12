"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirGestao } from "@/lib/perfil";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

function revalidarProdutos() {
  revalidatePath("/gestao/produtos");
  revalidatePath("/balcao/estoque");
}

function mensagemErro(error: { code?: string; message?: string }): string {
  if (error.code === "23505") {
    return "Já existe um produto com esse nome nessa categoria.";
  }
  return "Não deu para salvar. Tente de novo.";
}

function lerCampos(fd: FormData) {
  return {
    nome: String(fd.get("nome") ?? "").trim(),
    categoria_id: (String(fd.get("categoria_id") ?? "").trim() || null) as
      | string
      | null,
    unidade: String(fd.get("unidade") ?? "un").trim() || "un",
    preco_venda: parseMoedaBR(String(fd.get("preco_venda") ?? "")),
    custo: (() => {
      const bruto = String(fd.get("custo") ?? "").trim();
      return bruto ? parseMoedaBR(bruto) : null;
    })(),
    foto_path: (String(fd.get("foto_path") ?? "").trim() || null) as
      | string
      | null,
    observacoes: (String(fd.get("observacoes") ?? "").trim() || null) as
      | string
      | null,
  };
}

export async function criarProduto(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const c = lerCampos(fd);
  if (!c.nome) return { erro: "Digite o nome do produto." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("produtos").insert(c);
  if (error) return { erro: mensagemErro(error) };

  revalidarProdutos();
  redirect("/gestao/produtos");
}

export async function atualizarProduto(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  if (!id) return { erro: "Produto não encontrado." };
  const c = lerCampos(fd);
  if (!c.nome) return { erro: "Digite o nome do produto." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("produtos").update(c).eq("id", id);
  if (error) return { erro: mensagemErro(error) };

  revalidarProdutos();
  redirect("/gestao/produtos");
}

/** Arquiva (ativo=false) ou reativa (ativo=true) um produto. */
export async function definirAtivoProduto(fd: FormData): Promise<void> {
  await exigirGestao();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "true";
  if (!id) redirect("/gestao/produtos");

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("produtos")
    .update({ ativo })
    .eq("id", id);
  if (error) redirect(`/gestao/produtos/${id}?erro=ativo`);

  revalidarProdutos();
  redirect("/gestao/produtos");
}
