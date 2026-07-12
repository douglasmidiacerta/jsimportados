-- =====================================================================
-- JS Importados — Fase 4 (Vendas / PDV) — MIGRATION FINAL
-- Idempotente. Rodar como owner (postgres), igual às fases anteriores.
-- Depende de: public.meu_papel(), public.tocar_atualizado_em(),
--   public.produtos, public.produtos_custo, public.clientes,
--   public.movimentacoes_estoque (+ trigger movimentacoes_guard / aplicar_movimentacao da Fase 3).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TAXAS_CARTAO (config MDR) — SO-GESTAO. Faixa = (modalidade, parcelas).
-- ---------------------------------------------------------------------
create table if not exists public.taxas_cartao (
  modalidade    text not null check (modalidade in ('debito','credito')),
  parcelas      int  not null check (parcelas between 1 and 18),
  percentual    numeric(6,4) not null default 0,   -- MDR % (ex.: 3.1900 = 3,19%)
  prazo_dias    int  not null default 30,           -- D+N ate a 1a parcela liquidar
  ativo         boolean not null default true,
  atualizado_em timestamptz not null default now(),
  primary key (modalidade, parcelas),
  constraint taxas_cartao_pct_ok    check (percentual >= 0 and percentual < 100),
  constraint taxas_cartao_prazo_nn  check (prazo_dias >= 0),
  constraint taxas_cartao_debito_1x check (modalidade <> 'debito' or parcelas = 1)
);
drop trigger if exists trg_taxas_cartao_touch on public.taxas_cartao;
create trigger trg_taxas_cartao_touch before update on public.taxas_cartao
  for each row execute function public.tocar_atualizado_em();

-- seed idempotente (placeholders; a gestao ajusta). debito D+1; credito D+30.
insert into public.taxas_cartao (modalidade, parcelas, percentual, prazo_dias, ativo)
values ('debito', 1, 1.9900, 1, true)
on conflict (modalidade, parcelas) do nothing;
insert into public.taxas_cartao (modalidade, parcelas, percentual, prazo_dias, ativo)
select 'credito', p, round((3.1900 + (p - 1) * 0.3500)::numeric, 4), 30, true
from generate_series(1, 18) as p
on conflict (modalidade, parcelas) do nothing;

-- ---------------------------------------------------------------------
-- 2) VENDAS (cabecalho) — RECEITA. Operacao le a PROPRIA; SEM custo.
-- ---------------------------------------------------------------------
create table if not exists public.vendas (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid references public.clientes(id) on delete set null,
  forma_pagamento   text not null check (forma_pagamento in ('dinheiro','pix','cartao','fiado')),
  data_venda        date not null default current_date,
  subtotal          numeric(14,2) not null default 0,   -- servidor
  desconto          numeric(14,2) not null default 0,   -- input do vendedor
  juros             numeric(14,2) not null default 0,   -- input do vendedor (fiado)
  total             numeric(14,2) not null default 0,   -- subtotal - desconto + juros (servidor)
  cartao_modalidade text check (cartao_modalidade in ('debito','credito')),
  cartao_parcelas   int  check (cartao_parcelas between 1 and 18),
  fiado_vencimento  date,
  status            text not null default 'liquidado'
                      check (status in ('liquidado','a_receber')),
  observacoes       text,
  criado_por        uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  constraint vendas_desconto_nn check (desconto >= 0),
  constraint vendas_juros_nn    check (juros >= 0),
  constraint vendas_total_nn    check (total >= 0)
);
create index if not exists vendas_data_idx       on public.vendas (data_venda desc, criado_em desc);
create index if not exists vendas_criado_por_idx on public.vendas (criado_por, criado_em desc);
create index if not exists vendas_cliente_idx    on public.vendas (cliente_id);
drop trigger if exists trg_vendas_touch on public.vendas;
create trigger trg_vendas_touch before update on public.vendas
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- 3) VENDA_ITENS — RECEITA por linha. SEM custo.
-- ---------------------------------------------------------------------
create table if not exists public.venda_itens (
  id             uuid primary key default gen_random_uuid(),
  venda_id       uuid not null references public.vendas(id) on delete cascade,
  produto_id     uuid not null references public.produtos(id) on delete restrict,
  posicao        int  not null default 0,
  quantidade     numeric(14,3) not null,
  preco_unitario numeric(12,2) not null,               -- input (fallback preco_venda)
  subtotal       numeric(14,2) not null default 0,     -- round(qtd*preco,2) (servidor)
  constraint venda_itens_qtd_pos  check (quantidade > 0),
  constraint venda_itens_preco_nn check (preco_unitario >= 0)
);
create index if not exists venda_itens_venda_idx   on public.venda_itens (venda_id);
create index if not exists venda_itens_produto_idx on public.venda_itens (produto_id);

