-- =====================================================================
-- 0015 — ONDA 2 (parte 1): contas financeiras, maquininhas e ledger
-- Conciliação em 3 pontas (decisão do dono, regras-erp.md §5):
--   1. cédulas × contagem física (já existe — Fase 5 + 0014);
--   2. Pix × conta bancária que recebe os Pix;
--   3. cartão × adquirente POR MAQUININHA (bruto → taxa → líquido → data).
-- Compatibilidade: sem maquininha e sem contas configuradas, o sistema se
-- comporta exatamente como hoje. Integrações por TRIGGER de tabela (padrão
-- da 0014); a única RPC recriada é registrar_venda (fonte: 0004), para a
-- venda de cartão gravar a maquininha ATOMICAMENTE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) MAQUININHAS — o PDV lista (operação escolhe qual passou); escrita gestão.
-- ---------------------------------------------------------------------
create table if not exists public.maquininhas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,                -- "Stone loja", "Moderninha da Jessica"
  adquirente    text,                         -- "Stone", "PagSeguro", "Cielo"…
  observacoes   text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint maquininhas_nome_uq unique (nome)
);
drop trigger if exists trg_maquininhas_touch on public.maquininhas;
create trigger trg_maquininhas_touch before update on public.maquininhas
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- 2) TAXAS POR MAQUININHA — MDR próprio; taxas_cartao (Fase 4) vira fallback.
-- ---------------------------------------------------------------------
create table if not exists public.maquininha_taxas (
  maquininha_id uuid not null references public.maquininhas(id) on delete cascade,
  modalidade    text not null check (modalidade in ('debito','credito')),
  parcelas      int  not null check (parcelas between 1 and 18),
  percentual    numeric(6,4) not null default 0,
  prazo_dias    int  not null default 30,
  ativo         boolean not null default true,
  atualizado_em timestamptz not null default now(),
  primary key (maquininha_id, modalidade, parcelas),
  constraint mt_pct_ok    check (percentual >= 0 and percentual < 100),
  constraint mt_prazo_nn  check (prazo_dias >= 0),
  constraint mt_debito_1x check (modalidade <> 'debito' or parcelas = 1)
);
drop trigger if exists trg_maquininha_taxas_touch on public.maquininha_taxas;
create trigger trg_maquininha_taxas_touch before update on public.maquininha_taxas
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- 3) VENDAS — qual maquininha passou (cartão).
-- ---------------------------------------------------------------------
alter table public.vendas
  add column if not exists maquininha_id uuid references public.maquininhas(id) on delete set null;
create index if not exists vendas_maquininha_idx on public.vendas (maquininha_id)
  where maquininha_id is not null;

-- ---------------------------------------------------------------------
-- 4) CONTAS FINANCEIRAS — banco / adquirente / outro. Saldo NUNCA editável:
--    saldo = soma do ledger (lancamentos_financeiros).
-- ---------------------------------------------------------------------
create table if not exists public.contas_financeiras (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  tipo           text not null check (tipo in ('banco','adquirente','outro')),
  banco          text,          -- "Nubank", "Itaú"…
  agencia        text,
  numero_conta   text,
  chave_pix      text,
  maquininha_id  uuid references public.maquininhas(id) on delete set null, -- p/ tipo adquirente
  recebe_pix     boolean not null default false,  -- a conta onde os Pix caem (máx. 1)
  saldo_inicial  numeric(14,2) not null default 0,
  data_inicial   date not null default public.hoje_brt(),
  observacoes    text,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint cf_nome_uq unique (nome),
  constraint cf_adq_maq check (maquininha_id is null or tipo = 'adquirente')
);
create unique index if not exists cf_recebe_pix_uq on public.contas_financeiras (recebe_pix)
  where recebe_pix;               -- só UMA conta recebe Pix
create unique index if not exists cf_maquininha_uq on public.contas_financeiras (maquininha_id)
  where maquininha_id is not null; -- 1 conta por maquininha
drop trigger if exists trg_contas_fin_touch on public.contas_financeiras;
create trigger trg_contas_fin_touch before update on public.contas_financeiras
  for each row execute function public.tocar_atualizado_em();

