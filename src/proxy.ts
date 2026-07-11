import { type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: [
    /*
     * Todas as rotas, exceto arquivos estáticos e imagens:
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
