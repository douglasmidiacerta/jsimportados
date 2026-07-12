import { exigirGestao } from "@/lib/perfil";
import { listarUsuarios, listarConvitesPendentes } from "@/lib/dados/usuarios";
import { formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { AvisoErro } from "@/components/cadastros/AvisoErro";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { NovoConvite } from "@/components/usuarios/NovoConvite";
import {
  convidarAction,
  revogarConviteAction,
  definirPapelAction,
  definirAtivoAction,
} from "./actions";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const perfil = await exigirGestao();
  const { erro } = await searchParams;
  const [usuarios, convites] = await Promise.all([
    listarUsuarios(),
    listarConvitesPendentes(),
  ]);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Usuários e acesso"
          descricao="Quem entra no sistema, com qual papel."
          voltarHref="/gestao"
        />
        <AvisoErro mensagem={erro} />

        <section className="mb-6">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Convidar alguém</h2>
          <NovoConvite action={convidarAction} />
        </section>

        {convites.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Convites pendentes</h2>
            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {convites.map((c) => (
                <div key={c.email} className="flex items-center justify-between px-4 py-3 gap-3">
                  <span className="min-w-0">
                    <span className="block text-ink font-medium truncate">{c.email}</span>
                    <span className="block text-xs text-muted">{c.papel === "gestao" ? "Gestão" : "Operação"} · aguardando cadastro</span>
                  </span>
                  <BotaoConfirmar
                    action={revogarConviteAction}
                    hidden={{ email: c.email }}
                    rotulo="Revogar"
                    confirmar={`Revogar o convite de ${c.email}?`}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Usuários</h2>
          <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
            {usuarios.map((u) => {
              const ehEu = u.id === perfil.id;
              return (
                <div key={u.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink truncate">{u.nome || u.email}</span>
                      <span className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border ${u.papel === "gestao" ? "bg-accent-soft text-accent-ink border-accent/30" : "bg-surface-3 text-muted border-line"}`}>
                        {u.papel === "gestao" ? "gestão" : "operação"}
                      </span>
                      {!u.ativo && <span className="text-[10px] font-mono uppercase tracking-wide text-danger">desativado</span>}
                      {ehEu && <span className="text-[10px] font-mono uppercase tracking-wide text-muted">você</span>}
                    </span>
                    <span className="block text-xs text-muted truncate">{u.email} · desde {formatarData(u.criado_em.slice(0, 10))}</span>
                  </span>

                  {!ehEu && (
                    <span className="flex items-center gap-2 shrink-0">
                      <form action={definirPapelAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="papel" value={u.papel === "gestao" ? "operacao" : "gestao"} />
                        <button type="submit" className="text-xs font-semibold text-muted hover:text-ink">
                          {u.papel === "gestao" ? "→ Operação" : "→ Gestão"}
                        </button>
                      </form>
                      <BotaoConfirmar
                        action={definirAtivoAction}
                        hidden={{ id: u.id, ativo: u.ativo ? "false" : "true" }}
                        rotulo={u.ativo ? "Desligar" : "Religar"}
                        confirmar={u.ativo ? `Desligar ${u.nome || u.email}? Ela perde o acesso.` : `Religar ${u.nome || u.email}?`}
                        variante={u.ativo ? "perigo" : "sutil"}
                      />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
