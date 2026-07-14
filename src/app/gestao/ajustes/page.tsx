import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

/** Zona de setup: coisas que se mexe raramente. Antes eram 3 itens soltos no menu. */
const CARTOES = [
  {
    titulo: "Usuários",
    descricao: "Convidar, promover e desligar quem usa o sistema",
    href: "/gestao/usuarios",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
    ),
  },
  {
    titulo: "Dados da empresa",
    descricao: "Nome, CNPJ, endereço, logo e o rodapé do recibo",
    href: "/gestao/configuracoes",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M10 12h4M10 16h4" /></svg>
    ),
  },
  {
    titulo: "Backup / Exportar",
    descricao: "Baixar seus dados em CSV (abre no Excel)",
    href: "/gestao/backup",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></svg>
    ),
  },
];

export default async function AjustesPage() {
  const perfil = await exigirGestao();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Ajustes"
          descricao="Configurações do sistema — você mexe aqui de vez em quando."
          voltarHref="/gestao"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {CARTOES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)] hover:border-accent/40 transition-colors"
            >
              <span className="w-12 h-12 rounded-xl bg-accent-soft text-accent-ink grid place-items-center shrink-0">
                {c.icone}
              </span>
              <span className="min-w-0">
                <span className="block text-ink font-bold text-lg tracking-tight">{c.titulo}</span>
                <span className="block text-muted text-sm mt-0.5">{c.descricao}</span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
