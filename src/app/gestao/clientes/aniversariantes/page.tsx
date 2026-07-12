import { exigirGestao } from "@/lib/perfil";
import { aniversariantesDoMes } from "@/lib/dados/crm";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function mesBRT(): number {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    month: "2-digit",
  }).format(new Date());
  return Number(s);
}

function whatsapp(tel: string | null): string | null {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : "55" + d}`;
}

export default async function AniversariantesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const mesNum = Number(sp.mes);
  const mes = mesNum >= 1 && mesNum <= 12 ? mesNum : mesBRT();
  const lista = await aniversariantesDoMes(mes);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Aniversariantes"
          descricao="Quem faz aniversário no mês — mande um oi."
          voltarHref="/gestao/cadastros"
        />

        <form method="get" className="flex items-end gap-3 mb-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Mês</span>
            <select name="mes" defaultValue={String(mes)} className="min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-ink outline-none focus:border-accent">
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-11 px-4 rounded-lg bg-accent text-white font-bold">Ver</button>
        </form>

        {lista.length === 0 ? (
          <p className="text-muted text-center py-10">Ninguém faz aniversário em {MESES[mes - 1]}.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lista.map((a) => {
              const wa = whatsapp(a.telefone);
              return (
                <li key={a.cliente_id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                  <span className="w-11 h-11 rounded-full bg-accent-soft text-accent-ink grid place-items-center font-extrabold shrink-0">
                    {String(a.dia).padStart(2, "0")}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-ink truncate">{a.nome}</span>
                    {a.telefone && <span className="block text-sm text-muted">{a.telefone}</span>}
                  </span>
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="h-10 px-3 inline-flex items-center rounded-xl bg-good text-white text-sm font-bold shrink-0">
                      WhatsApp
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