-- saldo_inicial é imutável após criar (acerto = lançamento de ajuste).
create or replace function public.contas_fin_guard()
returns trigger language plpgsql as $$
begin
  if new.saldo_inicial is distinct from old.saldo_inicial
  or new.data_inicial  is distinct from old.data_inicial then
    raise exception 'O saldo inicial nao pode ser editado. Faca um lancamento de ajuste na conta.'
      using errcode = '22023';
  end if;
  return new;
end; $$;
drop trigger if exists trg_contas_fin_guard on public.contas_financeiras;
create trigger trg_contas_fin_guard before update on public.contas_financeiras
  for each row execute function public.contas_fin_guard();

-- config: conta padrão p/ liquidações não-dinheiro (recebimentos e pagamentos)
alter table public.financeiro_config
  add column if not exists conta_padrao_id uuid references public.contas_financeiras(id) on delete set null;

-- ---------------------------------------------------------------------
-- 5) LANCAMENTOS FINANCEIROS — ledger IMUTÁVEL por conta.
--    Só os campos de conciliação podem mudar (0016 casa com o extrato).
-- ---------------------------------------------------------------------
create table if not exists public.lancamentos_financeiros (
  id               uuid primary key default gen_random_uuid(),
  conta_id         uuid not null references public.contas_financeiras(id) on delete restrict,
  data             date not null default public.hoje_brt(),
  valor            numeric(14,2) not null,
  origem           text not null check (origem in
    ('saldo_inicial','venda_pix','recebimento','pagamento','transferencia','ajuste')),
  descricao        text,
  venda_id         uuid references public.vendas(id) on delete set null,
  recebimento_id   uuid references public.recebimentos(id) on delete set null,
  pagamento_id     uuid references public.pagamentos(id) on delete set null,
  transferencia_id uuid,                                   -- FK adicionada abaixo
  conciliado       boolean not null default false,
  conciliado_em    timestamptz,
  criado_por       uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em        timestamptz not null default now(),
  constraint lf_valor_nz check (valor <> 0)
);
create index if not exists lf_conta_data_idx on public.lancamentos_financeiros (conta_id, data desc, criado_em desc);
create index if not exists lf_venda_idx on public.lancamentos_financeiros (venda_id) where venda_id is not null;
create index if not exists lf_pendentes_idx on public.lancamentos_financeiros (conta_id) where not conciliado;

create or replace function public.lancamentos_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Lancamento financeiro nao pode ser apagado. Corrija com um lancamento de ajuste.'
      using errcode = '22023';
  end if;
  if new.conta_id is distinct from old.conta_id or new.data is distinct from old.data
  or new.valor is distinct from old.valor or new.origem is distinct from old.origem
  or new.venda_id is distinct from old.venda_id
  or new.recebimento_id is distinct from old.recebimento_id
  or new.pagamento_id is distinct from old.pagamento_id
  or new.transferencia_id is distinct from old.transferencia_id then
    raise exception 'Lancamento financeiro e imutavel (so a conciliacao pode mudar).'
      using errcode = '22023';
  end if;
  return new;
end; $$;
drop trigger if exists trg_lancamentos_guard on public.lancamentos_financeiros;
create trigger trg_lancamentos_guard before update or delete on public.lancamentos_financeiros
  for each row execute function public.lancamentos_guard();

-- ---------------------------------------------------------------------
-- 6) TRANSFERENCIAS — 1 transferência = 2 lançamentos (atômico via RPC).
--    Cobre: depósito da gaveta no banco; repasse adquirente→banco.
-- ---------------------------------------------------------------------
create table if not exists public.transferencias (
  id          uuid primary key default gen_random_uuid(),
  origem_id   uuid not null references public.contas_financeiras(id) on delete restrict,
  destino_id  uuid not null references public.contas_financeiras(id) on delete restrict,
  valor       numeric(14,2) not null check (valor > 0),
  data        date not null default public.hoje_brt(),
  descricao   text,
  criado_por  uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em   timestamptz not null default now(),
  constraint transf_contas_diff check (origem_id <> destino_id)
);
create index if not exists transf_data_idx on public.transferencias (data desc, criado_em desc);

alter table public.lancamentos_financeiros
  drop constraint if exists lf_transf_fk;
alter table public.lancamentos_financeiros
  add constraint lf_transf_fk foreign key (transferencia_id)
  references public.transferencias(id) on delete restrict;

