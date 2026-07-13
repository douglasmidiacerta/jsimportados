import { criarClienteServidor } from "@/lib/supabase/server";
import type { EmpresaConfig } from "./tipos";

const COLUNAS =
  "nome, cnpj, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf, logo_path, mensagem_rodape, vias";

/** Config da empresa (singleton). Nunca é null — a migration semeia a linha. */
export async function obterEmpresa(): Promise<EmpresaConfig> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("empresa_config")
    .select(COLUNAS)
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    nome: String(r.nome ?? "JS Importados"),
    cnpj: (r.cnpj as string) ?? null,
    telefone: (r.telefone as string) ?? null,
    email: (r.email as string) ?? null,
    cep: (r.cep as string) ?? null,
    logradouro: (r.logradouro as string) ?? null,
    numero: (r.numero as string) ?? null,
    complemento: (r.complemento as string) ?? null,
    bairro: (r.bairro as string) ?? null,
    cidade: (r.cidade as string) ?? null,
    uf: (r.uf as string) ?? null,
    logo_path: (r.logo_path as string) ?? null,
    mensagem_rodape: (r.mensagem_rodape as string) ?? null,
    vias: Number(r.vias ?? 1),
  };
}

/** Salva a config da empresa (só gestão — RLS). */
export async function salvarEmpresa(c: Partial<EmpresaConfig>) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("empresa_config").update(c).eq("id", true);
  return { error };
}
