"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { criarClienteNavegador } from "@/lib/supabase/client";

export default function RedefinirPage() {
  const [pronto, setPronto] = useState(false);
  const [temSessao, setTemSessao] = useState(false);
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // A sessão de recuperação já foi criada pela rota /auth/confirmar (troca o
  // code PKCE e grava nos cookies). Aqui só conferimos que ela existe.
  useEffect(() => {
    const supabase = criarClienteNavegador();
    supabase.auth.getSession().then(({ data }) => {
      setTemSessao(!!data.session);
      setPronto(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setTemSessao(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== conf) return setErro("As senhas não são iguais.");
    setEnviando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return setErro("Não deu para salvar. Peça um novo link e tente de novo.");
    setOk(true);
    await supabase.auth.signOut();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent text-white grid place-items-center text-2xl font-extrabold tracking-tight shadow-lg">JS</div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Nova senha</h1>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 shadow-[var(--shadow)]">
          {ok ? (
            <div className="text-center flex flex-col gap-4">
              <p className="text-good font-semibold">✅ Senha alterada!</p>
              <Link href="/login" className="h-12 inline-flex items-center justify-center rounded-xl bg-accent text-white font-bold">
                Ir para o login
              </Link>
            </div>
          ) : !pronto ? (
            <p className="text-muted text-center">Carregando…</p>
          ) : !temSessao ? (
            <div className="text-center flex flex-col gap-3">
              <p className="text-danger font-medium">Este link expirou ou é inválido.</p>
              <Link href="/login" className="text-sm font-semibold text-accent-ink hover:underline">
                Pedir um novo link
              </Link>
            </div>
          ) : (
            <form onSubmit={salvar} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink">Nova senha</span>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="••••••••" className="min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent focus:bg-surface" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink">Repita a senha</span>
                <input type="password" value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="new-password" placeholder="••••••••" className="min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent focus:bg-surface" />
              </label>
              {erro && <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">{erro}</p>}
              <button type="submit" disabled={enviando} className="h-14 rounded-xl bg-accent text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60">
                {enviando ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
