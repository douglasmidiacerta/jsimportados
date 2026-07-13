-- =====================================================================
-- 0013_onda1_desfazer.sql — ONDA 1 (parte 1): desfazer erro + auditoria
-- IDEMPOTENTE. Devolução parcial/total de venda, cancelamento de venda e de
-- compra, ajuste manual com motivo e trilha de auditoria. Ledgers continuam
-- imutáveis: TODA reversão é linha nova (espelho negativo), nunca UPDATE.
-- Regras do dono (docs/regras-erp.md §5 e design-onda1.md):
--   D1 devolução item-a-item + total · D2 revendável/perda · D3 operação só a
--   própria venda, de hoje, com caixa aberto · cartão/fiado só cancela com
--   ZERO recebido · perda mantém CMV · dinheiro devolvido sai como sangria.
-- Depende de: 0003-0006 (ledgers, GUC jsimportados.rpc_venda, hoje_brt,
--   meu_papel com sentinela '').
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) AUDITORIA — "tudo tem que ter registros". Log imutável, só-gestão lê;
--    escreve-se apenas via registrar_auditoria (DEFINER) — sem policy de
--    INSERT/UPDATE/DELETE.
-- ---------------------------------------------------------------------
create table if not exists public.auditoria (
  id          uuid primary key default gen_random_uuid(),
  tabela      text not null,
  registro_id uuid,
  acao        text not null,
  usuario     uuid default auth.uid(),
  dados       jsonb,
  criado_em   timestamptz not null default now()
);
create index if not exists auditoria_tabela_idx on public.auditoria (tabela, registro_id);
create index if not exists auditoria_criado_idx on public.auditoria (criado_em desc);
alter table public.auditoria enable row level security;
drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria for select to authenticated
  using ((select public.meu_papel()) = 'gestao');

create or replace function public.registrar_auditoria(
  p_tabela text, p_registro uuid, p_acao text, p_dados jsonb default null
) returns void language sql security definer set search_path = public as $$
  insert into public.auditoria (tabela, registro_id, acao, dados)
  values (p_tabela, p_registro, p_acao, p_dados);
$$;

-- Trigger: mudanças sensíveis em PRODUTOS (preços/loja/ativo) deixam rastro.
create or replace function public.auditar_produtos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.preco_venda    is distinct from old.preco_venda
  or new.preco_atacado  is distinct from old.preco_atacado
  or new.loja_ativo     is distinct from old.loja_ativo
  or new.ativo          is distinct from old.ativo then
    perform public.registrar_auditoria('produtos', new.id, 'update', jsonb_build_object(
      'antes', jsonb_build_object('preco_venda', old.preco_venda, 'preco_atacado', old.preco_atacado, 'loja_ativo', old.loja_ativo, 'ativo', old.ativo),
      'depois', jsonb_build_object('preco_venda', new.preco_venda, 'preco_atacado', new.preco_atacado, 'loja_ativo', new.loja_ativo, 'ativo', new.ativo)));
  end if;
  return new;
end; $$;
drop trigger if exists trg_auditar_produtos on public.produtos;
create trigger trg_auditar_produtos after update on public.produtos
  for each row execute function public.auditar_produtos();

-- Trigger: papel/ativo de PERFIS.
create or replace function public.auditar_perfis()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.papel is distinct from old.papel or new.ativo is distinct from old.ativo then
    perform public.registrar_auditoria('perfis', new.id, 'update', jsonb_build_object(
      'antes', jsonb_build_object('papel', old.papel, 'ativo', old.ativo),
      'depois', jsonb_build_object('papel', new.papel, 'ativo', new.ativo)));
  end if;
  return new;
end; $$;
drop trigger if exists trg_auditar_perfis on public.perfis;
create trigger trg_auditar_perfis after update on public.perfis
  for each row execute function public.auditar_perfis();

-- ---------------------------------------------------------------------
-- 2) COLUNAS NOVAS
-- ---------------------------------------------------------------------
alter table public.produtos
  add column if not exists vender_sem_estoque boolean not null default true;

