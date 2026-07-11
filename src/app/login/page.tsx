"use client";

import { useActionState, useState } from "react";
import { autenticar, type EstadoAuth } from "./actions";

const estadoInicial: EstadoAuth = {};

export default function LoginPage() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [estado, formAction, enviando] = useActionState(
    autenticar,
    estadoInicial,
  );

  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <div className="w-full max-w-[420px]">
        {/* Marca */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent text-white grid place-items-center text-2xl font-extrabold tracking-tight shadow-lg">
            JS
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
            JS Importados
          </h1>
          <p className="text-muted text-sm mt-1">
            Controle de compra, venda, estoque e caixa.
          </p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 shadow-[var(--shadow)]">
          {/* Alternador */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-2 border border-line mb-6">
            <button
              type="button"
              onClick={() => setModo("entrar")}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                modo === "entrar"
                  ? "bg-surface text-ink shadow-[var(--shadow)]"
                  : "text-muted"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setModo("criar")}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                modo === "criar"
                  ? "bg-surface text-ink shadow-[var(--shadow)]"
                  : "text-muted"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="modo" value={modo} />
            {modo === "criar" && (
              <Campo
                label="Seu nome"
                name="nome"
                type="text"
                placeholder="Ex.: Maria"
                autoComplete="name"
              />
            )}
            <Campo
              label="E-mail"
              name="email"
              type="email"
              placeholder="voce@exemplo.com"
              autoComplete="email"
            />
            <Campo
              label="Senha"
              name="senha"
              type="password"
              placeholder="••••••••"
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            />

            {estado.erro && (
              <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
                {estado.erro}
              </p>
            )}
            {estado.aviso && (
              <p className="text-sm text-accent-ink font-medium bg-accent-soft border border-accent/30 rounded-lg px-3 py-2">
                {estado.aviso}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="h-14 rounded-xl bg-accent text-white text-lg font-bold tracking-tight shadow-[var(--shadow)] transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {enviando
                ? "Aguarde…"
                : modo === "entrar"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-5">
          {modo === "criar"
            ? "A primeira conta criada será a de gestão (dono)."
            : "Acesse com sua conta para continuar."}
        </p>
      </div>
    </main>
  );
}

function Campo({
  label,
  name,
  type,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="h-13 min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink placeholder:text-muted outline-none focus:border-accent focus:bg-surface transition-colors"
      />
    </label>
  );
}
