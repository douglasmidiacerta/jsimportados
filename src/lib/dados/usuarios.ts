import { criarClienteServidor } from "@/lib/supabase/server";

export type Papel = "operacao" | "gestao";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  criado_em: string;
};

export type Convite = {
  email: string;
  papel: Papel;
  usado: boolean;
  criado_em: string;
};

export async function listarUsuarios(): Promise<Usuario[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("listar_usuarios");
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    nome: String(r.nome ?? ""),
    email: String(r.email ?? ""),
    papel: r.papel as Papel,
    ativo: Boolean(r.ativo),
    criado_em: String(r.criado_em),
  }));
}

export async function listarConvitesPendentes(): Promise<Convite[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("convites")
    .select("email, papel, usado, criado_em")
    .eq("usado", false)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    email: String(r.email),
    papel: r.papel as Papel,
    usado: Boolean(r.usado),
    criado_em: String(r.criado_em),
  }));
}

export async function convidarUsuario(email: string, papel: Papel) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("convidar_usuario", {
    p_email: email,
    p_papel: papel,
  });
  return { error };
}

export async function revogarConvite(email: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("revogar_convite", { p_email: email });
  return { error };
}

export async function definirPapelUsuario(id: string, papel: Papel) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("definir_papel_usuario", {
    p_id: id,
    p_papel: papel,
  });
  return { error };
}

export async function definirAtivoUsuario(id: string, ativo: boolean) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("definir_ativo_usuario", {
    p_id: id,
    p_ativo: ativo,
  });
  return { error };
}
