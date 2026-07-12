import Link from "next/link";
import { hojeBRT, inicioMesBRT } from "@/lib/dados/financeiro";
import type { ClasseABC } from "@/lib/dados/abc";

// ------------------------------- período -------------------------------

function dataValida(v?: string): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Resolve o período de searchParams: valida, default mês corrente, troca se de>ate. */
export function resolverPeriodo(de?: string, ate?: string): { de: string; ate: string } {
  let d = dataValida(de) ? de : inicioMesBRT();
  let a = dataValida(ate) ? ate : hojeBRT();
  if (d > a) [d, a] = [a, d];
  return { de: d, ate: a };
}

function addDias(ymd: string, delta: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function periodos(rota: string, sufixo: string) {
  const hoje = hojeBRT();
  const [y, m] = hoje.split("-").map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  const pmStr = String(pm).padStart(2, "0");
  const ultimoDiaAnterior = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  return [
    { rotulo: "Hoje", de: hoje, ate: hoje },
    { rotulo: "7 dias", de: addDias(hoje, -6), ate: hoje },
    { rotulo: "Este mês", de: inicioMesBRT(), ate: hoje },
    { rotulo: "Mês passado", de: `${py}-${pmStr}-01`, ate: `${py}-${pmStr}-${String(ultimoDiaAnterior).padStart(2, "0")}` },
  ].map((p) => ({ ...p, href: `${rota}?de=${p.de}&ate=${p.ate}${sufixo}` }));
}

/** `base` (opcional) preserva o toggle faturamento/lucro ao trocar o período. */
export function FiltroPeriodo({
  base,
  de,
  ate,
  metrica,
}: {
  base: string;
  de: string;
  ate: string;
  metrica?: string;
}) {
  const sufixo = metrica ? `&base=${metrica}` : "";
  return (
    <div className="mb-4 rounded-2xl border border-line bg-surface-2 p-3">
      <form method="get" className="flex flex-wrap items-end gap-3">
        {metrica && <input type="hidden" name="base" value={metrica} />}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">De</span>
          <input type="date" name="de" defaultValue={de} className="min-h-[44px] rounded-lg border border-line bg-surface px-3 text-ink outline-none focus:border-accent" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">Até</span>
          <input type="date" name="ate" defaultValue={ate} className="min-h-[44px] rounded-lg border border-line bg-surface px-3 text-ink outline-none focus:border-accent" />
        </label>
        <button type="submit" className="h-11 px-4 rounded-lg bg-accent text-white font-bold">Ver</button>
      </form>
      <div className="flex flex-wrap gap-2 mt-2">
        {periodos(base, sufixo).map((p) => (
          <Link key={p.rotulo} href={p.href} className="text-xs font-semibold text-muted hover:text-ink border border-line rounded-full px-3 py-1">
            {p.rotulo}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ------------------------------- ABC UI -------------------------------

export function corClasse(classe: ClasseABC): string {
  return classe === "A" ? "text-good" : classe === "B" ? "text-amber" : "text-muted";
}
export function corBarraClasse(classe: ClasseABC): string {
  return classe === "A" ? "bg-good" : classe === "B" ? "bg-[var(--amber)]" : "bg-surface-3";
}

export function BadgeClasse({ classe }: { classe: ClasseABC }) {
  return (
    <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${corClasse(classe)} border-current/30`}>
      {classe}
    </span>
  );
}

/** Barra horizontal proporcional (0..100%). */
export function BarraProporcional({ pct, cor }: { pct: number; cor?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
      <div className={`h-full rounded-full ${cor ?? "bg-accent"}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function AvisoCustoIncompleto() {
  return (
    <p className="text-sm text-amber bg-[var(--amber-soft)] border border-[var(--amber)]/30 rounded-xl px-3 py-2 mb-4">
      ⚠️ Há produtos vendidos sem custo cadastrado — o lucro e a margem podem estar
      superestimados.
    </p>
  );
}
