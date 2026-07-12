import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import {
  listarContasReceber,
  listarContasPagar,
  resumoEmAberto,
  auditoriaCaixa,
  dataBRT,
} from "@/lib/dados/relatorios";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FiltroPeriodo, resolverPeriodo } from "../_ui";

export default async function RelEmAbertoPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const { de, ate } = resolverPeriodo(sp.de, sp.ate);

  const [receber, pagar, sessoes] = await Promise.all([
    listarContasReceber("aberto"),
    listarContasPagar({ status: "aberto" }),
    auditoriaCaixa(de, ate),
  ]);
  const aberto = resumoEmAberto(receber, pagar);
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Em aberto + auditoria"
          descricao="O que falta receber e pagar, e a conferência dos caixas."
          voltarHref="/gestao/relatorios"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Card
            titulo="A receber"
            total={aberto.receber.total}
            vencido={aberto.receber.vencido}
            n={aberto.receber.n}
            nVenc={aberto.receber.nVencidas}
            href="/gestao/contas-receber"
          />
          <Card
            titulo="A pagar"
            total={aberto.pagar.total}
            vencido={aberto.pagar.vencido}
            n={aberto.pagar.n}
            nVenc={aberto.pagar.nVencidas}
            href="/gestao/contas-pagar"
          />
        </div>
        <div className="rounded-2xl border border-line bg-surface-2 p-4 flex items-center justify-between mb-6">
          <span className="text-sm text-muted">Saldo em aberto (a receber − a pagar)</span>
          <span className={`text-xl font-extrabold tabular-nums ${aberto.saldo >= 0 ? "text-good" : "text-danger"}`}>
            {formatarBRL(aberto.saldo)}
          </span>
        </div>

        {/* drill-down: próximas a receber */}
        {receber.filter((c) => c.status === "aberto").length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Próximas a receber</h2>
            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {receber
                .filter((c) => c.status === "aberto")
                .slice(0, 8)
                .map((c) => (
                  <Link key={c.id} href={`/gestao/contas-receber/${c.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="block text-ink truncate">{c.cliente_nome ?? (c.tipo === "cartao" ? "Cartão" : "Fiado")}</span>
                      <span className={`block text-xs ${c.vencimento < hoje ? "text-danger font-semibold" : "text-muted"}`}>
                        vence {formatarData(c.vencimento)}
                      </span>
                    </span>
                    <span className="tabular-nums text-ink font-semibold">{formatarBRL(c.saldo)}</span>
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* auditoria de caixa */}
        <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Auditoria de caixa</h2>
        <FiltroPeriodo base="/gestao/relatorios/em-aberto" de={de} ate={ate} />
        {sessoes.length === 0 ? (
          <p className="text-muted text-center py-6">Nenhum caixa fechado nesse período.</p>
        ) : (
          <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
            {sessoes.map((s) => {
              const dif = s.diferenca ?? 0;
              return (
                <Link key={s.id} href={`/gestao/caixa/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-2">
                  <span className="min-w-0">
                    <span className="block text-ink font-medium">{formatarData(dataBRT(s.fechado_em as string))}</span>
                    <span className="block text-xs text-muted">
                      esperado {formatarBRL(s.esperado_dinheiro ?? 0)} · contou {formatarBRL(s.valor_contado ?? 0)}
                    </span>
                  </span>
                  <span className={`tabular-nums font-semibold shrink-0 ${dif === 0 ? "text-good" : dif > 0 ? "text-amber" : "text-danger"}`}>
                    {dif === 0 ? "bateu" : `${dif > 0 ? "+" : "−"}${formatarBRL(Math.abs(dif))}`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted mt-3">
          Diferença aponta sangria/suprimento não registrado ou erro de contagem.
        </p>
      </main>
    </>
  );
}

function Card({ titulo, total, vencido, n, nVenc, href }: { titulo: string; total: number; vencido: number; n: number; nVenc: number; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-surface p-4 hover:border-accent/40 transition-colors">
      <div className="text-sm text-muted">{titulo}</div>
      <div className="text-2xl font-extrabold text-ink tabular-nums mt-0.5">{formatarBRL(total)}</div>
      <div className="text-xs text-muted mt-1">{n} em aberto</div>
      {vencido > 0 && <div className="text-xs text-danger font-semibold">{formatarBRL(vencido)} vencido ({nVenc})</div>}
    </Link>
  );
}
