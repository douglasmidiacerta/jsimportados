import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Papel = "operacao" | "gestao";

export type Perfil = {
  id: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
};

/**
 * Retorna o perfil do usuário logado. Redireciona para /login se não houver
 * sessão. Usar no topo de páginas/áreas privadas (Server Components).
 */
export async function exigirPerfil(): Promise<Perfil> {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil, error } = await supabase
    .from("perfis")
    .select("id, nome, papel, ativo")
    .eq("id", user.id)
    .single();

  // Fail-closed: sem perfil legível (erro/RLS) NÃO liberamos acesso — o único
  // ponto que enforce 'ativo' no app é aqui; assumir operação ativa abriria brecha.
  if (error || !perfil) redirect("/login?erro=sessao");

  // Conta desativada pela gestão: bloqueia o acesso a tudo.
  if (perfil.ativo === false) redirect("/login?erro=inativo");

  return perfil as Perfil;
}

/**
 * Exige um usuário com papel de gestão. Redireciona operação para /balcao
 * e visitantes sem sessão para /login. Usar no topo de páginas só-gestão.
 */
export async function exigirGestao(): Promise<Perfil> {
  const perfil = await exigirPerfil();
  if (perfil.papel !== "gestao") redirect("/balcao");
  return perfil;
}

/** Caminho da tela inicial conforme o papel. */
export function inicioPorPapel(papel: Papel): string {
  return papel === "gestao" ? "/gestao" : "/balcao";
}
