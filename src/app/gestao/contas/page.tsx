import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarContasComSaldo, obterContaPadraoId } from "@/lib/dados/contasFinanceiras";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

const ROTULO_TIPO: Record<string, string> = {
  banco: "Banco",
  adquirente: "Maquininha",
  outro: "Outro",
};

export default async function ContasPage() {
  const perfil = await exigirGestao();
  const [contas, padraoId] = await Promise.all([
    listarContasComSaldo(),
    obterContaPadraoId(),
  ]);

  const total = contas.filter((c) => c.ativo).reduce((s, c) => s + c.saldo, 0);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-none w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Contas"
          descricao="Bancos e maquininhas. O saldo vem da soma dos lançamentos — nunca é digitado."
          voltarHref="/gestao"
        />

        <div className="flex flex-wrap gap-2 mb-5">
          <Link
            href="/gestao/contas/nova"
            className="h-11 inline-flex items-center gap-2 rounded-xl bg-accent text-white px-4 font-semibold shadow-[var(--shadow)] active:scale-[0.99]"
          >
            <span className="text-lg leading-none">+</span> Nova conta
          </Link>
          <Link
            href="/gestao/transferencias"
            className="h-11 inline-flex items-center rounded-xl border border-line px-4 font-semibold text-ink hover:bg-surface-2 transition-colors"
          >
            Transferir entre contas
          </Link>
        </div>

        {contas.length === 0 ? (
          <p className="text-muted">
            Nenhuma conta cadastrada. Crie a conta do banco que recebe seus Pix e
            uma conta para cada maquininha.
          </p>
        ) : (
          <>
            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {contas.map((c) => (
                <Link
                  key={c.id}
                  href={`/gestao/contas/${c.id}`}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors ${
                    c.ativo ? "" : "opacity-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-ink truncate">{c.nome}</span>
                      {c.recebe_pix && (
                        <span className="text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-accent-soft text-accent-ink">
                          recebe Pix
                        </span>
                      )}
                      {padraoId === c.id && (
                        <span className="text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-surface-2 text-muted border border-line">
                          padrão
                        </span>
                      )}
                    </span>
                    <span className="block text-sm text-muted">
                      {ROTULO_TIPO[c.tipo] ?? c.tipo}
                      {c.banco ? ` · ${c.banco}` : ""}
                      {c.pendentes_conciliar > 0
                        ? ` · ${c.pendentes_conciliar} a conciliar`
                        : ""}
                    </span>
                  </span>
                  <span className={`tabular-nums font-bold shrink-0 ${c.saldo < 0 ? "text-danger" : "text-ink"}`}>
                    {formatarBRL(c.saldo)}
                  </span>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 mt-2 rounded-xl bg-surface-2 border border-line">
              <span className="font-bold text-ink">Saldo somado (contas ativas)</span>
              <span className={`tabular-nums text-lg font-extrabold ${total < 0 ? "text-danger" : "text-ink"}`}>
                {formatarBRL(total)}
              </span>
            </div>
          </>
        )}
      </main>
    </>
  );
}
