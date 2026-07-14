import Link from "next/link";
import { exigirPerfil } from "@/lib/perfil";
import { obterCaixaAberto, ultimoFechamento } from "@/lib/dados/caixa";
import { BarraTopo } from "@/components/BarraTopo";
import { AbrirCaixa } from "@/components/caixa/AbrirCaixa";
import { PainelCaixa } from "@/components/caixa/PainelCaixa";
import {
  abrirCaixaAction,
  sangriaAction,
  suprimentoAction,
  fecharCaixaAction,
} from "./actions";

export default async function CaixaPage() {
  const perfil = await exigirPerfil();
  const caixa = await obterCaixaAberto();
  // Só busca o fechamento anterior quando NÃO há caixa aberto (é a tela de abrir).
  const anterior = caixa ? null : await ultimoFechamento();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <main className="mx-auto max-w-md w-full px-4 py-6 sm:py-8 flex-1">
        <Link
          href="/balcao"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors mb-5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          Voltar
        </Link>

        {caixa ? (
          <PainelCaixa
            caixa={{
              id: caixa.id,
              status: caixa.status,
              valor_abertura: caixa.valor_abertura,
              aberto_em: caixa.aberto_em,
              vendas_dinheiro: caixa.vendas_dinheiro,
              vendas_pix: caixa.vendas_pix,
              suprimentos: caixa.suprimentos,
              sangrias: caixa.sangrias,
            }}
            // ⚠️ O esperado agora VAI para o balcão (decisão do dono, 14/07/2026):
            // ele quer ver a diferença caindo até zero enquanto digita. Isso
            // encerra a contagem às cegas — escolha consciente dele. As travas do
            // banco (diferença exige justificativa) continuam de pé.
            esperado={caixa.esperado_dinheiro_atual}
            // o card grande fica só na gestão; aqui a informação aparece embaixo
            // do campo, na hora de contar.
            sangriaAction={sangriaAction}
            suprimentoAction={suprimentoAction}
            fecharAction={fecharCaixaAction}
          />
        ) : (
          <AbrirCaixa action={abrirCaixaAction} fechamentoAnterior={anterior} />
        )}
      </main>
    </>
  );
}
