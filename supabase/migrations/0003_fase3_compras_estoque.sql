-- =====================================================================
-- JS Importados — Fase 3 (Compra/Importação + Estoque)
-- Idempotente. Rodar no SQL Editor do Supabase (dono = postgres).
-- Depende de: public.meu_papel() (STABLE, SECURITY DEFINER, search_path=public),
--             public.tocar_atualizado_em(), public.produtos, public.fornecedores.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) ADITIVO EM PRODUTOS: saldo denormalizado (cache; fonte da verdade = ledger)
-- ---------------------------------------------------------------------
alter table public.produtos
  add column if not exists estoque_atual numeric(14,3) not null default 0;

-- ---------------------------------------------------------------------
-- 0b) CUSTO em tabela 1:1 SÓ-GESTÃO (a operação NUNCA lê custo, nem via PostgREST).
--     A RLS é row-level (não oculta coluna) e operação/gestão compartilham o role
--     'authenticated' — então a única forma de esconder o custo/margem é isolá-lo
--     numa tabela cujo SELECT é negado à operação.
-- ---------------------------------------------------------------------
create table if not exists public.produtos_custo (
  produto_id uuid primary key references public.produtos(id) on delete cascade,
  custo      numeric(14,4),
  constraint produtos_custo_nao_neg check (custo is null or custo >= 0)
);

-- migra o custo existente (na Fase 2 era sempre NULL; idempotente)
insert into public.produtos_custo (produto_id, custo)
select id, custo from public.produtos where custo is not null
on conflict (produto_id) do nothing;

-- remove o guard da Fase 2 (mexia em produtos.custo) e a própria coluna produtos.custo
drop trigger if exists trg_produtos_operacao_guard on public.produtos;
drop function if exists public.produtos_operacao_guard();
alter table public.produtos drop column if exists custo;

alter table public.produtos_custo enable row level security;
drop policy if exists produtos_custo_all on public.produtos_custo;
create policy produtos_custo_all on public.produtos_custo for all to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');

-- ---------------------------------------------------------------------
-- 1) COMPRAS (cabeçalho) — gestão-only
-- ---------------------------------------------------------------------
create table if not exists public.compras (
  id                 uuid primary key default gen_random_uuid(),
  fornecedor_id      uuid references public.fornecedores(id) on delete set null,
  moeda              text not null check (moeda in ('USD','PYG','BRL')),
  cambio             numeric(20,10) not null,            -- BRL por 1 unidade da moeda (BRL => 1)
  data_compra        date not null default current_date,
  observacoes        text,
  total_itens_brl    numeric(14,2) not null default 0,   -- calculado pelo servidor
  total_despesas_brl numeric(14,2) not null default 0,   -- calculado pelo servidor
  total_geral_brl    numeric(14,2) not null default 0,   -- calculado pelo servidor
  status             text not null default 'confirmada', -- reservado p/ estorno futuro (sem uso agora)
  criado_por         uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  constraint compras_cambio_pos check (cambio > 0)
);
create index if not exists compras_data_idx       on public.compras (data_compra desc);
create index if not exists compras_fornecedor_idx on public.compras (fornecedor_id);
drop trigger if exists trg_compras_touch on public.compras;
create trigger trg_compras_touch before update on public.compras
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- 2) COMPRA_ITENS — gestão-only (contém custo)
-- ---------------------------------------------------------------------
create table if not exists public.compra_itens (
  id                  uuid primary key default gen_random_uuid(),
  compra_id           uuid not null references public.compras(id) on delete cascade,
  produto_id          uuid not null references public.produtos(id) on delete restrict,
  posicao             int  not null default 0,               -- ordinal p/ desempate de resíduo
  quantidade          numeric(14,3) not null,                -- input
  custo_origem_unit   numeric(18,6) not null,                -- input (na moeda de origem)
  custo_item_brl      numeric(16,4) not null default 0,      -- qtd*custo*cambio (servidor)
  rateio_despesa      numeric(16,4) not null default 0,      -- fatia das despesas (servidor)
  custo_total_brl     numeric(16,4) not null default 0,      -- custo_item_brl + rateio (servidor)
  custo_real_unitario numeric(14,4) not null default 0,      -- custo_total_brl / qtd (servidor)
  constraint compra_itens_qtd_pos  check (quantidade > 0),
  constraint compra_itens_custo_nn check (custo_origem_unit >= 0),
  constraint compra_itens_produto_unico unique (compra_id, produto_id)
);
create index if not exists compra_itens_compra_idx  on public.compra_itens (compra_id);
create index if not exists compra_itens_produto_idx on public.compra_itens (produto_id);

