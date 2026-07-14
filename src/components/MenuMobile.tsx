"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_GESTAO, itemAtivo } from "@/lib/navegacao";

/**
 * Menu da Gestão no celular. Antes o mobile NÃO tinha menu nenhum — a única
 * forma de navegar era a grade de módulos do painel. Este drawer usa a mesma
 * definição do menu lateral (@/lib/navegacao), então os dois nunca divergem.
 */
export function MenuMobile() {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  // fecha ao trocar de tela
  useEffect(() => setAberto(false), [pathname]);

  // trava o scroll do fundo enquanto o menu está aberto
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        aria-expanded={aberto}
        className="lg:hidden w-10 h-10 grid place-items-center rounded-lg border border-line text-ink hover:bg-surface-2 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></svg>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <div className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] bg-surface border-r border-line flex flex-col shadow-2xl">
            <div className="px-4 h-16 flex items-center justify-between gap-2 border-b border-line shrink-0">
              <span className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-accent text-white grid place-items-center text-sm font-extrabold tracking-tight">
                  JS
                </span>
                <span className="leading-tight">
                  <span className="block text-ink font-bold text-[15px]">JS Importados</span>
                  <span className="block text-muted text-[11px] font-mono uppercase tracking-wider">
                    Modo Gestão
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-3 pt-3 shrink-0">
              <Link
                href="/balcao/vender"
                className="flex items-center justify-center gap-2 h-12 rounded-xl bg-accent text-white font-bold shadow-[var(--shadow)] active:scale-[0.99] transition-transform"
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
                        className={`flex items-center gap-3 rounded-xl px-3 h-12 text-[15px] font-semibold transition-colors ${
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

            <div className="border-t border-line p-3 shrink-0">
              <Link
                href="/balcao"
                className="flex items-center justify-center h-11 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
              >
                Ver balcão
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
