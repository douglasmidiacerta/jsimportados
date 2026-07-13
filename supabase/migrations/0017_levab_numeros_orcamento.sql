-- =====================================================================
-- 0017 — LEVA B: números de documento amigáveis + ORÇAMENTO (vira venda)
-- F8 (regras-erp): documentos ganham número curto p/ rastreio por telefone:
--   vendas V-000123 · compras C-000045 · orçamentos O-000012.
-- A formatação (prefixo + zero-padding) é no app; aqui só o inteiro sequencial.
-- Orçamento é uma PROPOSTA (sem estoque/caixa/COGS); "converter" chama
-- registrar_venda com os itens — e aí sim entram as travas de venda (caixa etc.).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) NÚMERO em VENDAS — backfill em ordem de criação, sequência a partir daí.
-- ---------------------------------------------------------------------
alter table public.vendas add column if not exists numero bigint;
create sequence if not exists public.venda_numero_seq;
do $$
begin
  if exists (select 1 from public.vendas where numero is null) then
    with ord as (select id, row_number() over (order by criado_em, id) rn from public.vendas)
    update public.vendas v set numero = ord.rn from ord where ord.id = v.id and v.numero is null;
  end if;
end $$;
select setval('public.venda_numero_seq', coalesce((select max(numero) from public.vendas), 0), true);
alter table public.vendas alter column numero set default nextval('public.venda_numero_seq');
alter table public.vendas alter column numero set not null;
create unique index if not exists vendas_numero_uq on public.vendas (numero);

-- ---------------------------------------------------------------------
-- 2) NÚMERO em COMPRAS — idem.
-- ---------------------------------------------------------------------
alter table public.compras add column if not exists numero bigint;
create sequence if not exists public.compra_numero_seq;
do $$
begin
  if exists (select 1 from public.compras where numero is null) then
    with ord as (select id, row_number() over (order by criado_em, id) rn from public.compras)
    update public.compras c set numero = ord.rn from ord where ord.id = c.id and c.numero is null;
  end if;
end $$;
select setval('public.compra_numero_seq', coalesce((select max(numero) from public.compras), 0), true);
alter table public.compras alter column numero set default nextval('public.compra_numero_seq');
alter table public.compras alter column numero set not null;
create unique index if not exists compras_numero_uq on public.compras (numero);

-- ---------------------------------------------------------------------
-- 3) ORÇAMENTOS — proposta comercial. Sem efeito em estoque/caixa/financeiro.
-- ---------------------------------------------------------------------
create sequence if not exists public.orcamento_numero_seq;
create table if not exists public.orcamentos (
  id             uuid primary key default gen_random_uuid(),
  numero         bigint not null default nextval('public.orcamento_numero_seq'),
  cliente_id     uuid references public.clientes(id) on delete set null,
  lista_preco_id uuid references public.listas_preco(id) on delete set null,
  observacoes    text,
  validade       date,
  status         text not null default 'aberto' check (status in ('aberto','convertido','cancelado')),
  venda_id       uuid references public.vendas(id) on delete set null,   -- quando convertido
  cancelado_motivo text,
  subtotal       numeric(14,2) not null default 0,
  desconto       numeric(14,2) not null default 0,
  total          numeric(14,2) not null default 0,
  criado_por     uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint orc_desconto_nn check (desconto >= 0),
  constraint orc_total_nn    check (total >= 0)
);
create unique index if not exists orcamentos_numero_uq on public.orcamentos (numero);
create index if not exists orcamentos_status_idx on public.orcamentos (status, criado_em desc);
create index if not exists orcamentos_criado_por_idx on public.orcamentos (criado_por, criado_em desc);
create index if not exists orcamentos_cliente_idx on public.orcamentos (cliente_id);
drop trigger if exists trg_orcamentos_touch on public.orcamentos;
create trigger trg_orcamentos_touch before update on public.orcamentos
  for each row execute function public.tocar_atualizado_em();

