import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { carteiraClientes } from "@/lib/dados/crm";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

export default async function CarteiraPage() {
  const perfil = await exigirGestao();
  const carteira = (await carteiraClientes()).filter((c) => c.n_compras > 0);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Carteira de clientes"
          descricao="Quem mais compra, por total gasto."
          voltarHref="/gestao/cadastros"
        />

        {carteira.length === 0 ? (
          <p className="text-muted text-center py-10">Nenhuma compra com cliente ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {carteira.map((c) => (
              <li key={c.cliente_id}>
                <Link
                  href={`/gestao/clientes/${c.cliente_id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-surface-2 transition-colors"
                >
                  <span className="w-8 text-center font-mono font-bold text-muted shrink-0">{c.ranking}º</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-ink truncate">{c.nome}</span>
                    <span className="block text-xs text-muted">
                      {c.n_compras} compra{c.n_compras > 1 ? "s" : ""} · ticket {formatarBRL(c.ticket_medio)}
                      {c.ultima_compra ? ` · última ${formatarData(c.ultima_compra)}` : ""}
                    </span>
                  </span>
                  <span className="font-extrabold text-ink tabular-nums shrink-0">{formatarBRL(c.total_comprado)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
