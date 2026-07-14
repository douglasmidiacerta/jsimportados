import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarSessoesCaixa, obterCaixaAberto } from "@/lib/dados/caixa";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { AbrirCaixa } from "@/components/caixa/AbrirCaixa";
import { PainelCaixa } from "@/components/caixa/PainelCaixa";
import {
  abrirCaixaAction,
  sangriaAction,
  suprimentoAction,
  fecharCaixaAction,
} from "./actions";

export default async function CaixaGestaoPage() {
  const perfil = await exigirGestao();
  const [caixa, sessoes] = await Promise.all([
    obterCaixaAberto(),
    listarSessoesCaixa(),
  ]);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Caixa"
          descricao="Abra, movimente e feche o caixa — e veja o histórico com as diferenças."
          voltarHref="/gestao"
        />

        {/* Operar o caixa (a gestão VÊ o esperado; o balcão não — contagem às cegas) */}
        <section className="mb-8">
          <div className="mx-auto max-w-md">
            {caixa ? (
              <PainelCaixa
                caixa={caixa}
                esperado={caixa.esperado_dinheiro_atual}
                sangriaAction={sangriaAction}
                suprimentoAction={suprimentoAction}
                fecharAction={fecharCaixaAction}
              />
            ) : (
              <AbrirCaixa action={abrirCaixaAction} />
            )}
          </div>
        </section>

        {/* Histórico (intacto) */}
        <h2 className="text-sm font-bold text-muted uppercase tracking-wide mb-3">
          Histórico
        </h2>
        {sessoes.length === 0 ? (
          <p className="text-muted text-center py-8">
            Nenhum caixa ainda. Abra o primeiro aí em cima.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessoes.map((s) => {
              const aberto = s.status === "aberto";
              const dif = s.diferenca ?? 0;
              return (
                <li key={s.id}>
                  <Link
                    href={`/gestao/caixa/${s.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-surface-2 transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-ink">
                          {formatarData(s.aberto_em.slice(0, 10))}
                        </span>
                        {aberto && (
                          <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--good)]/15 text-good border border-good/30">
                            aberto
                          </span>
                        )}
                      </span>
                      <span className="block text-sm text-muted">
                        abertura {formatarBRL(s.valor_abertura)}
                        {!aberto && s.valor_contado != null
                          ? ` · contou ${formatarBRL(s.valor_contado)}`
                          : ""}
                      </span>
                    </span>
                    {!aberto && (
                      <span
                        className={`text-right shrink-0 font-semibold tabular-nums ${
                          dif === 0 ? "text-good" : dif > 0 ? "text-amber" : "text-danger"
                        }`}
                      >
                        {dif === 0
                          ? "bateu"
                          : `${dif > 0 ? "+" : "−"}${formatarBRL(Math.abs(dif))}`}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
