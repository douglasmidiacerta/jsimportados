"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoAuth = { erro?: string; aviso?: string };

/**
 * Autenticação. O campo `modo` ("entrar" | "criar") decide a operação,
 * evitando trocar a action do formulário no cliente.
 */
export async function autenticar(
  _prev: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const modo = String(formData.get("modo") ?? "entrar");
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha." };
  }

  const supabase = await criarClienteServidor();

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

    if (error) return { erro: error.message };
    if (data.session) redirect("/"); // confirmação de e-mail desligada

    return {
      aviso:
        "Conta criada! Confirme pelo link enviado ao seu e-mail e depois faça login.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect("/");
}

/** Encerra a sessão. */
export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