-- ---------------------------------------------------------------------
-- 4) VENDA_ITENS_CUSTO — COGS por linha (1:1) — SO-GESTAO.
-- ---------------------------------------------------------------------
create table if not exists public.venda_itens_custo (
  venda_item_id  uuid primary key references public.venda_itens(id) on delete cascade,
  custo_unitario numeric(14,4),                          -- snapshot; NULL se produto sem custo
  custo_total    numeric(16,4),
  constraint venda_itens_custo_nn check (custo_unitario is null or custo_unitario >= 0)
);

-- ---------------------------------------------------------------------
-- 5) VENDAS_CUSTO — COGS agregado (1:1) — SO-GESTAO (DRE/margem rapida).
-- ---------------------------------------------------------------------
create table if not exists public.vendas_custo (
  venda_id       uuid primary key references public.vendas(id) on delete cascade,
  custo_total    numeric(16,4) not null default 0,
  custo_completo boolean       not null default true,   -- false => algum item sem custo (margem superestimada)
  lucro_bruto    numeric(16,4) not null default 0       -- (subtotal - desconto) - custo_total
);

-- ---------------------------------------------------------------------
-- 6) CONTAS_RECEBER — criada pela venda; gerida na Fase 6 — SO-GESTAO.
-- ---------------------------------------------------------------------
create table if not exists public.contas_receber (
  id              uuid primary key default gen_random_uuid(),
  venda_id        uuid not null references public.vendas(id) on delete cascade,
  cliente_id      uuid references public.clientes(id) on delete set null,
  tipo            text not null check (tipo in ('cartao','fiado')),
  parcela_num     int  not null default 1,
  parcela_total   int  not null default 1,
  valor_bruto     numeric(14,2) not null,                -- o que o cliente paga
  valor_taxa      numeric(14,2) not null default 0,      -- MDR da parcela (cartao)
  valor_liquido   numeric(14,2) not null,                -- bruto - taxa (fiado = bruto)
  taxa_percentual numeric(6,4),                           -- MDR aplicado (cartao)
  vencimento      date not null,
  status          text not null default 'aberto'
                    check (status in ('aberto','liquidado','cancelado')),
  liquidado_em    date,
  criado_em       timestamptz not null default now(),
  constraint cr_valores_nn check (valor_bruto >= 0 and valor_liquido >= 0),
  constraint cr_parcela_ok check (parcela_num >= 1 and parcela_num <= parcela_total)
);
create index if not exists cr_venda_idx   on public.contas_receber (venda_id);
create index if not exists cr_status_venc on public.contas_receber (status, vencimento);
create index if not exists cr_cliente_idx on public.contas_receber (cliente_id);

-- ---------------------------------------------------------------------
-- 7) GUARD (create or replace) — libera a 'saida' inserida pela RPC de venda
--    via GUC transaction-local. Só substitui a FUNCAO (o trigger trg_mov_guard
--    da Fase 3 continua apontando para ela) — sem janela sem guard.
-- ---------------------------------------------------------------------
create or replace function public.movimentacoes_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- insercao controlada pela RPC registrar_venda (owner ja validou tudo)
  if coalesce(current_setting('jsimportados.rpc_venda', true), '') = 'on' then
    return new;
  end if;

  if (select public.meu_papel()) is distinct from 'gestao' then
    new.custo_unitario := null;          -- operacao NUNCA define custo
    new.compra_id      := null;          -- operacao nao vincula compra
    new.origem         := 'entrada_balcao';
    if new.tipo is distinct from 'entrada' then
      raise exception 'A operacao so pode registrar entradas de mercadoria.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 8) RPC ATOMICA — registrar_venda(p_payload jsonb) => venda_id