create table if not exists public.orcamento_itens (
  id             uuid primary key default gen_random_uuid(),
  orcamento_id   uuid not null references public.orcamentos(id) on delete cascade,
  produto_id     uuid not null references public.produtos(id) on delete restrict,
  posicao        int  not null default 0,
  quantidade     numeric(14,3) not null,
  preco_unitario numeric(12,2) not null,
  subtotal       numeric(14,2) not null default 0,
  constraint orc_item_qtd_pos  check (quantidade > 0),
  constraint orc_item_preco_nn check (preco_unitario >= 0)
);
create index if not exists orcamento_itens_orc_idx on public.orcamento_itens (orcamento_id);

-- ---------------------------------------------------------------------
-- 4) RPC registrar_orcamento(payload) => orcamento_id
--    payload: {cliente_id, lista_preco_id, observacoes, validade, desconto,
--              itens:[{produto_id, quantidade, preco_unitario}]}
--    NÃO exige caixa (é proposta). Operação e gestão podem criar.
-- ---------------------------------------------------------------------
create or replace function public.registrar_orcamento(p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_papel   text;
  v_orc     uuid;
  v_cliente uuid;
  v_lista   uuid;
  v_itens   jsonb;
  v_n_in    int;
  v_n_ok    int;
  v_subtotal numeric(14,2);
  v_desconto numeric(14,2);
begin
  v_papel := (select public.meu_papel());
  if v_papel not in ('operacao','gestao') then
    raise exception 'Sem permissao para orcamentos.' using errcode = '42501';
  end if;
  v_itens := coalesce(p_payload->'itens', '[]'::jsonb);
  if jsonb_typeof(v_itens) <> 'array' or jsonb_array_length(v_itens) = 0 then
    raise exception 'O orcamento precisa de pelo menos um produto.' using errcode = '22023';
  end if;
  v_cliente := nullif(p_payload->>'cliente_id','')::uuid;
  v_lista   := nullif(p_payload->>'lista_preco_id','')::uuid;

  insert into public.orcamentos (cliente_id, lista_preco_id, observacoes, validade)
  values (v_cliente, v_lista,
          nullif(btrim(coalesce(p_payload->>'observacoes','')),''),
          nullif(btrim(coalesce(p_payload->>'validade','')),'')::date)
  returning id into v_orc;

  insert into public.orcamento_itens (orcamento_id, produto_id, posicao, quantidade, preco_unitario, subtotal)
  select v_orc, p.id, t.ord::int,
         (t.item->>'quantidade')::numeric,
         greatest(coalesce(nullif(t.item->>'preco_unitario','')::numeric, p.preco_venda), 0),
         round((t.item->>'quantidade')::numeric
               * greatest(coalesce(nullif(t.item->>'preco_unitario','')::numeric, p.preco_venda), 0), 2)
  from jsonb_array_elements(v_itens) with ordinality as t(item, ord)
  join public.produtos p on p.id = (t.item->>'produto_id')::uuid;

  v_n_in := jsonb_array_length(v_itens);
  select count(*) into v_n_ok from public.orcamento_itens where orcamento_id = v_orc;
  if v_n_ok <> v_n_in then
    raise exception 'Algum produto do orcamento nao existe mais.' using errcode = '22023';
  end if;

  select coalesce(sum(subtotal),0) into v_subtotal from public.orcamento_itens where orcamento_id = v_orc;
  v_desconto := least(greatest(round(coalesce((p_payload->>'desconto')::numeric,0),2),0), v_subtotal);
  update public.orcamentos
     set subtotal = v_subtotal, desconto = v_desconto, total = round(v_subtotal - v_desconto, 2)
   where id = v_orc;

  return v_orc;
end; $$;
grant execute on function public.registrar_orcamento(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 5) RPC converter_orcamento(orcamento, pagamento) => venda_id
--    Monta o payload de venda com os itens do orçamento + a forma escolhida
--    e chama registrar_venda (que aplica TODAS as travas de venda: caixa,
--    estoque, COGS, recebíveis…). Marca o orçamento convertido.
--    p_pagamento: {forma_pagamento, cartao:{...}, fiado:{...}}
-- ---------------------------------------------------------------------
create or replace function public.converter_orcamento(p_orcamento uuid, p_pagamento jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_papel   text;
  v_status  text;
  v_cliente uuid;
  v_desc    numeric(14,2);
  v_itens   jsonb;
  v_payload jsonb;
  v_venda   uuid;
begin
  v_papel := (select public.meu_papel());
  if v_papel not in ('operacao','gestao') then
    raise exception 'Sem permissao.' using errcode = '42501';
  end if;
  select status, cliente_id, desconto into v_status, v_cliente, v_desc
    from public.orcamentos where id = p_orcamento for update;
  if v_status is null then
    raise exception 'Orcamento nao encontrado.' using errcode = '22023';
  end if;
  if v_status <> 'aberto' then
    raise exception 'So orcamento aberto vira venda (status atual: %).', v_status using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'produto_id', produto_id, 'quantidade', quantidade, 'preco_unitario', preco_unitario)
           order by posicao), '[]'::jsonb)
    into v_itens
  from public.orcamento_itens where orcamento_id = p_orcamento;

  v_payload := jsonb_build_object(
    'forma_pagamento', coalesce(p_pagamento->>'forma_pagamento','dinheiro'),
    'cliente_id', v_cliente,
    'desconto', v_desc,
    'observacoes', 'Do orcamento',
    'itens', v_itens
  );
  if p_pagamento ? 'cartao' then v_payload := v_payload || jsonb_build_object('cartao', p_pagamento->'cartao'); end if;
  if p_pagamento ? 'fiado'  then v_payload := v_payload || jsonb_build_object('fiado',  p_pagamento->'fiado');  end if;

  v_venda := public.registrar_venda(v_payload);   -- aplica as travas de venda

  update public.orcamentos set status = 'convertido', venda_id = v_venda where id = p_orcamento;
  return v_venda;
