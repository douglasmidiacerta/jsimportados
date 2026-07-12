-- =====================================================================
-- JS Importados — Fase 5 (Caixa / Fluxo de Caixa) — MIGRATION FINAL
-- Idempotente. Rodar como owner (postgres), igual às fases anteriores.
-- Depende de: public.meu_papel(), public.tocar_atualizado_em(), public.vendas,
--   public.registrar_venda(jsonb) e demais objetos da Fase 4.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CAIXA_SESSOES — a gaveta. No MAXIMO uma 'aberto' por vez.
--    valor_abertura e a SEMENTE do esperado e NAO vira movimento.
-- ---------------------------------------------------------------------
create table if not exists public.caixa_sessoes (
  id                     uuid primary key default gen_random_uuid(),
  status                 text not null default 'aberto'
                           check (status in ('aberto','fechado')),
  valor_abertura         numeric(14,2) not null default 0,
  observacoes_abertura   text,
  aberto_por             uuid references auth.users(id) on delete set null default auth.uid(),
  aberto_em              timestamptz not null default now(),
  valor_contado          numeric(14,2),
  esperado_dinheiro      numeric(14,2),
  diferenca              numeric(14,2),
  observacoes_fechamento text,
  fechado_por            uuid references auth.users(id) on delete set null,
  fechado_em             timestamptz,
  atualizado_em          timestamptz not null default now(),
  constraint caixa_abertura_nn check (valor_abertura >= 0)
);
create unique index if not exists caixa_uma_aberta
  on public.caixa_sessoes (status) where status = 'aberto';
create index if not exists caixa_sessoes_status_idx
  on public.caixa_sessoes (status, aberto_em desc);
create index if not exists caixa_sessoes_aberto_idx
  on public.caixa_sessoes (aberto_por, aberto_em desc);
drop trigger if exists trg_caixa_sessoes_touch on public.caixa_sessoes;
create trigger trg_caixa_sessoes_touch before update on public.caixa_sessoes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- 2) CAIXA_MOVIMENTOS — livro-razao (fonte da verdade do saldo).
--    valor ASSINADO: venda/suprimento > 0 ; sangria < 0 ; ajuste <> 0.
-- ---------------------------------------------------------------------
create table if not exists public.caixa_movimentos (
  id          uuid primary key default gen_random_uuid(),
  sessao_id   uuid not null references public.caixa_sessoes(id) on delete cascade,
  tipo        text not null check (tipo in ('venda','sangria','suprimento','ajuste')),
  meio        text not null default 'dinheiro' check (meio in ('dinheiro','pix')),
  valor       numeric(14,2) not null,
  venda_id    uuid references public.vendas(id) on delete set null,
  observacoes text,
  criado_por  uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em   timestamptz not null default now(),
  constraint cm_pix_so_venda check (meio = 'dinheiro' or tipo = 'venda'),
  constraint cm_sinal check (
       (tipo = 'venda'      and valor > 0)
    or (tipo = 'suprimento' and valor > 0)
    or (tipo = 'sangria'    and valor < 0)
    or (tipo = 'ajuste'     and valor <> 0)
  )
);
create index if not exists caixa_mov_sessao_idx on public.caixa_movimentos (sessao_id, criado_em);
create index if not exists caixa_mov_venda_idx  on public.caixa_movimentos (venda_id);
create unique index if not exists caixa_mov_venda_uniq
  on public.caixa_movimentos (venda_id) where venda_id is not null;

-- ---------------------------------------------------------------------
-- 3) VENDAS — vinculo a sessao (para resumo do dia; inclui cartao/fiado).
-- ---------------------------------------------------------------------
alter table public.vendas
  add column if not exists caixa_sessao_id uuid references public.caixa_sessoes(id) on delete set null;
create index if not exists vendas_caixa_sessao_idx on public.vendas (caixa_sessao_id);

-- ---------------------------------------------------------------------
-- 4) VIEW DE RESUMO — saldo derivado por soma dos movimentos.
--    security_invoker => a RLS das tabelas base vale para o chamador.
-- ---------------------------------------------------------------------
create or replace view public.vw_caixa_resumo
  with (security_invoker = true) as
