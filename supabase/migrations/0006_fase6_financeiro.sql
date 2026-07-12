-- =====================================================================
-- JS Importados — Fase 6 (Financeiro) — MIGRATION 0006 (idempotente)
-- Rodar como owner (postgres), via Node pg direto (padrão da casa).
-- Depende de: meu_papel(), tocar_atualizado_em(), fornecedores, compras,
--   vendas, vendas_custo, contas_receber (Fases 2/3/4). TUDO gestão-only.
-- Regimes SEPARADOS: vw_extrato (CAIXA) e vw_dre_mensal (COMPETÊNCIA).
-- =====================================================================

-- 0) Helper de data no fuso do negócio (current_date do servidor é UTC).
create or replace function public.hoje_brt() returns date
  language sql stable set search_path = public as
$$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- ---------------------------------------------------------------------
-- 1) DESPESA_CATEGORIAS — lista editável (uuid + FK). Gestão-only.
-- ---------------------------------------------------------------------
create table if not exists public.despesa_categorias (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index if not exists despesa_categorias_nome_uk
  on public.despesa_categorias (lower(nome));
insert into public.despesa_categorias (nome)
select x from (values
  ('Aluguel'),('Energia'),('Água'),('Internet/Telefone'),('Frete/Transporte'),
  ('Salários'),('Pró-labore'),('Impostos/Taxas'),('Marketing'),('Manutenção'),
  ('Tarifas bancárias'),('Embalagens'),('Material de escritório'),('Outras')
) as v(x)
where not exists (select 1 from public.despesa_categorias d where lower(d.nome)=lower(v.x));

-- ---------------------------------------------------------------------
-- 2) FINANCEIRO_CONFIG — singleton: saldo inicial do extrato. Gestão-only.
-- ---------------------------------------------------------------------
create table if not exists public.financeiro_config (
  id            boolean primary key default true,
  saldo_inicial numeric(14,2) not null default 0,
  data_inicial  date not null default public.hoje_brt(),
  atualizado_em timestamptz not null default now(),
  constraint financeiro_config_singleton check (id = true)
);
insert into public.financeiro_config (id) values (true) on conflict (id) do nothing;
drop trigger if exists trg_fin_config_touch on public.financeiro_config;
create trigger trg_fin_config_touch before update on public.financeiro_config
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- 3) CONTAS_PAGAR — tipo 'compra' (só CAIXA) | 'despesa' (só DRE). Gestão-only.
--    valor_pago/pago_em são DENORM recomputados do ledger. 'aberto' cobre parcial.
-- ---------------------------------------------------------------------
create table if not exists public.contas_pagar (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('compra','despesa')),
  categoria_id  uuid references public.despesa_categorias(id) on delete set null,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  compra_id     uuid references public.compras(id) on delete restrict, -- só tipo='compra'; RESTRICT protege o ledger de DELETE em cascata
  descricao     text not null,
  valor         numeric(14,2) not null,
  competencia   date not null default public.hoje_brt(),   -- mês do DRE (bucketizado na view)
  vencimento    date not null default public.hoje_brt(),
  status        text not null default 'aberto' check (status in ('aberto','pago','cancelado')),
  valor_pago    numeric(14,2) not null default 0,          -- denorm = net do ledger pagamentos
  pago_em       date,                                       -- denorm = data do último pagamento (quando pago)
  observacoes   text,
  criado_por    uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint cp_valor_nn        check (valor >= 0),
  constraint cp_pago_nn         check (valor_pago >= 0),
  constraint cp_compra_ref      check (tipo <> 'compra' or compra_id is not null),
  constraint cp_despesa_semcomp check (tipo <> 'despesa' or compra_id is null)
);
create unique index if not exists cp_compra_uniq  on public.contas_pagar (compra_id) where compra_id is not null;
create index if not exists cp_status_venc_idx on public.contas_pagar (status, vencimento);
create index if not exists cp_tipo_comp_idx   on public.contas_pagar (tipo, competencia);
create index if not exists cp_fornecedor_idx  on public.contas_pagar (fornecedor_id);
drop trigger if exists trg_contas_pagar_touch on public.contas_pagar;
create trigger trg_contas_pagar_touch before update on public.contas_pagar
  for each row execute function public.tocar_atualizado_em();

-- 3b) contas_receber ganha denorm de recebido (sem alterar o CHECK inline da 0004).
alter table public.contas_receber add column if not exists valor_recebido numeric(14,2) not null default 0;

