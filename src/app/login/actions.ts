"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoAuth = { erro?: string; aviso?: string };

async function origem(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Autenticação. O campo `modo` ("entrar" | "criar" | "reset") decide a operação.
 */
export async function autenticar(
  _prev: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const modo = String(formData.get("modo") ?? "entrar");
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  const supabase = await criarClienteServidor();

  // ---------- Esqueci a senha ----------
  if (modo === "reset") {
    if (!email) return { erro: "Digite o seu e-mail." };
    // O link cai numa rota que troca o code (PKCE) por sessao e leva a /redefinir.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await origem()}/auth/confirmar?proximo=/redefinir`,
    });
    // Resposta neutra (não revela se o e-mail existe).
    return {
      aviso:
        "Se este e-mail tiver conta, enviamos um link para você criar uma nova senha.",
    };
  }

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  // ---------- Criar conta (só e-mail convidado — travado no banco) ----------
  if (modo === "criar") {
    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) return { erro: "Preencha o seu nome." };
    if (senha.length < 6) {
      return { erro: "A senha precisa ter pelo menos 6 caracteres." };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    if (error) {
      // O gate por convite (handle_new_user) faz o cadastro falhar; o Supabase
      // devolve um erro generico de banco. Mensagem amigavel unica:
      return {
        erro: "Não foi possível criar a conta. Confirme com o gestor se o seu e-mail foi convidado.",
      };
    }
    if (data.session) redirect("/");
    return { aviso: "Conta criada! Faça login para continuar." };
  }

  // ---------- Entrar ----------
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) return { erro: "E-mail ou senha incorretos." };

  // Confere o perfil antes de liberar. FAIL-CLOSED: se o perfil não puder ser
  // lido, encerra a sessão e não entra (não deixa passar por falha de leitura).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil, error: erroPerfil } = user
    ? await supabase.from("perfis").select("ativo").eq("id", user.id).single()
    : { data: null, error: new Error("sem usuário") };

  if (!user || erroPerfil || !perfil) {
    await supabase.auth.signOut();
    return { erro: "Não deu para entrar agora. Tente de novo em instantes." };
  }
  if (perfil.ativo === false) {
    await supabase.auth.signOut();
    return { erro: "Sua conta foi desativada. Fale com o gestor." };
  }

  redirect("/");
}

/** Encerra a sessão. */
export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
