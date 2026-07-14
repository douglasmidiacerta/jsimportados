import Link from "next/link";
import { exigirPerfil } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { BotaoGigante } from "@/components/BotaoGigante";

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const ico = {
  vender: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
  ),
  entrada: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
  ),
  estoque: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7 12 3 4 7v10l8 4 8-4Z" /><path d="M4 7l8 4 8-4" /><path d="M12 21V11" /></svg>
  ),
  caixa: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></svg>
  ),
};

export default async function BalcaoPage() {
  const perfil = await exigirPerfil();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />

      <main className="mx-auto max-w-5xl w-full px-4 py-6 sm:py-10 flex-1">
        <div className="mb-6 sm:mb-8">
          <p className="text-muted text-sm">
            {saudacao()}
            {perfil.nome ? `, ${perfil.nome.split(/\s+/)[0]}` : ""} 👋
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-0.5">
            O que vamos fazer?
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <BotaoGigante
            href="/balcao/vender"
            cor="vender"
            titulo="VENDER"
            descricao="Registrar uma venda"
            icone={ico.vender}
          />
          <BotaoGigante
            href="/balcao/entrada"
            cor="entrada"
            titulo="ENTRADA"
            descricao="Chegou mercadoria"
            icone={ico.entrada}
          />
          <BotaoGigante
            href="/balcao/estoque"
            cor="estoque"
            titulo="ESTOQUE"
            descricao="Ver o que tem"
            icone={ico.estoque}
          />
          <BotaoGigante
            href="/balcao/caixa"
            cor="caixa"
            titulo="CAIXA"
            descricao="Abrir e fechar"
            icone={ico.caixa}
          />
        </div>

        <Link
          href="/balcao/ajuda"
          className="mt-4 sm:mt-5 flex items-center justify-center gap-2 w-full h-14 rounded-2xl border border-line bg-surface text-ink font-bold text-lg active:scale-[0.99] transition-transform"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
          Como usar
        </Link>
      </main>
    </>
  );
}
