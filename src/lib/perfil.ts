import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Papel = "operacao" | "gestao";

export type Perfil = {
  id: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
};

type ResultadoPerfil = { perfil?: Perfil; irPara?: string };

/**
 * Busca o perfil UMA vez por requisição (React cache): layout + página
 * compartilham o mesmo resultado, cortando a dupla verificação de login que
 * deixava a navegação lenta. Não redireciona aqui (função pura) — quem chama
 * (exigirPerfil) é que dispara o redirect.
 */
const buscarPerfil = cache(async (): Promise<ResultadoPerfil> => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { irPara: "/login" };

  const { data: perfil, error } = await supabase
    .from("perfis")
    .select("id, nome, papel, ativo")
    .eq("id", user.id)
    .single();

  // Fail-closed: sem perfil legível (erro/RLS) NÃO liberamos acesso.
  if (error || !perfil) return { irPara: "/login?erro=sessao" };
  if ((perfil as Perfil).ativo === false) return { irPara: "/login?erro=inativo" };
  return { perfil: perfil as Perfil };
});

/**
 * Retorna o perfil do usuário logado. Redireciona para /login se não houver
 * sessão. Usar no topo de páginas/áreas privadas (Server Components).
 */
export async function exigirPerfil(): Promise<Perfil> {
  const r = await buscarPerfil();
  if (r.irPara) redirect(r.irPara);
  return r.perfil as Perfil;
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
