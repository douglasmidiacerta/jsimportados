<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# JS Importados — o que você precisa saber antes de mexer

ERP de uma importadora (Paraguai→Brasil). **Fale português com o dono (Douglas).**
Dois modos sobre o mesmo banco: **`/balcao`** (Modo Operação — a Jessica é leiga,
mobile é prioridade, **custo e margem NUNCA aparecem lá**) e **`/gestao`**
(Modo Gestão — financeiro, relatórios, DRE).

Sistema **completo e no ar** em `jsimportados.vercel.app`. Produção zerada,
esperando o 1º dia real. Docs: `docs/regras-erp.md` (travas) e
`docs/mapa-de-rotas.md` (navegação).

## Invariantes — quebrar qualquer uma destas causa bug real

1. **`produtos.custo` NÃO EXISTE.** Custo vive em `produtos_custo` (SELECT
   só-gestão) porque RLS não filtra coluna. Trigger que use `new.custo` em
   `produtos` quebra. No balcão, **nunca `select("*")`** — projeção explícita.
2. **Autorização mora no BANCO.** Guards de app protegem só a UI; quem tem JWT
   chama o PostgREST direto. Toda regra vira trigger/RLS/RPC.
   `meu_papel()` retorna `''`, nunca `null` (senão o `raise` do guard não dispara).
3. **Ledger é imutável.** Estorno/devolução = **linha negativa**, nunca DELETE.
   Estoque e caixa **sempre** derivam da soma dos movimentos.
4. **Anti-dupla-contagem:** compra é saída de caixa, mas **nunca despesa no DRE**
   (entra como CMV na venda). Cartão/fiado entram no extrato como líquido **na
   data real** de liquidação. Receita DRE = `subtotal − desconto`.
5. **Fuso:** use `hoje_brt()` / `hojeBRT()`. `current_date` é UTC — venda após
   21h BRT pegava a data de amanhã.
6. **O menu tem fonte única:** `src/lib/navegacao.ts` (sidebar + drawer mobile
   consomem de lá). **O painel `/gestao` NÃO é menu** — é dashboard.
7. **Regra do dono:** *tudo que é cadastro fica em Cadastros.*
   Hubs: Cadastros = criar uma vez · Financeiro = operar o dinheiro ·
   Relatórios = analisar · Ajustes = configurar.
8. **Dinheiro:** o cliente já converte com `parseMoedaBR` e manda número. A
   Server Action só valida com `Number()` — **reparsear vira erro de 10×**.

## Banco e deploy

O **MCP do Supabase não alcança este projeto** (é de outra conta do Douglas —
dá 403). SQL de verdade só via script Node `pg` no pooler
(`aws-0-ca-central-1.pooler.supabase.com`, user `postgres.hpdpgvqxalxjywgizrxt`).
Migration: sempre `BEGIN` → aplica → checa → **`ROLLBACK`** primeiro; só faz
`COMMIT` depois do **"pode subir"** explícito do dono.

Deploy: push na `main` → Vercel → `jsimportados.vercel.app`. **Nunca digite a
senha do Douglas** — login é sempre com ele.