-- ---------------------------------------------------------------------
-- 4) LEDGERS imutáveis (fonte da verdade dos eventos de caixa).
--    estorno = LINHA de reversão (valor negativo) referenciando a original.
-- ---------------------------------------------------------------------
create table if not exists public.pagamentos (
  id             uuid primary key default gen_random_uuid(),
  conta_pagar_id uuid not null references public.contas_pagar(id) on delete cascade,
  data_pagamento date not null default public.hoje_brt(),
  valor          numeric(14,2) not null,   -- >0 pagamento ; <0 estorno
  forma_pagamento text check (forma_pagamento in ('dinheiro','pix','cartao','transferencia','boleto','outro')),
  estorno_de     uuid references public.pagamentos(id) on delete restrict,
  observacoes    text,
  criado_por     uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em      timestamptz not null default now(),
  constraint pag_valor_nz check (valor <> 0)
);
create index if not exists pag_conta_idx on public.pagamentos (conta_pagar_id, data_pagamento);
create unique index if not exists pag_estorno_uq on public.pagamentos (estorno_de) where estorno_de is not null;

create table if not exists public.recebimentos (
  id               uuid primary key default gen_random_uuid(),
  conta_receber_id uuid not null references public.contas_receber(id) on delete cascade,
  data_recebimento date not null default public.hoje_brt(),
  valor            numeric(14,2) not null,  -- LÍQUIDO recebido (>0) ; estorno (<0)
  forma_pagamento  text check (forma_pagamento in ('dinheiro','pix','cartao','transferencia','boleto','outro')),
  estorno_de       uuid references public.recebimentos(id) on delete restrict,
  observacoes      text,
  criado_por       uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em        timestamptz not null default now(),
  constraint reb_valor_nz check (valor <> 0)
);
create index if not exists reb_conta_idx on public.recebimentos (conta_receber_id, data_recebimento);
create unique index if not exists reb_estorno_uq on public.recebimentos (estorno_de) where estorno_de is not null;

-- ---------------------------------------------------------------------
-- 5) TRIGGER compra -> conta a pagar (NÃO reproduz registrar_compra).
--    registrar_compra insere header com totais 0 e faz UPDATE dos totais (8.7);
--    a trigger dispara ao finalizar total_geral_brl. Idempotente. SECURITY DEFINER
--    (owner) p/ escrever em contas_pagar apesar da RLS sem policy de INSERT.
-- ---------------------------------------------------------------------
create or replace function public.compra_gerar_conta_pagar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.total_geral_brl > 0
     and not exists (select 1 from public.contas_pagar where compra_id = new.id) then
    insert into public.contas_pagar
      (tipo, fornecedor_id, compra_id, descricao, valor, competencia, vencimento, status, criado_por, criado_em)
    values ('compra', new.fornecedor_id, new.id,
            'Compra ' || to_char(new.data_compra,'DD/MM/YYYY'),
            new.total_geral_brl, new.data_compra, new.data_compra, 'aberto',
            new.criado_por, new.criado_em);
  end if;
  return null;
end; $$;
drop trigger if exists trg_compra_conta_pagar on public.compras;
create trigger trg_compra_conta_pagar after insert or update of total_geral_brl
  on public.compras for each row execute function public.compra_gerar_conta_pagar();

-- 5b) BACKFILL idempotente compras -> contas_pagar (unique index + NOT EXISTS).
insert into public.contas_pagar
  (tipo, fornecedor_id, compra_id, descricao, valor, competencia, vencimento, status, criado_em)
select 'compra', c.fornecedor_id, c.id,
       'Compra ' || to_char(c.data_compra,'DD/MM/YYYY'),
       c.total_geral_brl, c.data_compra, c.data_compra, 'aberto', c.criado_em
from public.compras c
where c.total_geral_brl > 0
  and not exists (select 1 from public.contas_pagar cp where cp.compra_id = c.id);

-- 5c) BACKFILL de recebimentos p/ contas_receber legadas já liquidadas (hoje: nenhuma).
insert into public.recebimentos (conta_receber_id, data_recebimento, valor, forma_pagamento, observacoes)
select cr.id, coalesce(cr.liquidado_em, cr.vencimento), cr.valor_liquido, 'outro', 'Backfill Fase 6'
from public.contas_receber cr
where cr.status = 'liquidado' and cr.valor_liquido > 0
  and not exists (select 1 from public.recebimentos r where r.conta_receber_id = cr.id);
