-- =====================================================================
-- 0016 — ONDA 2 (parte 2): extrato importado (OFX/CSV) + conciliação
-- Casa as linhas do banco (extrato_importado) com os lançamentos internos
-- (lancamentos_financeiros). Base já pronta na 0015 (contas + ledger com
-- coluna `conciliado`). O parse do arquivo é no app; aqui entram a tabela,
-- as RPCs de importar/conciliar e a função de fluxo de caixa por período.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) EXTRATO IMPORTADO — uma linha do banco (OFX/CSV).
--    fitid: id único da transação no OFX (dedupe). Para CSV, o app manda
--    um hash estável (data|valor|descricao|seq) para não duplicar reimport.
-- ---------------------------------------------------------------------
create table if not exists public.extrato_importado (
  id            uuid primary key default gen_random_uuid(),
  conta_id      uuid not null references public.contas_financeiras(id) on delete cascade,
  data          date not null,
  valor         numeric(14,2) not null,      -- assinado: + crédito, - débito
  descricao     text,
  fitid         text not null,               -- id do banco (ou hash do CSV)
  lancamento_id uuid references public.lancamentos_financeiros(id) on delete set null,
  importado_em  timestamptz not null default now(),
  criado_por    uuid references auth.users(id) on delete set null default auth.uid(),
  constraint ei_valor_nz check (valor <> 0)
);
-- nunca importa a mesma linha 2x na mesma conta
create unique index if not exists ei_conta_fitid_uq on public.extrato_importado (conta_id, fitid);
create index if not exists ei_conta_data_idx on public.extrato_importado (conta_id, data desc);
create index if not exists ei_pendentes_idx on public.extrato_importado (conta_id) where lancamento_id is null;
-- um lançamento só casa com UMA linha do extrato
create unique index if not exists ei_lancamento_uq on public.extrato_importado (lancamento_id) where lancamento_id is not null;

-- ---------------------------------------------------------------------
-- 2) IMPORTAR — insere linhas ignorando duplicatas (fitid). Retorna contagem.
--    p_linhas: jsonb [{data, valor, descricao, fitid}]
-- ---------------------------------------------------------------------
create or replace function public.importar_extrato(p_conta uuid, p_linhas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_inseridas int;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Sem permissao.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.contas_financeiras where id = p_conta) then
    raise exception 'Conta invalida.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_linhas) <> 'array' then
    raise exception 'Nada para importar.' using errcode = '22023';
  end if;
  v_total := jsonb_array_length(p_linhas);

  with novas as (
    insert into public.extrato_importado (conta_id, data, valor, descricao, fitid)
    select
      p_conta,
      (l->>'data')::date,
      round((l->>'valor')::numeric, 2),
      nullif(btrim(coalesce(l->>'descricao','')), ''),
      l->>'fitid'
    from jsonb_array_elements(p_linhas) as l
    where coalesce(round((l->>'valor')::numeric, 2), 0) <> 0
      and nullif(l->>'fitid','') is not null
    on conflict (conta_id, fitid) do nothing
    returning 1
  )
  select count(*) into v_inseridas from novas;

  perform public.registrar_auditoria('extrato_importado', p_conta, 'importacao',
    jsonb_build_object('recebidas', v_total, 'inseridas', v_inseridas));

  return jsonb_build_object('recebidas', v_total, 'inseridas', v_inseridas,
                            'duplicadas', v_total - v_inseridas);
end; $$;
grant execute on function public.importar_extrato(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 3) SUGESTÕES — para cada linha não conciliada, um lançamento candidato
--    (mesma conta, MESMO valor, data dentro de ±3 dias, ainda não conciliado).
--    Pega o candidato de data mais próxima. Só gestão (função stable).
-- ---------------------------------------------------------------------
create or replace function public.sugestoes_conciliacao(p_conta uuid)
returns table (
  extrato_id      uuid,
  extrato_data    date,
  extrato_valor   numeric,
  extrato_desc    text,
  lancamento_id   uuid,
  lancamento_data date,
  lancamento_desc text,
  dias            int
) language sql stable security definer set search_path = public as $$
  select e.id, e.data, e.valor, e.descricao,
         lf.id, lf.data, lf.descricao,
         abs(e.data - lf.data) as dias
  from public.extrato_importado e
  join lateral (
    select lf.*
    from public.lancamentos_financeiros lf
    where lf.conta_id = e.conta_id
      and not lf.conciliado
      and lf.valor = e.valor
      and abs(lf.data - e.data) <= 3
      and not exists (select 1 from public.extrato_importado x where x.lancamento_id = lf.id)
    order by abs(lf.data - e.data), lf.criado_em
    limit 1
  ) lf on true
  where e.conta_id = p_conta
    and e.lancamento_id is null
    and (select public.meu_papel()) = 'gestao'
  order by e.data;