-- transferências são imutáveis (correção = transferência inversa)
create or replace function public.transferencias_guard()
returns trigger language plpgsql as $$
begin
  raise exception 'Transferencia nao pode ser alterada. Corrija com uma transferencia inversa.'
    using errcode = '22023';
end; $$;
drop trigger if exists trg_transferencias_guard on public.transferencias;
create trigger trg_transferencias_guard before update or delete on public.transferencias
  for each row execute function public.transferencias_guard();

create or replace function public.transferir_entre_contas(
  p_origem uuid, p_destino uuid, p_valor numeric,
  p_data date default null, p_descricao text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid;
  v_data   date := coalesce(p_data, public.hoje_brt());
  v_o_nome text; v_d_nome text;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Sem permissao.' using errcode = '42501';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'Informe um valor maior que zero.' using errcode = '22023';
  end if;
  select nome into v_o_nome from public.contas_financeiras where id = p_origem and ativo;
  select nome into v_d_nome from public.contas_financeiras where id = p_destino and ativo;
  if v_o_nome is null or v_d_nome is null then
    raise exception 'Conta de origem ou destino invalida/inativa.' using errcode = '22023';
  end if;

  insert into public.transferencias (origem_id, destino_id, valor, data, descricao)
  values (p_origem, p_destino, round(p_valor,2), v_data, p_descricao)
  returning id into v_id;

  insert into public.lancamentos_financeiros (conta_id, data, valor, origem, descricao, transferencia_id)
  values
    (p_origem,  v_data, -round(p_valor,2), 'transferencia',
     coalesce(p_descricao,'') || ' → ' || v_d_nome, v_id),
    (p_destino, v_data,  round(p_valor,2), 'transferencia',
     coalesce(p_descricao,'') || ' ← ' || v_o_nome, v_id);

  perform public.registrar_auditoria('transferencias', v_id, 'insert',
    jsonb_build_object('origem', v_o_nome, 'destino', v_d_nome, 'valor', round(p_valor,2)));
  return v_id;
end; $$;
grant execute on function public.transferir_entre_contas(uuid, uuid, numeric, date, text) to authenticated;

-- lançamento manual de ajuste numa conta (gestão)
create or replace function public.ajustar_conta_financeira(
  p_conta uuid, p_valor numeric, p_descricao text, p_data date default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Sem permissao.' using errcode = '42501';
  end if;
  if p_valor is null or p_valor = 0 then
    raise exception 'Informe um valor diferente de zero.' using errcode = '22023';
  end if;
  if coalesce(btrim(p_descricao),'') = '' then
    raise exception 'Descreva o motivo do ajuste.' using errcode = '22023';
  end if;
  insert into public.lancamentos_financeiros (conta_id, data, valor, origem, descricao)
  values (p_conta, coalesce(p_data, public.hoje_brt()), round(p_valor,2), 'ajuste', p_descricao)
  returning id into v_id;
  perform public.registrar_auditoria('lancamentos_financeiros', v_id, 'ajuste_manual',
    jsonb_build_object('conta', p_conta, 'valor', round(p_valor,2), 'motivo', p_descricao));
  return v_id;
end; $$;
grant execute on function public.ajustar_conta_financeira(uuid, numeric, text, date) to authenticated;

-- ---------------------------------------------------------------------
-- 7) INTEGRAÇÃO AUTOMÁTICA (triggers de tabela — valem p/ qualquer caminho)
-- ---------------------------------------------------------------------
-- 7a) saldo inicial vira o 1º lançamento da conta
create or replace function public.fin_lancar_saldo_inicial()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.saldo_inicial, 0) <> 0 then
    insert into public.lancamentos_financeiros (conta_id, data, valor, origem, descricao)
    values (new.id, new.data_inicial, new.saldo_inicial, 'saldo_inicial', 'Saldo inicial da conta');
  end if;
  return new;
end; $$;
drop trigger if exists trg_fin_saldo_inicial on public.contas_financeiras;
create trigger trg_fin_saldo_inicial after insert on public.contas_financeiras
  for each row execute function public.fin_lancar_saldo_inicial();

