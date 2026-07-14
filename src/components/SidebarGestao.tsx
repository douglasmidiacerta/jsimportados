"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/login/actions";
import { MENU_GESTAO, itemAtivo } from "@/lib/navegacao";

/** Menu lateral fixo do Modo Gestão (só desktop; no mobile o MenuMobile assume). */
export function SidebarGestao({ nome }: { nome: string }) {
  const pathname = usePathname();
  const primeiroNome = nome.trim().split(/\s+/)[0] || "você";

  return (
    <aside className="nao-imprimir hidden lg:flex flex-col w-64 shrink-0 border-r border-line bg-surface sticky top-0 h-screen">
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-line shrink-0">
        <span className="w-9 h-9 rounded-lg bg-accent text-white grid place-items-center text-sm font-extrabold tracking-tight">
          JS
        </span>
        <span className="leading-tight">
          <span className="block text-ink font-bold text-[15px]">JS Importados</span>
          <span className="block text-muted text-[11px] font-mono uppercase tracking-wider">
            Modo Gestão
          </span>
        </span>
      </div>

      <div className="px-3 pt-3 shrink-0">
        <Link
          href="/balcao/vender"
          className="flex items-center justify-center gap-2 h-11 rounded-xl bg-accent text-white font-bold shadow-[var(--shadow)] active:scale-[0.99] transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
          Vender
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {MENU_GESTAO.map((grupo, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {grupo.separar && <div className="border-t border-line my-2" />}
            {grupo.titulo && (
              <span className="px-3 pt-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                {grupo.titulo}
              </span>
            )}
            {grupo.itens.map((item) => {
              const on = itemAtivo(item, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-semibold transition-colors ${
                    on
                      ? "bg-accent-soft text-accent-ink"
                      : "text-muted hover:text-ink hover:bg-surface-2"
                  }`}
                >
                  <span className={on ? "text-accent-ink" : "text-muted"}>{item.icone}</span>
                  {item.nome}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3 flex flex-col gap-2 shrink-0">
        <Link
          href="/balcao"
          className="flex items-center justify-center h-10 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          Ver balcão
        </Link>
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-sm text-muted truncate">
            Olá, <b className="text-ink">{primeiroNome}</b>
          </span>
          <form action={sair}>
            <button
              type="submit"
              className="h-9 inline-flex items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