alter table public.movimentacoes_estoque
  add column if not exists motivo text;

alter table public.vendas
  add column if not exists cancelada_em        timestamptz,
  add column if not exists cancelada_por       uuid references auth.users(id) on delete set null,
  add column if not exists motivo_cancelamento text;
alter table public.vendas drop constraint if exists vendas_status_check;
alter table public.vendas add constraint vendas_status_check
  check (status in ('liquidado','a_receber','cancelada','devolvida_parcial'));

alter table public.compras
  add column if not exists cancelada_em        timestamptz,
  add column if not exists cancelada_por       uuid references auth.users(id) on delete set null,
  add column if not exists motivo_cancelamento text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='compras_status_chk') then
    alter table public.compras add constraint compras_status_chk
      check (status in ('confirmada','cancelada'));
  end if;
end $$;

alter table public.caixa_sessoes
  add column if not exists justificativa_diferenca text;

-- Espelho negativo: venda_itens passa a aceitar quantidade NEGATIVA (linha de
-- devolução), nunca zero. devolucao_id marca a linha como espelho.
alter table public.venda_itens drop constraint if exists venda_itens_qtd_pos;
alter table public.venda_itens add constraint venda_itens_qtd_nz
  check (quantidade <> 0);

-- ---------------------------------------------------------------------
-- 3) DEVOLUÇÕES
-- ---------------------------------------------------------------------
create table if not exists public.devolucoes (
  id         uuid primary key default gen_random_uuid(),
  venda_id   uuid not null references public.vendas(id) on delete restrict,
  tipo       text not null default 'devolucao' check (tipo in ('devolucao','cancelamento')),
  motivo     text not null,
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em  timestamptz not null default now()
);
create index if not exists devolucoes_venda_idx on public.devolucoes (venda_id);

create table if not exists public.devolucao_itens (
  id             uuid primary key default gen_random_uuid(),
  devolucao_id   uuid not null references public.devolucoes(id) on delete cascade,
  venda_item_id  uuid not null references public.venda_itens(id) on delete restrict,
  produto_id     uuid not null references public.produtos(id) on delete restrict,
  quantidade     numeric(14,3) not null check (quantidade > 0),
  revendavel     boolean not null default true,
  preco_unitario numeric(12,2) not null,
  subtotal       numeric(14,2) not null,
  custo_unitario numeric(14,4)
);
create index if not exists devolucao_itens_dev_idx on public.devolucao_itens (devolucao_id);
create index if not exists devolucao_itens_item_idx on public.devolucao_itens (venda_item_id);

alter table public.venda_itens
  add column if not exists devolucao_id uuid references public.devolucoes(id) on delete restrict;

alter table public.devolucoes enable row level security;
alter table public.devolucao_itens enable row level security;
drop policy if exists devolucoes_select on public.devolucoes;
create policy devolucoes_select on public.devolucoes for select to authenticated
  using ((select public.meu_papel()) = 'gestao' or criado_por = auth.uid());
drop policy if exists devolucao_itens_select on public.devolucao_itens;
create policy devolucao_itens_select on public.devolucao_itens for select to authenticated
  using (exists (select 1 from public.devolucoes d where d.id = devolucao_id
                 and ((select public.meu_papel()) = 'gestao' or d.criado_por = auth.uid())));
-- escrita: só via RPC DEFINER (sem policies de INSERT/UPDATE/DELETE)