end; $$;
grant execute on function public.converter_orcamento(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 6) RPC cancelar_orcamento(orcamento, motivo)
-- ---------------------------------------------------------------------
create or replace function public.cancelar_orcamento(p_orcamento uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if (select public.meu_papel()) not in ('operacao','gestao') then
    raise exception 'Sem permissao.' using errcode = '42501';
  end if;
  select status into v_status from public.orcamentos where id = p_orcamento for update;
  if v_status is null then raise exception 'Orcamento nao encontrado.' using errcode = '22023'; end if;
  if v_status = 'convertido' then
    raise exception 'Esse orcamento ja virou venda. Cancele a venda, nao o orcamento.' using errcode = '22023';
  end if;
  update public.orcamentos set status = 'cancelado', cancelado_motivo = nullif(btrim(coalesce(p_motivo,'')),'')
   where id = p_orcamento;
end; $$;
grant execute on function public.cancelar_orcamento(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7) RLS — orçamento é comercial (sem custo): operação vê os próprios; gestão vê tudo.
-- ---------------------------------------------------------------------
alter table public.orcamentos      enable row level security;
alter table public.orcamento_itens enable row level security;

drop policy if exists orcamentos_select on public.orcamentos;
create policy orcamentos_select on public.orcamentos for select to authenticated
  using ((select public.meu_papel()) = 'gestao' or criado_por = auth.uid());

drop policy if exists orcamento_itens_select on public.orcamento_itens;
create policy orcamento_itens_select on public.orcamento_itens for select to authenticated
  using (exists (select 1 from public.orcamentos o
                 where o.id = orcamento_id
                   and ((select public.meu_papel()) = 'gestao' or o.criado_por = auth.uid())));
-- escrita só via RPC (owner).
