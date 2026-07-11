# JS Importados — ERP de gestão

Sistema web para importadora (compra no Paraguai, venda no Brasil).
Controle de **compra, venda, estoque e caixa**, com dois modos de uso sobre a
mesma base de dados:

- **Modo Operação** (balcão) — telas simples, botões grandes, à prova de leigo.
- **Modo Gestão** — financeiro completo, relatórios, curvas ABC e auditoria.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + RLS)
- Deploy na **Vercel**

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev
```

Abra http://localhost:3000. A **primeira conta criada** vira automaticamente a
de **gestão** (dono); as demais entram como **operação**.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (publishable) do Supabase |

## Estrutura

```
src/
  app/
    login/          Login e cadastro (Server Actions)
    balcao/         Modo Operação — home + telas do dia a dia
    gestao/         Modo Gestão — painel
  components/       BarraTopo, BotaoGigante, EmBreve
  lib/
    supabase/       Clientes (navegador, servidor, sessão)
    perfil.ts       Perfil do usuário e roteamento por papel
  proxy.ts          Renova a sessão e protege rotas privadas
```

## Fases

1. **Fundação** ✅ — base, login por perfil, design system, deploy.
2. Cadastros · 3. Compra/Importação · 4. Venda/PDV · 5. Caixa ·
6. Financeiro · 7. CRM/Preços · 8. Relatórios · 9. Refino.