update public.contas_receber cr
   set valor_recebido = coalesce((select sum(r.valor) from public.recebimentos r where r.conta_receber_id = cr.id), 0)
 where cr.status = 'liquidado';

-- ---------------------------------------------------------------------
-- 6) RPCs (SECURITY DEFINER, owner=postgres, autorizam por meu_papel()='gestao').
-- ---------------------------------------------------------------------

-- 6a) recomputo denorm de contas_pagar a partir do ledger (interno; sem grant).
create or replace function public._recompute_conta_pagar(p_conta uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_valor numeric(14,2); v_net numeric(14,2); v_status text;
begin
  select valor, status into v_valor, v_status from public.contas_pagar where id = p_conta for update;
  select coalesce(sum(valor),0) into v_net from public.pagamentos where conta_pagar_id = p_conta;
  update public.contas_pagar set
    valor_pago = v_net,
    status = case when v_status='cancelado' then 'cancelado'
                  when v_net >= v_valor - 0.005 then 'pago' else 'aberto' end,
    pago_em = case when v_net >= v_valor - 0.005 and v_status<>'cancelado'
                   then (select max(data_pagamento) from public.pagamentos where conta_pagar_id=p_conta and valor>0)
                   else null end
  where id = p_conta;
end; $$;

-- 6b) recomputo denorm de contas_receber a partir do ledger (interno; sem grant).
create or replace function public._recompute_conta_receber(p_conta uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_liq numeric(14,2); v_net numeric(14,2); v_status text;
begin
  select valor_liquido, status into v_liq, v_status from public.contas_receber where id = p_conta for update;
  select coalesce(sum(valor),0) into v_net from public.recebimentos where conta_receber_id = p_conta;
  update public.contas_receber set
    valor_recebido = v_net,
    status = case when v_status='cancelado' then 'cancelado'
                  when v_net >= v_liq - 0.005 then 'liquidado' else 'aberto' end,
    liquidado_em = case when v_net >= v_liq - 0.005 and v_status<>'cancelado'
                        then (select max(data_recebimento) from public.recebimentos where conta_receber_id=p_conta and valor>0)
                        else null end
  where id = p_conta;
end; $$;

-- 6c) pagar_conta: baixa parcial ou total. p_valor null => quita o saldo restante.
create or replace function public.pagar_conta(p_conta uuid, p_data date default null, p_valor numeric default null, p_forma text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_valor numeric(14,2); v_pago numeric(14,2); v_saldo numeric(14,2); v_val numeric(14,2); v_status text;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode pagar contas.' using errcode='42501'; end if;
  select valor, valor_pago, status into v_valor, v_pago, v_status
    from public.contas_pagar where id = p_conta for update;
  if not found then raise exception 'Conta inexistente.' using errcode='22023'; end if;
  if v_status = 'cancelado' then raise exception 'Conta cancelada.' using errcode='22023'; end if;
  v_saldo := round(v_valor - v_pago, 2);
  if v_saldo <= 0 then raise exception 'Conta ja quitada.' using errcode='22023'; end if;
  v_val := round(coalesce(p_valor, v_saldo), 2);
  if v_val <= 0 then raise exception 'Valor de pagamento invalido.' using errcode='22023'; end if;
  if v_val > v_saldo + 0.005 then raise exception 'Valor maior que o saldo devedor.' using errcode='22023'; end if;
  insert into public.pagamentos (conta_pagar_id, data_pagamento, valor, forma_pagamento)
  values (p_conta, coalesce(p_data, public.hoje_brt()), v_val, nullif(lower(coalesce(p_forma,'')),''));
  perform public._recompute_conta_pagar(p_conta);
  select status, valor_pago into v_status, v_pago from public.contas_pagar where id = p_conta;
  return jsonb_build_object('conta_id',p_conta,'valor_pago',v_pago,'status',v_status,'saldo',round(v_valor-v_pago,2));
end; $$;
grant execute on function public.pagar_conta(uuid,date,numeric,text) to authenticated;

-- 6d) estornar_pagamento: insere linha de reversão (nunca DELETE).
create or replace function public.estornar_pagamento(p_pagamento uuid, p_data date default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_conta uuid; v_valor numeric(14,2); v_estorno_de uuid;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode estornar.' using errcode='42501'; end if;
  select conta_pagar_id, valor, estorno_de into v_conta, v_valor, v_estorno_de
    from public.pagamentos where id = p_pagamento for update;
  if not found then raise exception 'Pagamento inexistente.' using errcode='22023'; end if;
  if v_estorno_de is not null then raise exception 'Nao e possivel estornar um estorno.' using errcode='22023'; end if;
  if exists (select 1 from public.pagamentos where estorno_de = p_pagamento) then
    raise exception 'Pagamento ja estornado.' using errcode='22023'; end if;
  insert into public.pagamentos (conta_pagar_id, data_pagamento, valor, estorno_de, observacoes)
  values (v_conta, coalesce(p_data, public.hoje_brt()), -v_valor, p_pagamento, 'Estorno');
  perform public._recompute_conta_pagar(v_conta);
end; $$;
grant execute on function public.estornar_pagamento(uuid,date) to authenticated;

-- 6e) baixar_receber: cartão liquida a parcela INTEIRA; fiado permite PARCIAL. Valor = LÍQUIDO.
create or replace function public.baixar_receber(p_conta uuid, p_data date default null, p_valor numeric default null, p_forma text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tipo text; v_liq numeric(14,2); v_rec numeric(14,2); v_saldo numeric(14,2); v_val numeric(14,2); v_status text;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode dar baixa.' using errcode='42501'; end if;
  select tipo, valor_liquido, valor_recebido, status into v_tipo, v_liq, v_rec, v_status
    from public.contas_receber where id = p_conta for update;
  if not found then raise exception 'Conta inexistente.' using errcode='22023'; end if;
  if v_status = 'cancelado' then raise exception 'Conta cancelada.' using errcode='22023'; end if;
  v_saldo := round(v_liq - v_rec, 2);
  if v_saldo <= 0 then raise exception 'Conta ja recebida.' using errcode='22023'; end if;
  v_val := round(coalesce(p_valor, v_saldo), 2);
  if v_tipo = 'cartao' and v_val <> v_saldo then
    raise exception 'Parcela de cartao liquida integralmente.' using errcode='22023'; end if;
  if v_val <= 0 or v_val > v_saldo + 0.005 then
    raise exception 'Valor de recebimento invalido.' using errcode='22023'; end if;
  insert into public.recebimentos (conta_receber_id, data_recebimento, valor, forma_pagamento)
  values (p_conta, coalesce(p_data, public.hoje_brt()), v_val, nullif(lower(coalesce(p_forma,'')),''));
  perform public._recompute_conta_receber(p_conta);
  select status, valor_recebido into v_status, v_rec from public.contas_receber where id = p_conta;
  return jsonb_build_object('conta_id',p_conta,'valor_recebido',v_rec,'status',v_status,'saldo',round(v_liq-v_rec,2));
end; $$;
grant execute on function public.baixar_receber(uuid,date,numeric,text) to authenticated;

-- 6f) estornar_receber: linha de reversão no ledger recebimentos.
create or replace function public.estornar_receber(p_recebimento uuid, p_data date default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_conta uuid; v_valor numeric(14,2); v_estorno_de uuid;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode estornar.' using errcode='42501'; end if;
  select conta_receber_id, valor, estorno_de into v_conta, v_valor, v_estorno_de
    from public.recebimentos where id = p_recebimento for update;
  if not found then raise exception 'Recebimento inexistente.' using errcode='22023'; end if;
  if v_estorno_de is not null then raise exception 'Nao e possivel estornar um estorno.' using errcode='22023'; end if;
  if exists (select 1 from public.recebimentos where estorno_de = p_recebimento) then
    raise exception 'Recebimento ja estornado.' using errcode='22023'; end if;
  insert into public.recebimentos (conta_receber_id, data_recebimento, valor, estorno_de, observacoes)
  values (v_conta, coalesce(p_data, public.hoje_brt()), -v_valor, p_recebimento, 'Estorno');
  perform public._recompute_conta_receber(v_conta);
end; $$;
grant execute on function public.estornar_receber(uuid,date) to authenticated;

-- 6g) registrar_despesa: cria contas_pagar tipo='despesa'. NUNCA cria tipo='compra'.
create or replace function public.registrar_despesa(p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_venc date; v_comp date; v_valor numeric(14,2);
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode registrar despesas.' using errcode='42501'; end if;
  v_valor := round(coalesce((p_payload->>'valor')::numeric,0),2);
  if v_valor <= 0 then raise exception 'Informe um valor maior que zero.' using errcode='22023'; end if;
  v_venc := coalesce(nullif(btrim(p_payload->>'vencimento'),'')::date, public.hoje_brt());
  v_comp := coalesce(nullif(btrim(p_payload->>'competencia'),'')::date, v_venc);
  insert into public.contas_pagar (tipo, categoria_id, fornecedor_id, descricao, valor, competencia, vencimento, observacoes)
  values ('despesa',
          nullif(p_payload->>'categoria_id','')::uuid,
          nullif(p_payload->>'fornecedor_id','')::uuid,
          coalesce(nullif(btrim(p_payload->>'descricao'),''),'Despesa'),
          v_valor, v_comp, v_venc,
          nullif(btrim(coalesce(p_payload->>'observacoes','')),''))
  returning id into v_id;
  if coalesce((p_payload->>'pagar_agora')::boolean,false) then
    -- "Já paguei" = pago HOJE (p_data null => hoje_brt), não na data de vencimento.
    perform public.pagar_conta(v_id, null::date, null::numeric, nullif(p_payload->>'forma_pagamento',''));
  end if;
  return v_id;
end; $$;
grant execute on function public.registrar_despesa(jsonb) to authenticated;

-- 6h) cancelar_conta_pagar: só se net de pagamentos = 0 (senão exige estorno antes).
create or replace function public.cancelar_conta_pagar(p_conta uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode cancelar.' using errcode='42501'; end if;
  if (select coalesce(sum(valor),0) from public.pagamentos where conta_pagar_id=p_conta) <> 0 then
    raise exception 'Estorne os pagamentos antes de cancelar.' using errcode='22023'; end if;
  update public.contas_pagar set status='cancelado', valor_pago=0, pago_em=null where id=p_conta;
end; $$;
grant execute on function public.cancelar_conta_pagar(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7) VIEWS — regimes separados. security_invoker + GUARDA INTERNA gestão-only.
-- ---------------------------------------------------------------------
-- 7a) EXTRATO / FLUXO DE CAIXA (regime CAIXA). Saldo corrente global.
create or replace view public.vw_extrato with (security_invoker = true) as
with cfg as (select saldo_inicial, data_inicial from public.financeiro_config),
mov as (
  -- saldo inicial (linha sintética em data_inicial, só se <>0). Representa TODO o
  -- caixa acumulado ANTES de data_inicial; por isso os movimentos abaixo são
  -- filtrados por data >= data_inicial (senão o que veio antes contaria 2x).
  select cfg.data_inicial as data, 0 as prio, null::uuid as ref_id, 'saldo_inicial'::text as origem,
         'Saldo inicial'::text as descricao, cfg.saldo_inicial as valor
    from cfg where cfg.saldo_inicial <> 0
  union all
  -- (+) vendas À VISTA dinheiro/pix na data_venda (cartão/fiado só via recebimentos)
  select v.data_venda, 1, v.id, 'venda',
         ('Venda ' || coalesce(v.forma_pagamento,''))::text, v.total
    from public.vendas v, cfg
   where v.forma_pagamento in ('dinheiro','pix') and v.total > 0
     and v.data_venda >= cfg.data_inicial
  union all
  -- (+) recebimentos LÍQUIDOS na data real do evento (net de estornos por linha)
  select r.data_recebimento, 2, r.id, 'recebimento', 'Recebimento'::text, r.valor
    from public.recebimentos r, cfg
   where r.data_recebimento >= cfg.data_inicial
  union all
  -- (-) pagamentos de contas a pagar (compra OU despesa) na data real do evento
  select p.data_pagamento, 3, p.id, 'pagamento', 'Pagamento'::text, -p.valor
    from public.pagamentos p, cfg
   where p.data_pagamento >= cfg.data_inicial
)
select m.data, m.origem, m.descricao,
       greatest(m.valor,0)  as entrada,
       greatest(-m.valor,0) as saida,
       m.valor              as valor,
       m.ref_id,
       sum(m.valor) over (order by m.data, m.prio, m.ref_id
                          rows between unbounded preceding and current row) as saldo