--    SECURITY DEFINER; recomputa tudo (exceto desconto/juros/preco/parcelas).
--    ESTOQUE NEGATIVO: PERMITIDO (a venda fisica ja ocorreu).
-- ---------------------------------------------------------------------
create or replace function public.registrar_venda(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel       text;
  v_venda       uuid;
  v_forma       text;
  v_cliente     uuid;
  v_data        date := current_date;
  v_obs         text;
  v_itens       jsonb;
  v_n_in        int;
  v_n_ok        int;
  v_subtotal    numeric(14,2);
  v_desconto    numeric(14,2);
  v_juros       numeric(14,2);
  v_total       numeric(14,2);
  v_status      text := 'liquidado';
  -- cartao
  v_modal       text;
  v_parcelas    int;
  v_rate        numeric(6,4);
  v_prazo       int;
  v_cents       bigint;
  v_base        bigint;
  v_resto       int;
  -- fiado
  v_prazo_fiado int;
  v_venc_fiado  date;
  -- cogs
  v_cogs_total  numeric(16,4);
  v_cogs_ok     boolean;
begin
  -- 8.1 authz (decide pelo JWT do chamador, mesmo sob DEFINER)
  v_papel := (select public.meu_papel());
  if v_papel not in ('operacao','gestao') then
    raise exception 'Sem permissao para registrar vendas.' using errcode = '42501';
  end if;

  -- 8.2 cabecalho + validacoes
  v_forma := lower(coalesce(p_payload->>'forma_pagamento',''));
  if v_forma not in ('dinheiro','pix','cartao','fiado') then
    raise exception 'Forma de pagamento invalida: %', v_forma using errcode = '22023';
  end if;
  v_cliente := nullif(p_payload->>'cliente_id','')::uuid;
  v_obs     := nullif(btrim(coalesce(p_payload->>'observacoes','')),'');
  v_itens   := coalesce(p_payload->'itens', '[]'::jsonb);
  if jsonb_typeof(v_itens) <> 'array' or jsonb_array_length(v_itens) = 0 then
    raise exception 'A venda precisa de pelo menos um produto.' using errcode = '22023';
  end if;
  if v_forma = 'fiado' and v_cliente is null then
    raise exception 'A venda fiado exige um cliente.' using errcode = '22023';
  end if;

  insert into public.vendas (cliente_id, forma_pagamento, data_venda, observacoes, criado_por)
  values (v_cliente, v_forma, v_data, v_obs, auth.uid())
  returning id into v_venda;

  -- 8.3 itens (receita) — preco input do vendedor (fallback preco_venda), clamp >=0
  insert into public.venda_itens
    (venda_id, produto_id, posicao, quantidade, preco_unitario, subtotal)
  select
    v_venda,
    p.id,
    t.ord::int,
    (t.item->>'quantidade')::numeric,
    greatest(coalesce(nullif(t.item->>'preco_unitario','')::numeric, p.preco_venda), 0),
    round((t.item->>'quantidade')::numeric
          * greatest(coalesce(nullif(t.item->>'preco_unitario','')::numeric, p.preco_venda), 0), 2)
  from jsonb_array_elements(v_itens) with ordinality as t(item, ord)
  join public.produtos p on p.id = (t.item->>'produto_id')::uuid;

  v_n_in := jsonb_array_length(v_itens);
  select count(*) into v_n_ok from public.venda_itens where venda_id = v_venda;
  if v_n_ok <> v_n_in then
    raise exception 'Algum produto do carrinho nao existe mais.' using errcode = '22023';
  end if;

  -- 8.4 snapshot COGS por linha (SO-GESTAO; custo pode ser NULL)
  insert into public.venda_itens_custo (venda_item_id, custo_unitario, custo_total)
  select vi.id, pc.custo,
         case when pc.custo is null then null else round(vi.quantidade * pc.custo, 4) end
  from public.venda_itens vi
  left join public.produtos_custo pc on pc.produto_id = vi.produto_id
  where vi.venda_id = v_venda;

  -- 8.5 baixa de estoque (saida) — GUC libera o guard; trigger AFTER reduz saldo.
  perform set_config('jsimportados.rpc_venda', 'on', true);
  insert into public.movimentacoes_estoque
    (produto_id, tipo, quantidade, custo_unitario, origem, observacoes)
  select vi.produto_id, 'saida', - vi.quantidade, vic.custo_unitario, 'venda',
         'Venda ' || v_venda::text
  from public.venda_itens vi
  join public.venda_itens_custo vic on vic.venda_item_id = vi.id
  where vi.venda_id = v_venda
  order by vi.posicao;
  perform set_config('jsimportados.rpc_venda', 'off', true);

  -- 8.6 totais (servidor; desconto/juros sao inputs do vendedor)
  select coalesce(sum(subtotal), 0) into v_subtotal
    from public.venda_itens where venda_id = v_venda;
  v_desconto := least(greatest(round(coalesce((p_payload->>'desconto')::numeric, 0), 2), 0), v_subtotal);
  if v_forma = 'fiado' then
    v_juros := greatest(round(coalesce((p_payload#>>'{fiado,juros}')::numeric, 0), 2), 0);
  else
    v_juros := 0;
  end if;
  v_total := round(v_subtotal - v_desconto + v_juros, 2);

  -- 8.7 pagamento
  if v_forma = 'cartao' then
    v_status := 'a_receber';
    v_modal := lower(coalesce(p_payload#>>'{cartao,modalidade}', 'credito'));
    if v_modal not in ('debito','credito') then
      raise exception 'Modalidade de cartao invalida.' using errcode = '22023';
    end if;
    v_parcelas := coalesce((p_payload#>>'{cartao,parcelas}')::int, 1);
    if v_modal = 'debito' then v_parcelas := 1; end if;
    if v_parcelas < 1 or v_parcelas > 18 then
      raise exception 'Parcelas fora do intervalo (1..18).' using errcode = '22023';
    end if;

    select percentual, prazo_dias into v_rate, v_prazo
      from public.taxas_cartao
     where modalidade = v_modal and parcelas = v_parcelas and ativo;
    if not found then
      raise exception 'Taxa de cartao nao configurada para % %x.', v_modal, v_parcelas
        using errcode = '22023';
    end if;

    -- split maior-resto do BRUTO: as v_resto primeiras parcelas +1 centavo (Sigma = total)
    v_cents := round(v_total * 100)::bigint;
    v_base  := v_cents / v_parcelas;
    v_resto := (v_cents % v_parcelas)::int;

    insert into public.contas_receber
      (venda_id, cliente_id, tipo, parcela_num, parcela_total,
       valor_bruto, valor_taxa, valor_liquido, taxa_percentual, vencimento, status)
    select
      v_venda, v_cliente, 'cartao', g, v_parcelas,
      br.bruto,
      round(br.bruto * v_rate / 100, 2),
      br.bruto - round(br.bruto * v_rate / 100, 2),
      v_rate,
      (v_data + make_interval(days => v_prazo) + make_interval(months => (g - 1)))::date,
      'aberto'
    from generate_series(1, v_parcelas) as g
    cross join lateral (
      select ((v_base + case when g <= v_resto then 1 else 0 end)::numeric / 100) as bruto
    ) br;

    update public.vendas
       set cartao_modalidade = v_modal, cartao_parcelas = v_parcelas
     where id = v_venda;

  elsif v_forma = 'fiado' then
    v_status := 'a_receber';
    v_prazo_fiado := greatest(coalesce((p_payload#>>'{fiado,prazo_dias}')::int, 30), 0);
    v_venc_fiado  := coalesce(
      nullif(btrim(coalesce(p_payload#>>'{fiado,vencimento}','')), '')::date,
      (v_data + make_interval(days => v_prazo_fiado))::date);
    insert into public.contas_receber
      (venda_id, cliente_id, tipo, parcela_num, parcela_total,
       valor_bruto, valor_taxa, valor_liquido, taxa_percentual, vencimento, status)
    values (v_venda, v_cliente, 'fiado', 1, 1, v_total, 0, v_total, null, v_venc_fiado, 'aberto');
    update public.vendas set fiado_vencimento = v_venc_fiado where id = v_venda;
  end if;
  -- dinheiro/pix: sem conta a receber; status permanece 'liquidado'

  -- 8.8 fecha o cabecalho
  update public.vendas
     set subtotal = v_subtotal,
         desconto = v_desconto,
         juros    = v_juros,
         total    = v_total,
         status   = v_status
   where id = v_venda;

  -- 8.9 COGS agregado (SO-GESTAO). Juros e MDR sao financeiros (Fase 6), fora do lucro bruto.
  select coalesce(sum(coalesce(vic.custo_total, 0)), 0),
         coalesce(bool_and(vic.custo_unitario is not null), true)
    into v_cogs_total, v_cogs_ok
  from public.venda_itens_custo vic
  join public.venda_itens vi on vi.id = vic.venda_item_id
  where vi.venda_id = v_venda;

  insert into public.vendas_custo (venda_id, custo_total, custo_completo, lucro_bruto)
  values (v_venda, round(v_cogs_total, 4), v_cogs_ok,
          round((v_subtotal - v_desconto) - v_cogs_total, 4));

  return v_venda;
end;
$$;
grant execute on function public.registrar_venda(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 9) RLS — blindagem de COGS/margem/taxa (row-level; custo isolado gestao-only)
-- ---------------------------------------------------------------------
alter table public.taxas_cartao      enable row level security;
alter table public.vendas            enable row level security;
alter table public.venda_itens       enable row level security;
alter table public.venda_itens_custo enable row level security;
alter table public.vendas_custo      enable row level security;
alter table public.contas_receber    enable row level security;

-- TAXAS_CARTAO: SELECT + escrita SO-GESTAO (a RPC, owner, le via bypass de RLS).
drop policy if exists taxas_cartao_all on public.taxas_cartao;
create policy taxas_cartao_all on public.taxas_cartao for all to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');

-- VENDAS: gestao ve tudo; operacao ve as PROPRIAS (sem custo). Escrita so via RPC (owner).
drop policy if exists vendas_select on public.vendas;
create policy vendas_select on public.vendas for select to authenticated
  using ((select public.meu_papel()) = 'gestao' or criado_por = auth.uid());

-- VENDA_ITENS: mesma visibilidade da venda-mae (receita, sem custo).
drop policy if exists venda_itens_select on public.venda_itens;
create policy venda_itens_select on public.venda_itens for select to authenticated
  using (exists (
    select 1 from public.vendas v
     where v.id = venda_itens.venda_id
       and ((select public.meu_papel()) = 'gestao' or v.criado_por = auth.uid())
  ));

-- VENDA_ITENS_CUSTO / VENDAS_CUSTO: COGS => SELECT SO-GESTAO. Escrita so RPC (owner).
drop policy if exists venda_itens_custo_select on public.venda_itens_custo;
create policy venda_itens_custo_select on public.venda_itens_custo for select to authenticated
  using ((select public.meu_papel()) = 'gestao');

drop policy if exists vendas_custo_select on public.vendas_custo;
create policy vendas_custo_select on public.vendas_custo for select to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- CONTAS_RECEBER: financeiro => SELECT SO-GESTAO; UPDATE gestao (baixa na Fase 6).
drop policy if exists contas_receber_select on public.contas_receber;
create policy contas_receber_select on public.contas_receber for select to authenticated
  using ((select public.meu_papel()) = 'gestao');
drop policy if exists contas_receber_update on public.contas_receber;
create policy contas_receber_update on public.contas_receber for update to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');

-- (Fim da migracao Fase 4)