-- 7b) venda Pix → lançamento na conta que recebe Pix (se configurada)
create or replace function public.fin_lancar_pix_venda()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conta uuid;
begin
  if new.tipo = 'venda' and new.meio = 'pix' then
    select id into v_conta from public.contas_financeiras where recebe_pix and ativo limit 1;
    if v_conta is not null then
      insert into public.lancamentos_financeiros (conta_id, valor, origem, descricao, venda_id)
      values (v_conta, new.valor, 'venda_pix',
              'Pix da venda ' || coalesce(new.venda_id::text,''), new.venda_id);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_fin_pix_venda on public.caixa_movimentos;
create trigger trg_fin_pix_venda after insert on public.caixa_movimentos
  for each row execute function public.fin_lancar_pix_venda();

-- 7c) recebimento (baixa/estorno de cartão e fiado, forma ≠ dinheiro) → conta padrão
--     (dinheiro entra na GAVETA — módulo caixa; banco só via transferência)
create or replace function public.fin_lancar_recebimento()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conta uuid; v_desc text;
begin
  if coalesce(new.forma_pagamento,'') <> 'dinheiro' then
    select conta_padrao_id into v_conta from public.financeiro_config where id = true;
    if v_conta is not null then
      v_desc := case when new.valor < 0 then 'Estorno de recebimento' else 'Recebimento' end;
      insert into public.lancamentos_financeiros (conta_id, valor, origem, descricao, recebimento_id)
      values (v_conta, new.valor, 'recebimento', v_desc, new.id);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_fin_recebimento on public.recebimentos;
create trigger trg_fin_recebimento after insert on public.recebimentos
  for each row execute function public.fin_lancar_recebimento();

-- 7d) pagamento (forma ≠ dinheiro) → lançamento NEGATIVO na conta padrão
create or replace function public.fin_lancar_pagamento()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conta uuid; v_desc text;
begin
  if coalesce(new.forma_pagamento,'') <> 'dinheiro' then
    select conta_padrao_id into v_conta from public.financeiro_config where id = true;
    if v_conta is not null then
      v_desc := case when new.valor < 0 then 'Estorno de pagamento' else 'Pagamento' end;
      insert into public.lancamentos_financeiros (conta_id, valor, origem, descricao, pagamento_id)
      values (v_conta, -new.valor, 'pagamento', v_desc, new.id);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_fin_pagamento on public.pagamentos;
create trigger trg_fin_pagamento after insert on public.pagamentos
  for each row execute function public.fin_lancar_pagamento();

-- ---------------------------------------------------------------------
-- 8) VIEW de saldos — security invoker (RLS já limita a gestão)
-- ---------------------------------------------------------------------
create or replace view public.vw_contas_saldo with (security_invoker = true) as
select
  c.id, c.nome, c.tipo, c.banco, c.recebe_pix, c.maquininha_id, c.ativo,
  coalesce(l.saldo, 0)                as saldo,
  coalesce(l.n_lancamentos, 0)        as n_lancamentos,
  coalesce(l.pendentes_conciliar, 0)  as pendentes_conciliar
from public.contas_financeiras c
left join lateral (
  select sum(valor) as saldo, count(*) as n_lancamentos,
         count(*) filter (where not conciliado) as pendentes_conciliar
  from public.lancamentos_financeiros lf where lf.conta_id = c.id
) l on true;
grant select on public.vw_contas_saldo to authenticated;