$$;
grant execute on function public.sugestoes_conciliacao(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4) CONCILIAR / DESCONCILIAR — liga os dois lados e marca `conciliado`.
--    (o guard da 0015 permite UPDATE de `conciliado` no lançamento)
-- ---------------------------------------------------------------------
create or replace function public.conciliar_linha(p_extrato uuid, p_lancamento uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_conta_e uuid; v_conta_l uuid; v_val_e numeric; v_val_l numeric;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Sem permissao.' using errcode = '42501';
  end if;
  select conta_id, valor into v_conta_e, v_val_e from public.extrato_importado where id = p_extrato;
  select conta_id, valor into v_conta_l, v_val_l from public.lancamentos_financeiros where id = p_lancamento;
  if v_conta_e is null or v_conta_l is null then
    raise exception 'Linha do extrato ou lancamento nao encontrado.' using errcode = '22023';
  end if;
  if v_conta_e <> v_conta_l then
    raise exception 'A linha e o lancamento sao de contas diferentes.' using errcode = '22023';
  end if;
  if v_val_e <> v_val_l then
    raise exception 'Os valores nao batem (extrato % x lancamento %).', v_val_e, v_val_l using errcode = '22023';
  end if;
  if exists (select 1 from public.extrato_importado where lancamento_id = p_lancamento and id <> p_extrato) then
    raise exception 'Esse lancamento ja foi conciliado com outra linha.' using errcode = '22023';
  end if;

  update public.extrato_importado set lancamento_id = p_lancamento where id = p_extrato;
  update public.lancamentos_financeiros set conciliado = true, conciliado_em = now() where id = p_lancamento;
end; $$;
grant execute on function public.conciliar_linha(uuid, uuid) to authenticated;

create or replace function public.desconciliar_linha(p_extrato uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_lanc uuid;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Sem permissao.' using errcode = '42501';
  end if;
  select lancamento_id into v_lanc from public.extrato_importado where id = p_extrato;
  update public.extrato_importado set lancamento_id = null where id = p_extrato;
  if v_lanc is not null then
    update public.lancamentos_financeiros set conciliado = false, conciliado_em = null where id = v_lanc;
  end if;
end; $$;
grant execute on function public.desconciliar_linha(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5) FLUXO DE CAIXA por período e conta (modelo MarketUp).
--    Para cada conta: saldo_inicial (antes de p_inicio) + entradas + saidas
--    no período = saldo_final. Só gestão (guarda interna).
-- ---------------------------------------------------------------------
create or replace function public.rel_fluxo_caixa(p_inicio date, p_fim date)
returns table (
  conta_id      uuid,
  conta_nome    text,
  saldo_inicial numeric,
  entradas      numeric,
  saidas        numeric,
  saldo_final   numeric
) language sql stable security invoker set search_path = public as $$
  select
    c.id, c.nome,
    coalesce(sum(lf.valor) filter (where lf.data < p_inicio), 0)                              as saldo_inicial,
    coalesce(sum(lf.valor) filter (where lf.data between p_inicio and p_fim and lf.valor > 0), 0) as entradas,
    coalesce(sum(lf.valor) filter (where lf.data between p_inicio and p_fim and lf.valor < 0), 0) as saidas,
    coalesce(sum(lf.valor) filter (where lf.data <= p_fim), 0)                                as saldo_final
  from public.contas_financeiras c
  left join public.lancamentos_financeiros lf on lf.conta_id = c.id
  where (select public.meu_papel()) = 'gestao'
  group by c.id, c.nome
  order by c.nome;
$$;
grant execute on function public.rel_fluxo_caixa(date, date) to authenticated;

-- ---------------------------------------------------------------------
-- 6) RLS — extrato importado é financeiro: SÓ GESTÃO.
-- ---------------------------------------------------------------------
alter table public.extrato_importado enable row level security;
drop policy if exists extrato_select on public.extrato_importado;
create policy extrato_select on public.extrato_importado for select to authenticated
  using ((select public.meu_papel()) = 'gestao');
-- INSERT/UPDATE só via RPC (owner). Sem policies de escrita.
