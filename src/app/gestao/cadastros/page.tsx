import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

type Cartao = {
  titulo: string;
  descricao: string;
  href: string;
  icone: React.ReactNode;
};

const CARTOES: Cartao[] = [
  {
    titulo: "Produtos",
    descricao: "Nome, categoria, preço e foto",
    href: "/gestao/produtos",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7 12 3 4 7v10l8 4 8-4Z" /><path d="M4 7l8 4 8-4" /><path d="M12 21V11" /></svg>
    ),
  },
  {
    titulo: "Categorias",
    descricao: "Agrupam os produtos",
    href: "/gestao/categorias",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
    ),
  },
  {
    titulo: "Fornecedores",
    descricao: "De quem você compra (Paraguai)",
    href: "/gestao/fornecedores",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 21V8l-6 4v9" /><path d="M10 12h8a2 2 0 0 1 2 2v7" /><path d="M14 8V3h4l2 5" /></svg>
    ),
  },
  {
    titulo: "Clientes",
    descricao: "Quem compra na loja",
    href: "/gestao/clientes",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
  },
  {
    titulo: "Listas de preço",
    descricao: "Varejo, atacado, promoção",
    href: "/gestao/listas-preco",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7l11 11-7 7L3 10V3Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
    ),
  },
  {
    titulo: "Taxas do cartão",
    descricao: "MDR por parcela (padrão do sistema)",
    href: "/gestao/taxas-cartao",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
    ),
  },
  {
    titulo: "Maquininhas",
    descricao: "Máquinas de cartão e suas taxas",
    href: "/gestao/maquininhas",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 6h6M9 10h6M12 18h.01" /></svg>
    ),
  },
  {
    titulo: "Contas",
    descricao: "Bancos e maquininhas, com saldo",
    href: "/gestao/contas",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18" /><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M7 15h4" /></svg>
    ),
  },
  {
    titulo: "Plano de contas",
    descricao: "Categorias de despesa do financeiro",
    href: "/gestao/plano-contas",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></svg>
    ),
  },
];

export default async function CadastrosPage() {
  const perfil = await exigirGestao();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Cadastros"
          descricao="O catálogo base do sistema."
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
                <span className="block font-bold text-ink text-lg tracking-tight">
                  {c.titulo}
                </span>
                <span className="block text-sm text-muted">{c.descricao}</span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