-- ---------------------------------------------------------------------
-- 3) COMPRA_DESPESAS — gestão-only
-- ---------------------------------------------------------------------
create table if not exists public.compra_despesas (
  id         uuid primary key default gen_random_uuid(),
  compra_id  uuid not null references public.compras(id) on delete cascade,
  descricao  text not null default 'Despesa',
  valor_brl  numeric(14,2) not null default 0,
  constraint compra_despesas_valor_nn check (valor_brl >= 0)
);
create index if not exists compra_despesas_compra_idx on public.compra_despesas (compra_id);

-- ---------------------------------------------------------------------
-- 4) MOVIMENTACOES_ESTOQUE (ledger imutável; fonte da verdade do saldo)
--    quantidade SINALIZADA: entrada>0, saida<0, ajuste<>0  =>  saldo = SUM(quantidade)
-- ---------------------------------------------------------------------
create table if not exists public.movimentacoes_estoque (
  id             uuid primary key default gen_random_uuid(),
  produto_id     uuid not null references public.produtos(id) on delete restrict,
  tipo           text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade     numeric(14,3) not null,                 -- delta com sinal
  custo_unitario numeric(14,4),                           -- custo real/un; NULL no balcão e em saídas
  compra_id      uuid references public.compras(id) on delete set null,
  origem         text not null default 'ajuste'
                   check (origem in ('compra','entrada_balcao','venda','ajuste')),
  observacoes    text,
  criado_por     uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em      timestamptz not null default now(),
  constraint mov_sinal check (
    (tipo = 'entrada' and quantidade > 0) or
    (tipo = 'saida'   and quantidade < 0) or
    (tipo = 'ajuste'  and quantidade <> 0)
  ),
  constraint mov_custo_nn check (custo_unitario is null or custo_unitario >= 0)
);
create index if not exists mov_produto_idx on public.movimentacoes_estoque (produto_id);
create index if not exists mov_compra_idx  on public.movimentacoes_estoque (compra_id);
create index if not exists mov_criado_idx  on public.movimentacoes_estoque (criado_em desc);

-- ---------------------------------------------------------------------
-- 5) GUARD (BEFORE INSERT) — operação nunca define custo/compra; só entrada
-- ---------------------------------------------------------------------
create or replace function public.movimentacoes_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select public.meu_papel()) is distinct from 'gestao' then
    new.custo_unitario := null;          -- operação NUNCA define custo
    new.compra_id      := null;          -- operação não vincula compra
    new.origem         := 'entrada_balcao';
    if new.tipo is distinct from 'entrada' then
      raise exception 'A operacao so pode registrar entradas de mercadoria.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_mov_guard on public.movimentacoes_estoque;
create trigger trg_mov_guard before insert on public.movimentacoes_estoque
  for each row execute function public.movimentacoes_guard();

-- ---------------------------------------------------------------------
-- 6) APLICAR MOVIMENTACAO (AFTER INSERT) — saldo + CUSTO MÉDIO PONDERADO
--    SECURITY DEFINER: a operação insere 'entrada' mas produtos UPDATE é só-gestão;
--    o owner contorna a RLS de forma controlada.
-- ---------------------------------------------------------------------
create or replace function public.aplicar_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo numeric(14,3);
  v_custo numeric(14,4);
  v_novo  numeric(14,4);