from mov m
where (select public.meu_papel()) = 'gestao'          -- guarda anti-vazamento p/ operação
order by m.data, m.prio, m.ref_id;
grant select on public.vw_extrato to authenticated;

-- 7b) DRE MENSAL (regime COMPETÊNCIA). Compra NÃO é despesa (entra como CMV).
create or replace view public.vw_dre_mensal with (security_invoker = true) as
with rec as (
  select date_trunc('month', v.data_venda)::date mes,
         sum(v.subtotal - v.desconto) receita_produtos,   -- exclui juros
         sum(v.juros) juros_fiado
    from public.vendas v group by 1
), cmv as (
  select date_trunc('month', v.data_venda)::date mes,
         sum(vc.custo_total) cmv, bool_and(vc.custo_completo) cmv_completo
    from public.vendas_custo vc join public.vendas v on v.id = vc.venda_id group by 1
), mdr as (
  select date_trunc('month', v.data_venda)::date mes, sum(cr.valor_taxa) taxas_cartao
    from public.contas_receber cr join public.vendas v on v.id = cr.venda_id
   where cr.status <> 'cancelado' group by 1                -- fiado contribui 0
), desp as (
  select date_trunc('month', cp.competencia)::date mes, sum(cp.valor) despesas_operacionais
    from public.contas_pagar cp
   where cp.tipo = 'despesa' and cp.status <> 'cancelado' group by 1
), meses as (
  select mes from rec union select mes from cmv union select mes from mdr union select mes from desp
)
select m.mes,
  coalesce(rec.receita_produtos,0)                          as receita_produtos,
  coalesce(cmv.cmv,0)                                       as cmv,
  coalesce(cmv.cmv_completo,true)                           as cmv_completo,
  coalesce(rec.receita_produtos,0)-coalesce(cmv.cmv,0)      as lucro_bruto,
  coalesce(desp.despesas_operacionais,0)                    as despesas_operacionais,
  coalesce(mdr.taxas_cartao,0)                              as taxas_cartao,
  coalesce(rec.juros_fiado,0)                               as juros_fiado,
  coalesce(rec.receita_produtos,0)-coalesce(cmv.cmv,0)
    - coalesce(desp.despesas_operacionais,0) - coalesce(mdr.taxas_cartao,0)
    + coalesce(rec.juros_fiado,0)                           as resultado
