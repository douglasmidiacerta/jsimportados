import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarContasComSaldo } from "@/lib/dados/contasFinanceiras";
import {
  listarExtratoImportado,
  sugestoesConciliacao,
} from "@/lib/dados/conciliacao";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioImportarExtrato } from "@/components/financeiro/FormularioImportarExtrato";
import { importarExtratoAction, conciliarAction, desconciliarAction } from "./actions";

export default async function ConciliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ conta?: string; ok?: string; dup?: string; erro?: string }>;
}) {
  const perfil = await exigirGestao();
  const { conta, ok, dup, erro } = await searchParams;

  const contas = await listarContasComSaldo();
  const contaId = conta ?? contas.find((c) => c.ativo)?.id ?? "";

  const [linhas, sugestoes] = contaId
    ? await Promise.all([listarExtratoImportado(contaId), sugestoesConciliacao(contaId)])
    : [[], []];

  const pendentes = linhas.filter((l) => !l.conciliado);
  const conciliadas = linhas.filter((l) => l.conciliado);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Conciliação bancária"
          descricao="Importe o extrato do banco e case cada linha com o lançamento do sistema."
          voltarHref="/gestao/contas"
        />

        {/* Abas de conta */}
        {contas.length === 0 ? (
          <p className="text-muted">
            Cadastre uma conta primeiro em{" "}
            <Link href="/gestao/contas" className="text-accent-ink font-semibold underline">Contas</Link>.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-5">
              {contas.map((c) => (
                <Link
                  key={c.id}
                  href={`/gestao/conciliacao?conta=${c.id}`}
                  className={`h-9 inline-flex items-center rounded-lg px-3 text-sm font-semibold border transition-colors ${
                    c.id === contaId
                      ? "bg-accent-soft text-accent-ink border-accent"
                      : "border-line text-muted hover:text-ink hover:bg-surface-2"
                  }`}
                >
                  {c.nome}
                  {c.pendentes_conciliar > 0 && (
                    <span className="ml-2 text-[10px] font-bold rounded-full bg-[var(--amber-soft)] text-amber px-1.5">
                      {c.pendentes_conciliar}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Aviso de importação */}
            {ok !== undefined && (
              <p className="mb-4 text-sm text-good font-medium bg-[var(--good)]/10 border border-[var(--good)]/30 rounded-lg px-3 py-2">
                Importado: {ok} linha(s) nova(s)
                {Number(dup) > 0 ? ` · ${dup} repetida(s) ignorada(s)` : ""}.
              </p>
            )}
            {erro && (
              <p className="mb-4 text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
                Não deu para conciliar essa linha (valores ou conta não batem).
              </p>
            )}

            <div className="mb-6">
              <FormularioImportarExtrato contaId={contaId} action={importarExtratoAction} />
            </div>

            {/* Sugestões de casamento */}
            <section className="mb-8">
              <h2 className="text-lg font-bold text-ink tracking-tight mb-2">
                Casamentos sugeridos {sugestoes.length > 0 && `(${sugestoes.length})`}
              </h2>
              {sugestoes.length === 0 ? (
                <p className="text-muted text-sm">
                  {linhas.length === 0
                    ? "Importe um extrato para começar."
                    : "Nada a sugerir agora — tudo casado ou sem par exato."}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {sugestoes.map((s) => (
                    <div key={s.extrato_id} className="rounded-2xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Banco</span>
                            <span className="text-ink font-medium truncate">{s.extrato_desc ?? "—"}</span>
                          </div>
                          <div className="text-xs text-muted">{formatarData(s.extrato_data)}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Sistema</span>
                            <span className="text-ink truncate">{s.lancamento_desc ?? "—"}</span>
                          </div>
                          <div className="text-xs text-muted">
                            {formatarData(s.lancamento_data)}
                            {s.dias > 0 ? ` · ${s.dias} dia(s) de diferença` : " · mesma data"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`tabular-nums font-bold ${s.extrato_valor < 0 ? "text-danger" : "text-good"}`}>
                            {s.extrato_valor < 0 ? "−" : "+"}{formatarBRL(Math.abs(s.extrato_valor))}
                          </div>
                          <form action={conciliarAction} className="mt-2">
                            <input type="hidden" name="conta_id" value={contaId} />
                            <input type="hidden" name="extrato_id" value={s.extrato_id} />
                            <input type="hidden" name="lancamento_id" value={s.lancamento_id} />
                            <button className="h-9 rounded-lg bg-accent text-white px-4 text-sm font-bold active:scale-[0.99]">
                              Casar
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Linhas do banco (todas) */}
            {linhas.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-ink tracking-tight mb-2">
                  Extrato importado · {conciliadas.length}/{linhas.length} conciliadas
                </h2>
                <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
                  {linhas.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block text-ink font-medium truncate">{l.descricao ?? "—"}</span>
                        <span className="block text-xs text-muted">
                          {formatarData(l.data)} ·{" "}
                          {l.conciliado ? (
                            <span className="text-good">✓ conciliada</span>
                          ) : (
                            <span className="text-amber">sem par ainda</span>
                          )}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className={`tabular-nums font-semibold ${l.valor < 0 ? "text-danger" : "text-good"}`}>
                          {l.valor < 0 ? "−" : "+"}{formatarBRL(Math.abs(l.valor))}
                        </span>
                        {l.conciliado && (
                          <form action={desconciliarAction}>
                            <input type="hidden" name="conta_id" value={contaId} />
                            <input type="hidden" name="extrato_id" value={l.id} />
                            <button className="text-xs font-semibold text-muted hover:text-danger underline decoration-dotted">
                              desfazer
                            </button>
                          </form>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {pendentes.length > 0 && (
                  <p className="text-xs text-muted mt-2">
                    {pendentes.length} linha(s) do banco ainda sem par no sistema. Se
                    faltar um lançamento (ex.: tarifa, rendimento), registre um ajuste
                    na conta e volte aqui.
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