-- ---------------------------------------------------------------------
-- 9) REGISTRAR_VENDA v3 (fonte: 0005, a versão VIGENTE — inclui a integração
--    venda→caixa da Fase 5). Mudanças da Onda 2:
--    (a) data_venda usa hoje_brt() (fuso BRT; a 0013 só corrigiu o DEFAULT);
--    (b) cartão exige MAQUININHA quando houver alguma ativa cadastrada;
--    (c) MDR/prazo: taxas da maquininha primeiro; taxas_cartao é fallback.
--    Triggers da 0014 (caixa aberto etc.) continuam valendo — são de tabela.
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
  v_data        date := public.hoje_brt();
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
  v_maq         uuid;
  v_tem_maq     boolean;
  -- fiado
  v_prazo_fiado int;
  v_venc_fiado  date;
  -- cogs
  v_cogs_total  numeric(16,4);
  v_cogs_ok     boolean;
  v_sessao      uuid;  -- [FASE 5]
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

  -- [FASE 5] sessao de caixa aberta (a 0014 ja obriga a existir p/ INSERT em vendas)
  select id into v_sessao from public.caixa_sessoes where status = 'aberto' limit 1;

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

    -- ONDA 2: qual maquininha passou? (exigida quando houver alguma ativa)
    v_maq := nullif(p_payload#>>'{cartao,maquininha_id}','')::uuid;
    select exists(select 1 from public.maquininhas where ativo) into v_tem_maq;
    if v_tem_maq then
      if v_maq is null then
        raise exception 'Escolha a maquininha que passou o cartao.' using errcode = '22023';
      end if;
      if not exists(select 1 from public.maquininhas where id = v_maq and ativo) then
        raise exception 'Maquininha invalida ou inativa.' using errcode = '22023';
      end if;
    else
      v_maq := null;  -- sem cadastro: comportamento antigo
    end if;

    -- MDR/prazo: taxa da maquininha primeiro; fallback taxas_cartao (Fase 4)
    v_rate := null;
    if v_maq is not null then
      select percentual, prazo_dias into v_rate, v_prazo
        from public.maquininha_taxas
       where maquininha_id = v_maq and modalidade = v_modal and parcelas = v_parcelas and ativo;
    end if;
    if v_rate is null then
      select percentual, prazo_dias into v_rate, v_prazo
        from public.taxas_cartao
       where modalidade = v_modal and parcelas = v_parcelas and ativo;
    end if;
    if v_rate is null then
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
       set cartao_modalidade = v_modal, cartao_parcelas = v_parcelas, maquininha_id = v_maq
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
     set subtotal        = v_subtotal,
         desconto        = v_desconto,
         juros           = v_juros,
         total           = v_total,
         status          = v_status,
         caixa_sessao_id = v_sessao   -- [FASE 5]
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

  -- 8.10 [FASE 5] INTEGRACAO VENDA->CAIXA. So dinheiro/pix, com caixa aberto, total>0.
  if v_sessao is not null and v_forma in ('dinheiro','pix') and v_total > 0 then
    insert into public.caixa_movimentos (sessao_id, venda_id, tipo, meio, valor, observacoes)
    values (v_sessao, v_venda, 'venda', v_forma, v_total, 'Venda ' || v_venda::text);
  end if;

  return v_venda;
end;
$$;
grant execute on function public.registrar_venda(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 10) CONFERENCIA EM 3 PONTAS de uma sessão de caixa (gestão)
-- ---------------------------------------------------------------------
create or replace function public.conferencia_sessao(p_sessao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_dinheiro jsonb;
  v_pix      jsonb;
  v_cartao   jsonb;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Sem permissao.' using errcode = '42501';
  end if;

  -- Ponta 1: cédulas (contagem física — já registrada na sessão)
  select jsonb_build_object(
    'esperado',  esperado_dinheiro,
    'contado',   valor_contado,
    'diferenca', diferenca,
    'justificativa', justificativa_diferenca,
    'status', status)
  into v_dinheiro
  from public.caixa_sessoes where id = p_sessao;
  if v_dinheiro is null then
    raise exception 'Sessao de caixa nao encontrada.' using errcode = '22023';
  end if;

  -- Ponta 2: Pix — vendido na sessão × lançado na conta que recebe Pix
  select jsonb_build_object(
    'vendido', coalesce((
      select sum(cm.valor) from public.caixa_movimentos cm
      where cm.sessao_id = p_sessao and cm.tipo = 'venda' and cm.meio = 'pix'), 0),
    'lancado_na_conta', coalesce((
      select sum(lf.valor) from public.lancamentos_financeiros lf
      join public.caixa_movimentos cm on cm.venda_id = lf.venda_id
      where cm.sessao_id = p_sessao and lf.origem = 'venda_pix'), 0),
    'conta', (select nome from public.contas_financeiras where recebe_pix and ativo limit 1))
  into v_pix;

  -- Ponta 3: cartão POR MAQUININHA — bruto → taxa → líquido (+ já recebido)
  select coalesce(jsonb_agg(t order by t->>'maquininha'), '[]'::jsonb) into v_cartao
  from (
    select jsonb_build_object(
      'maquininha', coalesce(m.nome, 'Sem maquininha'),
      'vendas',     count(distinct v.id),
      'bruto',      sum(cr.valor_bruto),
      'taxa',       sum(cr.valor_taxa),
      'liquido',    sum(cr.valor_liquido),
      'recebido',   sum(cr.valor_recebido),
      'parcelas_abertas', count(*) filter (where cr.status = 'aberto')) as t
    from public.vendas v
    join public.contas_receber cr on cr.venda_id = v.id and cr.tipo = 'cartao'
    left join public.maquininhas m on m.id = v.maquininha_id
    where v.caixa_sessao_id = p_sessao and v.forma_pagamento = 'cartao'
      and v.status <> 'cancelada'
    group by m.nome
  ) x;

  return jsonb_build_object('dinheiro', v_dinheiro, 'pix', v_pix, 'cartao', v_cartao);
end; $$;
grant execute on function public.conferencia_sessao(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 11) RLS
-- ---------------------------------------------------------------------
alter table public.maquininhas            enable row level security;
alter table public.maquininha_taxas       enable row level security;
alter table public.contas_financeiras     enable row level security;
alter table public.lancamentos_financeiros enable row level security;
alter table public.transferencias         enable row level security;

-- MAQUININHAS: o PDV precisa listar (nome não é sensível); escrita gestão.
drop policy if exists maquininhas_select on public.maquininhas;
create policy maquininhas_select on public.maquininhas for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists maquininhas_write on public.maquininhas;
create policy maquininhas_write on public.maquininhas for all to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');

-- TAXAS por maquininha: MDR é sensível — SÓ GESTÃO (a RPC, owner, bypassa).
drop policy if exists maquininha_taxas_all on public.maquininha_taxas;
create policy maquininha_taxas_all on public.maquininha_taxas for all to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');

-- CONTAS / LANÇAMENTOS / TRANSFERÊNCIAS: financeiro — SÓ GESTÃO.
drop policy if exists contas_fin_all on public.contas_financeiras;
create policy contas_fin_all on public.contas_financeiras for all to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');

drop policy if exists lancamentos_select on public.lancamentos_financeiros;
create policy lancamentos_select on public.lancamentos_financeiros for select to authenticated
  using ((select public.meu_papel()) = 'gestao');
drop policy if exists lancamentos_update on public.lancamentos_financeiros;
create policy lancamentos_update on public.lancamentos_financeiros for update to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');
-- INSERT/DELETE: sem policy (só triggers/RPCs DEFINER escrevem; guard bloqueia DELETE).

drop policy if exists transferencias_select on public.transferencias;
create policy transferencias_select on public.transferencias for select to authenticated
  using ((select public.meu_papel()) = 'gestao');
-- escrita só pela RPC (owner).

-- ---------------------------------------------------------------------
-- 12) AUDITORIA — contas e maquininhas deixam rastro em mudanças sensíveis.
-- ---------------------------------------------------------------------
create or replace function public.auditar_contas_fin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.nome is distinct from old.nome or new.ativo is distinct from old.ativo
  or new.recebe_pix is distinct from old.recebe_pix then
    perform public.registrar_auditoria('contas_financeiras', new.id, 'update', jsonb_build_object(
      'antes',  jsonb_build_object('nome', old.nome, 'ativo', old.ativo, 'recebe_pix', old.recebe_pix),
      'depois', jsonb_build_object('nome', new.nome, 'ativo', new.ativo, 'recebe_pix', new.recebe_pix)));
  end if;
  return new;
end; $$;
drop trigger if exists trg_auditar_contas_fin on public.contas_financeiras;
create trigger trg_auditar_contas_fin after update on public.contas_financeiras
  for each row execute function public.auditar_contas_fin();

create or replace function public.auditar_maquininhas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.nome is distinct from old.nome or new.ativo is distinct from old.ativo then
    perform public.registrar_auditoria('maquininhas', new.id, 'update', jsonb_build_object(
      'antes',  jsonb_build_object('nome', old.nome, 'ativo', old.ativo),
      'depois', jsonb_build_object('nome', new.nome, 'ativo', new.ativo)));
  end if;
  return new;
end; $$;
drop trigger if exists trg_auditar_maquininhas on public.maquininhas;
create trigger trg_auditar_maquininhas after update on public.maquininhas
  for each row execute function public.auditar_maquininhas();