from meses m
left join rec  on rec.mes  = m.mes
left join cmv  on cmv.mes  = m.mes
left join mdr  on mdr.mes  = m.mes
left join desp on desp.mes = m.mes
where (select public.meu_papel()) = 'gestao'
order by m.mes desc;
grant select on public.vw_dre_mensal to authenticated;

-- ---------------------------------------------------------------------
-- 8) RLS — TUDO gestão-only. Escrita só via RPC (owner bypassa RLS).
-- ---------------------------------------------------------------------
alter table public.despesa_categorias enable row level security;
alter table public.financeiro_config  enable row level security;
alter table public.contas_pagar        enable row level security;
alter table public.pagamentos          enable row level security;
alter table public.recebimentos        enable row level security;

drop policy if exists despesa_categorias_all on public.despesa_categorias;
create policy despesa_categorias_all on public.despesa_categorias for all to authenticated
  using ((select public.meu_papel())='gestao') with check ((select public.meu_papel())='gestao');

drop policy if exists financeiro_config_all on public.financeiro_config;
create policy financeiro_config_all on public.financeiro_config for all to authenticated
  using ((select public.meu_papel())='gestao') with check ((select public.meu_papel())='gestao');

drop policy if exists contas_pagar_select on public.contas_pagar;
create policy contas_pagar_select on public.contas_pagar for select to authenticated
  using ((select public.meu_papel())='gestao');   -- INSERT/UPDATE só via RPC owner

drop policy if exists pagamentos_select on public.pagamentos;
create policy pagamentos_select on public.pagamentos for select to authenticated
  using ((select public.meu_papel())='gestao');

drop policy if exists recebimentos_select on public.recebimentos;
create policy recebimentos_select on public.recebimentos for select to authenticated
  using ((select public.meu_papel())='gestao');

-- 8b) Helpers internos: só chamados por outras RPCs (owner). Tira o EXECUTE
--     que o CREATE FUNCTION concede a PUBLIC (não devem ser chamáveis via API).
revoke execute on function public._recompute_conta_pagar(uuid) from public;
revoke execute on function public._recompute_conta_receber(uuid) from public;
-- (Fim da migração Fase 6)
