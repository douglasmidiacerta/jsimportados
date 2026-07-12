"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirPerfil } from "@/lib/perfil";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

/** Cadastro rápido de produto no balcão (operação ou gestão). Sem custo (trigger protege). */
export async function salvarProdutoBalcao(
  _prev: EstadoForm,
  fd: FormData,
): Promise<EstadoForm> {
  await exigirPerfil();

  const nome = String(fd.get("nome") ?? "").trim();
  if (!nome) return { erro: "Digite o nome do produto." };

  const registro = {
    nome,
    categoria_id: String(fd.get("categoria_id") ?? "").trim() || null,
    preco_venda: parseMoedaBR(String(fd.get("preco_venda") ?? "")),
  };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("produtos").insert(registro);
  if (error) {
    if (error.code === "23505") {
      return { erro: "Já existe um produto com esse nome nessa categoria." };
    }
    return { erro: "Não deu para salvar. Tente de novo." };
  }

  revalidatePath("/balcao/estoque");
  revalidatePath("/gestao/produtos");
  redirect("/balcao/estoque");
}
