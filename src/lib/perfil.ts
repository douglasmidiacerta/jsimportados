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

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome, papel, ativo")
    .eq("id", user.id)
    .single();

  // Se o perfil ainda não existe (raro — trigger cria no cadastro), assume operação.
  if (!perfil) {
    return { id: user.id, nome: "", papel: "operacao", ativo: true };
  }

  return perfil as Perfil;
}

/** Caminho da tela inicial conforme o papel. */
export function inicioPorPapel(papel: Papel): string {
  return papel === "gestao" ? "/gestao" : "/balcao";
}
