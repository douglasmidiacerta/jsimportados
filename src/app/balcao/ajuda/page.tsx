import Link from "next/link";
import { exigirPerfil } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";

type Passo = { texto: string; dica?: string };
type Guia = {
  cor: string;
  emoji: string;
  titulo: string;
  quando: string;
  passos: Passo[];
  acaoHref?: string;
  acaoTexto?: string;
};

const GUIAS: Guia[] = [
  {
    cor: "var(--accent)",
    emoji: "🔓",
    titulo: "Começar o dia: abrir o caixa",
    quando: "Toda manhã, antes da primeira venda.",
    passos: [
      { texto: "Toque em CAIXA na tela inicial." },
      { texto: "Conte o dinheiro que já está na gaveta e digite o valor." },
      { texto: "Toque em “Abrir o caixa”. Pronto — já pode vender!" },
    ],
    acaoHref: "/balcao/caixa",
    acaoTexto: "Ir para o Caixa",
  },
  {
    cor: "var(--accent)",
    emoji: "🛒",
    titulo: "Vender",
    quando: "Sempre que um cliente comprar algo.",
    passos: [
      { texto: "Toque em VENDER." },
      { texto: "Busque o produto pelo nome (ou passe o leitor de código de barras) e toque para adicionar." },
      { texto: "Ajuste a quantidade com os botões − e +." },
      { texto: "Toque em “Cobrar”." },
      { texto: "Escolha como o cliente pagou: Dinheiro, Pix, Cartão ou Fiado.", dica: "No cartão, escolha a maquininha. No fiado, escolha o cliente." },
      { texto: "Toque em “Finalizar venda”. Se quiser, toque em “Recibo” para imprimir." },
    ],
    acaoHref: "/balcao/vender",
    acaoTexto: "Fazer uma venda",
  },
  {
    cor: "var(--accent)",
    emoji: "📦",
    titulo: "Chegou mercadoria",
    quando: "Quando chegar produto novo pra colocar no estoque.",
    passos: [
      { texto: "Toque em ENTRADA." },
      { texto: "Busque o produto e diga quantas unidades chegaram." },
      { texto: "Confirme. O estoque sobe na hora.", dica: "Se o produto ainda não existe, peça pra gestão cadastrar." },
    ],
    acaoHref: "/balcao/entrada",
    acaoTexto: "Registrar entrada",
  },
  {
    cor: "var(--accent)",
    emoji: "🔒",
    titulo: "Terminar o dia: fechar o caixa",
    quando: "No fim do expediente.",
    passos: [
      { texto: "Toque em CAIXA e depois em “Fechar o caixa”." },
      { texto: "Conte todo o dinheiro da gaveta e digite o total." },
      { texto: "Se o valor não bater, escreva o que aconteceu no campo de observação — aí dá pra fechar." },
    ],
    acaoHref: "/balcao/caixa",
    acaoTexto: "Ir para o Caixa",
  },
  {
    cor: "var(--danger)",
    emoji: "😅",
    titulo: "Errei! E agora?",
    quando: "Calma — dá pra consertar.",
    passos: [
      { texto: "Marcou o produto errado ou o cliente desistiu? Na tela do recibo da venda, toque em “Errou algo? Cancelar esta venda”." },
      { texto: "Isso devolve o produto pro estoque e tira o dinheiro do caixa, automaticamente." },
      { texto: "Se for uma venda de outro dia ou algo maior, é só chamar a gestão — eles resolvem.", dica: "Nada quebra. Pode ficar tranquila." },
    ],
  },
];

export default async function AjudaPage() {
  const perfil = await exigirPerfil();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <Link
          href="/balcao"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Voltar
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Guia rápido</h1>
        <p className="text-muted mt-1 mb-6">
          O passo a passo de tudo que você faz no dia a dia. Sem pressa — o sistema não deixa
          você quebrar nada.
        </p>

        <div className="flex flex-col gap-4">
          {GUIAS.map((g) => (
            <section
              key={g.titulo}
              className="rounded-2xl border bg-surface p-5"
              style={{ borderColor: g.cor === "var(--danger)" ? "color-mix(in srgb, var(--danger) 40%, transparent)" : "var(--line)" }}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl" aria-hidden="true">{g.emoji}</span>
                <h2 className="text-lg font-bold text-ink tracking-tight">{g.titulo}</h2>
              </div>
              <p className="text-sm text-muted mb-4">{g.quando}</p>

              <ol className="flex flex-col gap-3">
                {g.passos.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="shrink-0 w-7 h-7 rounded-full grid place-items-center text-sm font-bold text-white"
                      style={{ background: g.cor }}
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5">
                      <span className="block text-ink">{p.texto}</span>
                      {p.dica && <span className="block text-xs text-muted mt-0.5">💡 {p.dica}</span>}
                    </span>
                  </li>
                ))}
              </ol>

              {g.acaoHref && (
                <Link
                  href={g.acaoHref}
                  className="mt-4 inline-flex items-center gap-2 h-11 rounded-xl bg-accent text-white px-5 font-bold shadow-[var(--shadow)] active:scale-[0.99]"
                >
                  {g.acaoTexto}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </Link>
              )}
            </section>
          ))}
        </div>

        <p className="text-center text-sm text-muted mt-8">
          Qualquer dúvida, fala com o Douglas 💬
        </p>
      </main>
    </>
  );
}