select
  s.id, s.status, s.valor_abertura, s.valor_contado, s.esperado_dinheiro, s.diferenca,
  s.observacoes_abertura, s.observacoes_fechamento,
  s.aberto_por, s.aberto_em, s.fechado_por, s.fechado_em, s.atualizado_em,
  coalesce(m.vendas_dinheiro, 0)                                   as vendas_dinheiro,
  coalesce(m.vendas_pix, 0)                                        as vendas_pix,
  coalesce(m.suprimentos, 0)                                       as suprimentos,
  coalesce(m.sangrias, 0)                                          as sangrias,
  coalesce(m.ajustes, 0)                                           as ajustes,
  coalesce(m.n_mov, 0)                                             as n_movimentos,
  coalesce(s.esperado_dinheiro,
           round(s.valor_abertura + coalesce(m.dinheiro_liq, 0), 2))
                                                                   as esperado_dinheiro_atual
from public.caixa_sessoes s
left join lateral (
  select
    sum(mv.valor) filter (where mv.meio = 'dinheiro')                        as dinheiro_liq,
    sum(mv.valor) filter (where mv.tipo = 'venda' and mv.meio = 'dinheiro')  as vendas_dinheiro,
    sum(mv.valor) filter (where mv.tipo = 'venda' and mv.meio = 'pix')       as vendas_pix,
    sum(mv.valor) filter (where mv.tipo = 'suprimento')                      as suprimentos,
    sum(mv.valor) filter (where mv.tipo = 'sangria')                         as sangrias,
    sum(mv.valor) filter (where mv.tipo = 'ajuste')                          as ajustes,
    count(*)                                                                 as n_mov
  from public.caixa_movimentos mv
  where mv.sessao_id = s.id
) m on true;
grant select on public.vw_caixa_resumo to authenticated;

