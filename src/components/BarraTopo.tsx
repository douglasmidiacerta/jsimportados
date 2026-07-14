import Link from "next/link";
import { sair } from "@/app/login/actions";
import { MenuMobile } from "@/components/MenuMobile";
import type { Papel } from "@/lib/perfil";

export function BarraTopo({
  nome,
  papel,
  area,
}: {
  nome: string;
  papel: Papel;
  area: "balcao" | "gestao";
}) {
  const primeiroNome = nome.trim().split(/\s+/)[0] || "você";

  return (
    <header
      className={`nao-imprimir sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur ${
        area === "gestao" ? "lg:hidden" : ""
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between gap-3">
        {area === "gestao" && <MenuMobile />}

        <Link href="/" className="flex items-center gap-2.5 mr-auto">
          <span className="w-9 h-9 rounded-lg bg-accent text-white grid place-items-center text-sm font-extrabold tracking-tight">
            JS
          </span>
          <span className="leading-tight">
            <span className="block text-ink font-bold text-[15px]">
              JS Importados
            </span>
            <span className="block text-muted text-[11px] font-mono uppercase tracking-wider">
              {area === "gestao" ? "Modo Gestão" : "Modo Operação"}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {papel === "gestao" && (
            <Link
              href={area === "gestao" ? "/balcao" : "/gestao"}
              className="hidden sm:inline-flex h-10 items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
            >
              {area === "gestao" ? "Ver balcão" : "Ver gestão"}
            </Link>
          )}
          <span className="hidden sm:block text-sm text-muted">
            Olá, <b className="text-ink">{primeiroNome}</b>
          </span>
          <form action={sair}>
            <button
              type="submit"
              className="h-10 inline-flex items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
