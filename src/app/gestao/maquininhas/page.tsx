import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarMaquininhas } from "@/lib/dados/maquininhas";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

export default async function MaquininhasPage() {
  const perfil = await exigirGestao();
  const maquininhas = await listarMaquininhas();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Maquininhas"
          descricao="Cada máquina de cartão com sua taxa (MDR). Na venda no cartão você escolhe qual passou."
          voltarHref="/gestao/cadastros"
        />

        <Link
          href="/gestao/maquininhas/nova"
          className="mb-5 h-11 inline-flex items-center gap-2 rounded-xl bg-accent text-white px-4 font-semibold shadow-[var(--shadow)] active:scale-[0.99]"
        >
          <span className="text-lg leading-none">+</span> Nova maquininha
        </Link>

        {maquininhas.length === 0 ? (
          <p className="text-muted">
            Nenhuma maquininha cadastrada. Enquanto não houver nenhuma, a venda no
            cartão funciona como antes (sem escolher máquina).
          </p>
        ) : (
          <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
            {maquininhas.map((m) => (
              <Link
                key={m.id}
                href={`/gestao/maquininhas/${m.id}`}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors ${
                  m.ativo ? "" : "opacity-50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink truncate">{m.nome}</span>
                  <span className="block text-sm text-muted">
                    {m.adquirente ?? "—"}
                    {!m.ativo ? " · inativa" : ""}
                  </span>
                </span>
                <span className="text-muted">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