-- ---------------------------------------------------------------------
-- 5) RPC abrir_caixa — impoe "uma aberta"; papel operacao/gestao.
-- ---------------------------------------------------------------------
create or replace function public.abrir_caixa(p_valor numeric default 0, p_obs text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel text;
  v_id    uuid;
begin
  v_papel := (select public.meu_papel());
  if v_papel not in ('operacao','gestao') then
    raise exception 'Sem permissao para abrir o caixa.' using errcode = '42501';
  end if;
  if exists (select 1 from public.caixa_sessoes where status = 'aberto') then
    raise exception 'Ja existe um caixa aberto. Feche o atual antes de abrir outro.'
      using errcode = '22023';
  end if;
  insert into public.caixa_sessoes (status, valor_abertura, observacoes_abertura, aberto_por)
  values ('aberto',
          greatest(round(coalesce(p_valor, 0), 2), 0),
          nullif(btrim(coalesce(p_obs, '')), ''),
          auth.uid())
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'Ja existe um caixa aberto. Feche o atual antes de abrir outro.'
      using errcode = '22023';
end;
$$;
grant execute on function public.abrir_caixa(numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6) RPC movimentar_caixa — sangria/suprimento/ajuste (gaveta = dinheiro).
-- ---------------------------------------------------------------------
create or replace function public.movimentar_caixa(p_tipo text, p_valor numeric, p_obs text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel  text;
  v_tipo   text;
  v_sessao uuid;
  v_val    numeric(14,2);
  v_id     uuid;
begin
  v_papel := (select public.meu_papel());
  if v_papel not in ('operacao','gestao') then
    raise exception 'Sem permissao para movimentar o caixa.' using errcode = '42501';
  end if;
  v_tipo := lower(coalesce(p_tipo, ''));
  if v_tipo not in ('sangria','suprimento','ajuste') then
    raise exception 'Tipo de movimento invalido: %', v_tipo using errcode = '22023';
  end if;
  select id into v_sessao from public.caixa_sessoes where status = 'aberto' limit 1;
  if v_sessao is null then
    raise exception 'Abra o caixa antes de registrar sangria ou suprimento.'
      using errcode = '22023';
  end if;
  if v_tipo = 'suprimento' then
    v_val := round(abs(coalesce(p_valor, 0)), 2);
    if v_val <= 0 then
      raise exception 'Informe um valor maior que zero.' using errcode = '22023';
    end if;
  elsif v_tipo = 'sangria' then
    v_val := - round(abs(coalesce(p_valor, 0)), 2);
    if v_val = 0 then
      raise exception 'Informe um valor maior que zero.' using errcode = '22023';
    end if;
  else
    v_val := round(coalesce(p_valor, 0), 2);
    if v_val = 0 then
      raise exception 'Informe um valor diferente de zero.' using errcode = '22023';
    end if;
  end if;
  insert into public.caixa_movimentos (sessao_id, tipo, meio, valor, observacoes)
  values (v_sessao, v_tipo, 'dinheiro', v_val, nullif(btrim(coalesce(p_obs, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.movimentar_caixa(text, numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7) RPC fechar_caixa — esperado por SOMA dos movimentos; retorna jsonb.
-- ---------------------------------------------------------------------
create or replace function public.fechar_caixa(p_contado numeric, p_obs text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel    text;
  v_sessao   uuid;
  v_abertura numeric(14,2);
  v_din      numeric(14,2);
  v_pix      numeric(14,2);
  v_sup      numeric(14,2);
  v_san      numeric(14,2);
  v_aju      numeric(14,2);
  v_cartao   numeric(14,2);
  v_fiado    numeric(14,2);
  v_esperado numeric(14,2);
  v_contado  numeric(14,2);
  v_dif      numeric(14,2);
begin
  v_papel := (select public.meu_papel());
  if v_papel not in ('operacao','gestao') then
    raise exception 'Sem permissao para fechar o caixa.' using errcode = '42501';
  end if;
  select id, valor_abertura into v_sessao, v_abertura
    from public.caixa_sessoes where status = 'aberto' limit 1;
  if v_sessao is null then
    raise exception 'Nao ha caixa aberto para fechar.' using errcode = '22023';
  end if;
  select
    coalesce(sum(valor) filter (where tipo = 'venda' and meio = 'dinheiro'), 0),
    coalesce(sum(valor) filter (where tipo = 'venda' and meio = 'pix'), 0),
    coalesce(sum(valor) filter (where tipo = 'suprimento'), 0),
    coalesce(sum(valor) filter (where tipo = 'sangria'), 0),
    coalesce(sum(valor) filter (where tipo = 'ajuste'), 0)
  into v_din, v_pix, v_sup, v_san, v_aju
  from public.caixa_movimentos
  where sessao_id = v_sessao;
  select
    coalesce(sum(total) filter (where forma_pagamento = 'cartao'), 0),
    coalesce(sum(total) filter (where forma_pagamento = 'fiado'), 0)
  into v_cartao, v_fiado
  from public.vendas
  where caixa_sessao_id = v_sessao;
  v_esperado := round(v_abertura + v_din + v_sup + v_san + v_aju, 2);
  v_contado  := round(coalesce(p_contado, 0), 2);
  v_dif      := round(v_contado - v_esperado, 2);
  update public.caixa_sessoes
     set status                 = 'fechado',
         valor_contado          = v_contado,
         esperado_dinheiro      = v_esperado,
         diferenca              = v_dif,
         observacoes_fechamento = nullif(btrim(coalesce(p_obs, '')), ''),
         fechado_por            = auth.uid(),
         fechado_em             = now()
   where id = v_sessao;
  return jsonb_build_object(
    'sessao_id',       v_sessao,
    'esperado',        v_esperado,
    'contado',         v_contado,
    'diferenca',       v_dif,
    'vendas_dinheiro', v_din,
    'vendas_pix',      v_pix,
    'suprimentos',     v_sup,
    'sangrias',        v_san,
    'ajustes',         v_aju,
    'cartao',          v_cartao,
    'fiado',           v_fiado
  );
end;
$$;
grant execute on function public.fechar_caixa(numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8) RLS — caixa e RECEITA (sem custo): legivel pela operacao E gestao.
--    Escrita SO via RPC (owner bypassa RLS). Sem policies de write.
-- ---------------------------------------------------------------------
alter table public.caixa_sessoes    enable row level security;
alter table public.caixa_movimentos enable row level security;

drop policy if exists caixa_sessoes_select on public.caixa_sessoes;
create policy caixa_sessoes_select on public.caixa_sessoes for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));

drop policy if exists caixa_movimentos_select on public.caixa_movimentos;
create policy caixa_movimentos_select on public.caixa_movimentos for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));

-- ---------------------------------------------------------------------
-- 9) registrar_venda — SUBSTITUIDA (create or replace) para integrar ao caixa.
--    Corpo da Fase 4 REPRODUZIDO + adicoes [FASE 5]: v_sessao, vinculo e movimento.
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
  v_modal       text;
  v_parcelas    int;
  v_rate        numeric(6,4);
  v_prazo       int;
  v_cents       bigint;
  v_base        bigint;
  v_resto       int;
  v_prazo_fiado int;
  v_venc_fiado  date;
  v_cogs_total  numeric(16,4);
  v_cogs_ok     boolean;
  v_sessao      uuid;  -- [FASE 5]
begin
  v_papel := (select public.meu_papel());
  if v_papel not in ('operacao','gestao') then
    raise exception 'Sem permissao para registrar vendas.' using errcode = '42501';
  end if;

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

  -- [FASE 5] sessao de caixa aberta (se houver). Vender NAO exige caixa aberto.
  select id into v_sessao from public.caixa_sessoes where status = 'aberto' limit 1;

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

  insert into public.venda_itens_custo (venda_item_id, custo_unitario, custo_total)
  select vi.id, pc.custo,
         case when pc.custo is null then null else round(vi.quantidade * pc.custo, 4) end
  from public.venda_itens vi
  left join public.produtos_custo pc on pc.produto_id = vi.produto_id
  where vi.venda_id = v_venda;

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

  select coalesce(sum(subtotal), 0) into v_subtotal
    from public.venda_itens where venda_id = v_venda;
  v_desconto := least(greatest(round(coalesce((p_payload->>'desconto')::numeric, 0), 2), 0), v_subtotal);
  if v_forma = 'fiado' then
    v_juros := greatest(round(coalesce((p_payload#>>'{fiado,juros}')::numeric, 0), 2), 0);
  else
    v_juros := 0;
  end if;
  v_total := round(v_subtotal - v_desconto + v_juros, 2);

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

  update public.vendas
     set subtotal        = v_subtotal,
         desconto        = v_desconto,
         juros           = v_juros,
         total           = v_total,
         status          = v_status,
         caixa_sessao_id = v_sessao   -- [FASE 5]
   where id = v_venda;

  select coalesce(sum(coalesce(vic.custo_total, 0)), 0),
         coalesce(bool_and(vic.custo_unitario is not null), true)
    into v_cogs_total, v_cogs_ok
  from public.venda_itens_custo vic
  join public.venda_itens vi on vi.id = vic.venda_item_id
  where vi.venda_id = v_venda;

  insert into public.vendas_custo (venda_id, custo_total, custo_completo, lucro_bruto)
  values (v_venda, round(v_cogs_total, 4), v_cogs_ok,
          round((v_subtotal - v_desconto) - v_cogs_total, 4));

  -- 8.10 [FASE 5] INTEGRACAO VENDA->CAIXA. So dinheiro/pix, com caixa aberto, total>0.
  if v_sessao is not null and v_forma in ('dinheiro','pix') and v_total > 0 then
    insert into public.caixa_movimentos (sessao_id, venda_id, tipo, meio, valor, observacoes)
    values (v_sessao, v_venda, 'venda', v_forma, v_total, 'Venda ' || v_venda::text);
  end if;

  return v_venda;
end;
$$;
grant execute on function public.registrar_venda(jsonb) to authenticated;

-- (Fim da migracao Fase 5)