begin
  select estoque_atual into v_saldo
    from public.produtos
   where id = new.produto_id
   for update;                                    -- serializa concorrência no mesmo produto
  if not found then
    raise exception 'Produto % inexistente', new.produto_id;
  end if;

  -- custo médio vive em produtos_custo (isolado da operação)
  select custo into v_custo
    from public.produtos_custo
   where produto_id = new.produto_id;

  -- saldo sempre atualiza (quantidade sinalizada)
  update public.produtos
     set estoque_atual = estoque_atual + new.quantidade
   where id = new.produto_id;

  if new.tipo = 'entrada' and new.custo_unitario is not null then
    -- Fallback (adota custo novo): sem base de custo anterior OU sem saldo positivo.
    -- Inclui custo_ant IS NULL para NÃO envenenar a média quando havia entrada de
    -- balcão sem custo antes de uma compra (bug evitado).
    if v_custo is null or v_saldo <= 0 then
      v_novo := new.custo_unitario;
    else
      v_novo := round(
        (v_saldo * v_custo + new.quantidade * new.custo_unitario)
        / (v_saldo + new.quantidade), 4);
    end if;
    insert into public.produtos_custo (produto_id, custo)
    values (new.produto_id, v_novo)
    on conflict (produto_id) do update set custo = excluded.custo;
  end if;
  -- saída, ajuste ou entrada de balcão sem custo: custo intacto

  return null;                                    -- AFTER trigger
end;
$$;
drop trigger if exists trg_mov_aplicar on public.movimentacoes_estoque;
create trigger trg_mov_aplicar after insert on public.movimentacoes_estoque
  for each row execute function public.aplicar_movimentacao();

-- ---------------------------------------------------------------------
-- 7) UTIL: reconstruir o saldo a partir do ledger (reparo/auditoria; gestão)
-- ---------------------------------------------------------------------
create or replace function public.reconciliar_estoque(p_produto uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select public.meu_papel()) is distinct from 'gestao' then
    raise exception 'Apenas a gestao pode reconciliar o estoque.' using errcode = '42501';
  end if;
  update public.produtos p
     set estoque_atual = coalesce((
       select sum(m.quantidade) from public.movimentacoes_estoque m
        where m.produto_id = p.id), 0)
   where p_produto is null or p.id = p_produto;
