import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Recebe o link de recuperação de senha (fluxo PKCE): troca o ?code por uma
 * sessão (grava nos cookies) e leva o usuário para a página de nova senha.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const proximo = searchParams.get("proximo") ?? "/";

  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${proximo}`);
  }
  return NextResponse.redirect(`${origin}/login?erro=reset`);
}
