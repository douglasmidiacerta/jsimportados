import Link from "next/link";
import type { ReactNode } from "react";

type Cor = "vender" | "entrada" | "estoque" | "caixa";

const CORES: Record<Cor, string> = {
  vender: "from-[#0c6e6b] to-[#0a5654]",
  entrada: "from-[#1f7a52] to-[#155f3f]",
  estoque: "from-[#3a6ea5] to-[#2b5480]",
  caixa: "from-[#a96b10] to-[#835209]",
};

export function BotaoGigante({
  href,
  cor,
  titulo,
  descricao,
  icone,
}: {
  href: string;
  cor: Cor;
  titulo: string;
  descricao: string;
  icone: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col justify-between rounded-3xl bg-gradient-to-br ${CORES[cor]} p-6 text-white shadow-[var(--shadow)] min-h-[150px] sm:min-h-[190px] transition-transform active:scale-[0.98] focus-visible:outline-4`}
    >
      <span className="opacity-95" aria-hidden="true">
        {icone}
      </span>
      <span>
        <span className="block text-2xl sm:text-[28px] font-extrabold tracking-tight">
          {titulo}
        </span>
        <span className="block text-sm sm:text-base font-medium text-white/85 mt-0.5">
          {descricao}
        </span>
      </span>
    </Link>
  );
}