end;
$$;
grant execute on function public.reconciliar_estoque(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8) RPC ATÔMICA — registrar_compra(p_payload jsonb) => compra_id
--    SECURITY DEFINER; recomputa TUDO no servidor (não confia no cliente).
--    Rateio proporcional ao valor por MAIOR RESTO (Σ rateio = Σ despesas, exato).
-- ---------------------------------------------------------------------
create or replace function public.registrar_compra(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra     uuid;
  v_moeda      text;
  v_cambio     numeric(20,10);
  v_fornecedor uuid;
  v_data       date;
  v_obs        text;
  v_itens      jsonb;
  v_despesas   jsonb;
  v_desp_total numeric(14,2);
  v_base_total numeric;
  v_qtd_total  numeric;
  v_cnt_itens  int;
begin
  -- 8.1 autorização (mesmo sob DEFINER, decide pelo JWT do chamador)
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode registrar compras.' using errcode = '42501';
  end if;

  -- 8.2 cabeçalho + validações
  v_moeda := upper(coalesce(p_payload->>'moeda',''));
  if v_moeda not in ('USD','PYG','BRL') then
    raise exception 'Moeda invalida: %', v_moeda using errcode = '22023';
  end if;
  v_cambio := coalesce((p_payload->>'cambio')::numeric, 0);
  if v_moeda = 'BRL' then v_cambio := 1; end if;
  if v_cambio <= 0 then
    raise exception 'Cambio deve ser maior que zero.' using errcode = '22023';
  end if;
  v_fornecedor := nullif(p_payload->>'fornecedor_id','')::uuid;
  v_data       := coalesce(nullif(btrim(p_payload->>'data_compra'),'')::date, current_date);
  v_obs        := nullif(btrim(coalesce(p_payload->>'observacoes','')),'');
  v_itens      := coalesce(p_payload->'itens',    '[]'::jsonb);
  v_despesas   := coalesce(p_payload->'despesas', '[]'::jsonb);

  if jsonb_typeof(v_itens) <> 'array' or jsonb_array_length(v_itens) = 0 then
    raise exception 'A compra precisa de pelo menos um item.' using errcode = '22023';
  end if;

  insert into public.compras (fornecedor_id, moeda, cambio, data_compra, observacoes)
  values (v_fornecedor, v_moeda, v_cambio, v_data, v_obs)
  returning id into v_compra;

  -- 8.3 itens crus + custo_item_brl (posicao = índice do array, determinístico)
  --     CHECK compra_itens_qtd_pos / _custo_nn / _produto_unico validam qtd>0,
  --     custo>=0 e produto não repetido (mapeados p/ mensagem amigável na action).
  insert into public.compra_itens
    (compra_id, produto_id, posicao, quantidade, custo_origem_unit, custo_item_brl)
  select
    v_compra,
    (t.item->>'produto_id')::uuid,
    t.ord::int,
    (t.item->>'quantidade')::numeric,
    (t.item->>'custo_origem')::numeric,
    round((t.item->>'quantidade')::numeric
          * (t.item->>'custo_origem')::numeric
          * v_cambio, 4)
  from jsonb_array_elements(v_itens) with ordinality as t(item, ord);

  -- 8.4 despesas (ignora linhas 0/vazias)
  insert into public.compra_despesas (compra_id, descricao, valor_brl)
  select v_compra,
         coalesce(nullif(btrim(dp->>'descricao'),''),'Despesa'),
         round((dp->>'valor_brl')::numeric, 2)
  from jsonb_array_elements(v_despesas) as dp
  where coalesce((dp->>'valor_brl')::numeric,0) > 0;

  select coalesce(sum(valor_brl),0) into v_desp_total
    from public.compra_despesas where compra_id = v_compra;
  select coalesce(sum(custo_item_brl),0), coalesce(sum(quantidade),0)
    into v_base_total, v_qtd_total
    from public.compra_itens where compra_id = v_compra;

  -- 8.5 RATEIO por MAIOR RESTO a 2 casas (Σ rateio = v_desp_total, exato).
  --     Peso por valor; fallback por quantidade se base_total = 0 (div/0).
  if v_desp_total > 0 then
    with base as (
      select id, posicao, custo_item_brl,
             v_desp_total * (
               case when v_base_total > 0 then custo_item_brl / v_base_total
                    else quantidade / v_qtd_total end
             ) as ideal
      from public.compra_itens where compra_id = v_compra
    ),
    piso as (
      select id, posicao, custo_item_brl,
             trunc(ideal, 2)              as piso_val,
             ideal - trunc(ideal, 2)      as resto
      from base
    ),
    faltam as (
      select round((v_desp_total - coalesce(sum(piso_val),0)) * 100)::int as cents
      from piso
    ),
    ranq as (
      select id, piso_val,
             row_number() over (order by resto desc, custo_item_brl desc, posicao asc) as rk
      from piso
    )
    update public.compra_itens ci
       set rateio_despesa = r.piso_val
             + case when r.rk <= (select cents from faltam) then 0.01 else 0 end
      from ranq r
     where ci.id = r.id;
  else
    update public.compra_itens set rateio_despesa = 0 where compra_id = v_compra;
  end if;

  -- 8.6 custo total e custo real unitário (quantidade > 0 garantido pelo CHECK)
  update public.compra_itens
     set custo_total_brl     = custo_item_brl + rateio_despesa,
         custo_real_unitario = round((custo_item_brl + rateio_despesa) / quantidade, 4)
   where compra_id = v_compra;

  -- 8.7 totais denormalizados da compra
  update public.compras c
     set total_itens_brl    = round(v_base_total, 2),
         total_despesas_brl = v_desp_total,
         total_geral_brl    = round(v_base_total + v_desp_total, 2)
   where c.id = v_compra;

  -- 8.8 ENTRADAS de estoque (o trigger faz saldo + custo médio, tudo atômico)
  insert into public.movimentacoes_estoque
    (produto_id, tipo, quantidade, custo_unitario, compra_id, origem, observacoes)
  select produto_id, 'entrada', quantidade, custo_real_unitario, v_compra, 'compra',
         'Compra ' || v_compra::text
  from public.compra_itens
  where compra_id = v_compra
  order by posicao;

  return v_compra;
end;
$$;
grant execute on function public.registrar_compra(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 9) BACKFILL idempotente do saldo (no 1º run o ledger está vazio => 0)
-- ---------------------------------------------------------------------
update public.produtos p
   set estoque_atual = coalesce((
     select sum(m.quantidade) from public.movimentacoes_estoque m
      where m.produto_id = p.id), 0);

-- ---------------------------------------------------------------------
-- 10) RLS — blindagem contra vazamento de custo (RLS é ROW-level, não filtra coluna)
-- ---------------------------------------------------------------------
alter table public.compras               enable row level security;
alter table public.compra_itens          enable row level security;
alter table public.compra_despesas       enable row level security;
alter table public.movimentacoes_estoque enable row level security;

