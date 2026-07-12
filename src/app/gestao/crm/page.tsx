import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { lembretesPendentes, aniversariantesDoMes } from "@/lib/dados/crm";
import { formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

const AREAS = [
  { nome: "Clientes", desc: "Cadastro, histórico, etiquetas e notas", href: "/gestao/clientes" },
  { nome: "Carteira", desc: "Quem mais compra, por total gasto", href: "/gestao/clientes/carteira" },
  { nome: "Aniversariantes", desc: "Quem faz aniversário no mês", href: "/gestao/clientes/aniversariantes" },
  { nome: "Listas de preço", desc: "Varejo, atacado, promoção", href: "/gestao/listas-preco" },
];

export default async function CrmPage() {
  const perfil = await exigirGestao();
  const [lembretes, aniversariantes] = await Promise.all([
    lembretesPendentes(),
    aniversariantesDoMes(),
  ]);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Clientes & Preços"
          descricao="CRM, carteira, aniversários e listas de preço."
          voltarHref="/gestao"
        />

        {lembretes.length > 0 && (
          <div className="rounded-2xl border border-[var(--amber)]/40 bg-[var(--amber-soft)] p-4 mb-4">
            <div className="text-sm font-bold text-amber mb-2">🔔 Lembretes de hoje</div>
            <ul className="flex flex-col gap-1.5">
              {lembretes.map((l) => (
                <li key={l.id}>
                  <Link href={`/gestao/clientes/${l.cliente_id}`} className="flex items-center justify-between gap-3 text-sm hover:underline">
                    <span className="text-ink">
                      <b>{l.cliente_nome}</b> — {l.texto}
                    </span>
                    <span className="text-muted shrink-0">{formatarData(l.lembrete_em)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {aniversariantes.length > 0 && (
          <div className="rounded-2xl border border-accent/30 bg-accent-soft/50 p-4 mb-6">
            <div className="text-sm font-bold text-accent-ink mb-1">🎂 Aniversariantes do mês</div>
            <p className="text-sm text-ink">
              {aniversariantes.slice(0, 6).map((a) => `${a.nome} (${String(a.dia).padStart(2, "0")})`).join(" · ")}
              {aniversariantes.length > 6 ? ` +${aniversariantes.length - 6}` : ""}
            </p>
            <Link href="/gestao/clientes/aniversariantes" className="text-xs font-semibold text-accent-ink underline">Ver todos</Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AREAS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded-2xl border border-accent/40 bg-surface p-5 shadow-[var(--shadow)] hover:border-accent transition-colors"
            >
              <h2 className="text-ink font-bold text-lg tracking-tight">{a.nome}</h2>
              <p className="text-muted text-sm mt-1.5">{a.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