-- ---------------------------------------------------------------------
-- 4) RPC devolver_venda — devolução parcial/total, atômica.
--    p_itens: [{"venda_item_id": uuid, "quantidade": n, "revendavel": bool}]
-- ---------------------------------------------------------------------
create or replace function public.devolver_venda(
  p_venda uuid, p_itens jsonb, p_motivo text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_papel   text := (select public.meu_papel());
  v_venda   public.vendas%rowtype;
  v_caixa   uuid;
  v_dev     uuid;
  e         jsonb;
  vi        public.venda_itens%rowtype;
  v_q       numeric(14,3);
  v_rev     boolean;
  v_jadev   numeric(14,3);
  v_custo   numeric(14,4);
  v_mirror  uuid;
  v_valor   numeric(14,2) := 0;   -- total devolvido (itens)
  v_receb   numeric(14,2);
  v_rest    numeric(14,3);
  v_custo_t numeric(16,4);
  v_receita numeric(14,2);
begin
  if v_papel not in ('operacao','gestao') then
    raise exception 'Sem permissao.' using errcode='42501'; end if;
  if coalesce(btrim(p_motivo),'') = '' then
    raise exception 'Informe o motivo da devolucao.' using errcode='22023'; end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe os itens a devolver.' using errcode='22023'; end if;

  select * into v_venda from public.vendas where id = p_venda for update;
  if not found then raise exception 'Venda inexistente.' using errcode='22023'; end if;
  if v_venda.status = 'cancelada' then
    raise exception 'Esta venda ja foi cancelada.' using errcode='22023'; end if;

  -- D3: operacao so cancela a PROPRIA venda, de HOJE, com caixa ABERTO.
  select id into v_caixa from public.caixa_sessoes where status = 'aberto' limit 1;
  if v_papel <> 'gestao' then
    if v_venda.criado_por is distinct from auth.uid() then
      raise exception 'Voce so pode devolver vendas feitas por voce.' using errcode='42501'; end if;
    if v_venda.data_venda <> public.hoje_brt() then
      raise exception 'A operacao so devolve vendas de hoje. Chame a gestao.' using errcode='42501'; end if;
    if v_caixa is null then
      raise exception 'Abra o caixa antes de devolver.' using errcode='42501'; end if;
  end if;

  -- dinheiro/pix devolve dinheiro da gaveta => precisa de caixa aberto (todos)
  if v_venda.forma_pagamento in ('dinheiro','pix') and v_caixa is null then
    raise exception 'Abra o caixa para devolver o dinheiro.' using errcode='22023'; end if;

  -- cartao/fiado: regra do ZERO RECEBIDO (estorne recebimentos antes)
  if v_venda.forma_pagamento in ('cartao','fiado') then
    select coalesce(sum(r.valor),0) into v_receb
      from public.recebimentos r
      join public.contas_receber cr on cr.id = r.conta_receber_id
     where cr.venda_id = p_venda;
    if v_receb <> 0 then
      raise exception 'Estorne os recebimentos desta venda no financeiro antes de devolver.' using errcode='22023'; end if;
  end if;

  insert into public.devolucoes (venda_id, motivo)
  values (p_venda, btrim(p_motivo)) returning id into v_dev;

  for e in select * from jsonb_array_elements(p_itens) loop
    select * into vi from public.venda_itens
     where id = (e->>'venda_item_id')::uuid and venda_id = p_venda
       and quantidade > 0 and devolucao_id is null
     for update;
    if not found then
      raise exception 'Item da venda nao encontrado.' using errcode='22023'; end if;

    v_q   := (e->>'quantidade')::numeric(14,3);
    v_rev := coalesce((e->>'revendavel')::boolean, true);
    if v_q is null or v_q <= 0 then
      raise exception 'Quantidade invalida.' using errcode='22023'; end if;

    select coalesce(sum(quantidade),0) into v_jadev
      from public.devolucao_itens where venda_item_id = vi.id;
    if v_q > vi.quantidade - v_jadev + 0.0005 then
      raise exception 'Quantidade maior que o restante do item.' using errcode='22023'; end if;

    select custo_unitario into v_custo
      from public.venda_itens_custo where venda_item_id = vi.id;

    insert into public.devolucao_itens
      (devolucao_id, venda_item_id, produto_id, quantidade, revendavel, preco_unitario, subtotal, custo_unitario)
    values (v_dev, vi.id, vi.produto_id, v_q, v_rev, vi.preco_unitario,
            round(v_q * vi.preco_unitario, 2), v_custo);

    -- espelho NEGATIVO na receita (corrige DRE/lucratividade/ABC sem tocar o cabecalho)
    insert into public.venda_itens
      (venda_id, produto_id, posicao, quantidade, preco_unitario, subtotal, devolucao_id)
    values (p_venda, vi.produto_id, vi.posicao, -v_q, vi.preco_unitario,
            -round(v_q * vi.preco_unitario, 2), v_dev)
    returning id into v_mirror;

    -- CMV: espelho negativo SO se o item volta revendavel (perda mantem CMV)
    if v_rev and v_custo is not null then
      insert into public.venda_itens_custo (venda_item_id, custo_unitario, custo_total)
      values (v_mirror, v_custo, -round(v_q * v_custo, 4));
    end if;

    -- estoque: repoe via AJUSTE (nao mexe no custo medio) apenas se revendavel
    if v_rev then
      perform set_config('jsimportados.rpc_venda', 'on', true);
      insert into public.movimentacoes_estoque
        (produto_id, tipo, quantidade, origem, motivo, observacoes)
      values (vi.produto_id, 'ajuste', v_q, 'ajuste', 'devolucao',
              'Devolucao da venda ' || p_venda);
      perform set_config('jsimportados.rpc_venda', 'off', true);
    end if;

    v_valor := v_valor + round(v_q * vi.preco_unitario, 2);
  end loop;

  -- dinheiro/pix: devolve da gaveta como SANGRIA (sem venda_id — indice unico)
  if v_venda.forma_pagamento in ('dinheiro','pix') and v_valor > 0 then
    insert into public.caixa_movimentos (sessao_id, tipo, meio, valor, observacoes)
    values (v_caixa, 'sangria', 'dinheiro', -v_valor,
            'Devolucao da venda ' || p_venda);
  end if;

  -- recomputa COGS/lucro agregados a partir dos itens (originais + espelhos)
  select coalesce(sum(c.custo_total),0) into v_custo_t
    from public.venda_itens_custo c
    join public.venda_itens i on i.id = c.venda_item_id
   where i.venda_id = p_venda;
  select coalesce(sum(subtotal),0) into v_receita
    from public.venda_itens where venda_id = p_venda;
  update public.vendas_custo
     set custo_total = v_custo_t,
         lucro_bruto = (v_receita - v_venda.desconto) - v_custo_t
   where venda_id = p_venda;

  -- status: tudo devolvido -> cancelada; senao devolvida_parcial
  select coalesce(sum(quantidade),0) into v_rest
    from public.venda_itens where venda_id = p_venda;
  if v_rest <= 0.0005 then
    update public.vendas
       set status='cancelada', cancelada_em=now(), cancelada_por=auth.uid(),
           motivo_cancelamento=btrim(p_motivo)
     where id = p_venda;
    update public.devolucoes set tipo='cancelamento' where id = v_dev;
    if v_venda.forma_pagamento in ('cartao','fiado') then
      update public.contas_receber set status='cancelado'
       where venda_id = p_venda and status = 'aberto';
    end if;
  else
    if v_venda.forma_pagamento in ('cartao','fiado') then
      raise exception 'Venda no cartao/fiado so pode ser cancelada por inteiro.' using errcode='22023';
    end if;
    update public.vendas set status='devolvida_parcial' where id = p_venda;
  end if;

  perform public.registrar_auditoria('vendas', p_venda,
    case when v_rest <= 0.0005 then 'cancelamento' else 'devolucao_parcial' end,
    jsonb_build_object('devolucao_id', v_dev, 'motivo', btrim(p_motivo), 'valor', v_valor));

  return v_dev;
end; $$;
grant execute on function public.devolver_venda(uuid, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5) RPC cancelar_venda — devolve TODO o restante (atalho).
-- ---------------------------------------------------------------------
create or replace function public.cancelar_venda(
  p_venda uuid, p_motivo text, p_revendavel boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_itens jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'venda_item_id', i.id,
           'quantidade', i.quantidade - coalesce(d.devolvido, 0),
           'revendavel', p_revendavel))
    into v_itens
    from public.venda_itens i
    left join (select venda_item_id, sum(quantidade) devolvido
                 from public.devolucao_itens group by venda_item_id) d
           on d.venda_item_id = i.id
   where i.venda_id = p_venda and i.devolucao_id is null and i.quantidade > 0
     and i.quantidade - coalesce(d.devolvido, 0) > 0;
  if v_itens is null then
    raise exception 'Nada restante para cancelar.' using errcode='22023'; end if;
  return public.devolver_venda(p_venda, v_itens, p_motivo);
