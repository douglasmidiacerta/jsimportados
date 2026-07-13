"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { salvarEmpresa } from "@/lib/dados/empresa";

export async function salvarEmpresaAction(fd: FormData): Promise<void> {
  await exigirGestao();
  const opt = (k: string) => (String(fd.get(k) ?? "").trim() || null);
  const uf = opt("uf");
  const viasNum = Math.min(4, Math.max(1, Math.floor(Number(fd.get("vias")) || 1)));

  const { error } = await salvarEmpresa({
    nome: String(fd.get("nome") ?? "").trim() || "JS Importados",
    cnpj: opt("cnpj"),
    telefone: opt("telefone"),
    email: opt("email"),
    cep: opt("cep"),
    logradouro: opt("logradouro"),
    numero: opt("numero"),
    complemento: opt("complemento"),
    bairro: opt("bairro"),
    cidade: opt("cidade"),
    uf: uf && /^[A-Za-z]{2}$/.test(uf) ? uf.toUpperCase() : null,
    mensagem_rodape: opt("mensagem_rodape"),
    vias: viasNum,
  });

  revalidatePath("/gestao/configuracoes");
  redirect(error ? "/gestao/configuracoes?erro=1" : "/gestao/configuracoes?ok=1");
}