-- COMPRAS: tudo só-gestão. A RPC (DEFINER, owner) contorna a RLS.
drop policy if exists compras_select on public.compras;
create policy compras_select on public.compras for select to authenticated
  using ((select public.meu_papel()) = 'gestao');
drop policy if exists compras_insert on public.compras;
create policy compras_insert on public.compras for insert to authenticated
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists compras_update on public.compras;
create policy compras_update on public.compras for update to authenticated
  using ((select public.meu_papel()) = 'gestao') with check ((select public.meu_papel()) = 'gestao');
drop policy if exists compras_delete on public.compras;
create policy compras_delete on public.compras for delete to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- COMPRA_ITENS: tudo só-gestão
drop policy if exists compra_itens_select on public.compra_itens;
create policy compra_itens_select on public.compra_itens for select to authenticated
  using ((select public.meu_papel()) = 'gestao');
drop policy if exists compra_itens_insert on public.compra_itens;
create policy compra_itens_insert on public.compra_itens for insert to authenticated
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists compra_itens_update on public.compra_itens;
create policy compra_itens_update on public.compra_itens for update to authenticated
  using ((select public.meu_papel()) = 'gestao') with check ((select public.meu_papel()) = 'gestao');
drop policy if exists compra_itens_delete on public.compra_itens;
create policy compra_itens_delete on public.compra_itens for delete to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- COMPRA_DESPESAS: tudo só-gestão
drop policy if exists compra_despesas_select on public.compra_despesas;
create policy compra_despesas_select on public.compra_despesas for select to authenticated
  using ((select public.meu_papel()) = 'gestao');
drop policy if exists compra_despesas_insert on public.compra_despesas;
create policy compra_despesas_insert on public.compra_despesas for insert to authenticated
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists compra_despesas_update on public.compra_despesas;
create policy compra_despesas_update on public.compra_despesas for update to authenticated
  using ((select public.meu_papel()) = 'gestao') with check ((select public.meu_papel()) = 'gestao');
drop policy if exists compra_despesas_delete on public.compra_despesas;
create policy compra_despesas_delete on public.compra_despesas for delete to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- MOVIMENTACOES_ESTOQUE:
--   SELECT só-gestão (custo_unitario não é ocultável => operação lê saldo via produtos)
--   INSERT gestão OU operação (só entrada, sem custo, sem compra; guard reforça)
--   Sem UPDATE/DELETE (ledger imutável; correção via 'ajuste')
drop policy if exists mov_select on public.movimentacoes_estoque;
create policy mov_select on public.movimentacoes_estoque for select to authenticated
  using ((select public.meu_papel()) = 'gestao');
drop policy if exists mov_insert on public.movimentacoes_estoque;
create policy mov_insert on public.movimentacoes_estoque for insert to authenticated
  with check (
    (select public.meu_papel()) = 'gestao'
    or (
      (select public.meu_papel()) = 'operacao'
      and tipo = 'entrada'
      and custo_unitario is null
      and compra_id is null
    )
  );

-- (Fim da migração Fase 3)