end; $$;
grant execute on function public.cancelar_venda(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 6) RPC cancelar_compra — gestão; exige conta a pagar com ZERO pago.
--    Reverte o estoque por AJUSTE negativo (média NAO é desfeita — documentado).
-- ---------------------------------------------------------------------
create or replace function public.cancelar_compra(p_compra uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_compra public.compras%rowtype; v_pago numeric(14,2); it record;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode cancelar compras.' using errcode='42501'; end if;
  if coalesce(btrim(p_motivo),'') = '' then
    raise exception 'Informe o motivo.' using errcode='22023'; end if;
  select * into v_compra from public.compras where id = p_compra for update;
  if not found then raise exception 'Compra inexistente.' using errcode='22023'; end if;
  if v_compra.status = 'cancelada' then
    raise exception 'Compra ja cancelada.' using errcode='22023'; end if;

  select coalesce(sum(p.valor),0) into v_pago
    from public.pagamentos p
    join public.contas_pagar cp on cp.id = p.conta_pagar_id
   where cp.compra_id = p_compra;
  if v_pago <> 0 then
    raise exception 'Estorne os pagamentos desta compra antes de cancelar.' using errcode='22023'; end if;

  update public.contas_pagar set status='cancelado' where compra_id = p_compra;

  for it in select produto_id, quantidade from public.compra_itens where compra_id = p_compra loop
    insert into public.movimentacoes_estoque
      (produto_id, tipo, quantidade, origem, motivo, observacoes)
    values (it.produto_id, 'ajuste', -it.quantidade, 'ajuste', 'cancelamento_compra',
            'Cancelamento da compra ' || p_compra);
  end loop;

  update public.compras
     set status='cancelada', cancelada_em=now(), cancelada_por=auth.uid(),
         motivo_cancelamento=btrim(p_motivo)
   where id = p_compra;

  perform public.registrar_auditoria('compras', p_compra, 'cancelamento',
    jsonb_build_object('motivo', btrim(p_motivo)));
end; $$;
grant execute on function public.cancelar_compra(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7) RPC ajustar_estoque — ajuste manual COM MOTIVO (gestão).
-- ---------------------------------------------------------------------
create or replace function public.ajustar_estoque(
  p_produto uuid, p_quantidade numeric, p_motivo text, p_observacoes text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode ajustar o estoque.' using errcode='42501'; end if;
  if p_quantidade is null or p_quantidade = 0 then
    raise exception 'Quantidade deve ser diferente de zero.' using errcode='22023'; end if;
  if p_motivo not in ('perda','quebra','inventario','outro') then
    raise exception 'Motivo invalido.' using errcode='22023'; end if;

  insert into public.movimentacoes_estoque
    (produto_id, tipo, quantidade, origem, motivo, observacoes)
  values (p_produto, 'ajuste', p_quantidade, 'ajuste', p_motivo, p_observacoes);

  perform public.registrar_auditoria('movimentacoes_estoque', p_produto, 'ajuste_manual',
    jsonb_build_object('quantidade', p_quantidade, 'motivo', p_motivo, 'obs', p_observacoes));
end; $$;
grant execute on function public.ajustar_estoque(uuid, numeric, text, text) to authenticated;
-- (Fim da 0013)
