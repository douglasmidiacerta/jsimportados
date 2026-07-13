-- =====================================================================
-- 0019 — LEVA D: Cliente 2.0 (endereço, e-mail) + LIMITE DE CRÉDITO no fiado
-- Furo F5 (regras-erp): fiado sem teto e sem cliente bloqueado. Agora:
--   • cliente pode ficar 'bloqueado' → não vende fiado (valendo, no banco);
--   • limite_credito (opcional) → a soma do fiado em aberto + a nova venda não
--     pode passar do limite. Travado por TRIGGER em contas_receber (vale para
--     qualquer caminho: PDV, converter orçamento…). Dinheiro/Pix/cartão livres.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CLIENTES — dados de contato/endereço + crédito. (herdam a RLS de 0002)
-- ---------------------------------------------------------------------
alter table public.clientes
  add column if not exists email          text,
  add column if not exists cep            text,
  add column if not exists logradouro     text,
  add column if not exists numero         text,
  add column if not exists complemento    text,
  add column if not exists bairro         text,
  add column if not exists cidade         text,
  add column if not exists uf             text,
  add column if not exists limite_credito numeric(14,2),   -- null = sem limite
  add column if not exists situacao       text not null default 'geral';

do $$ begin
  if not exists (select 1 from pg_constraint where conname='clientes_situacao_ok') then
    alter table public.clientes add constraint clientes_situacao_ok
      check (situacao in ('geral','bloqueado'));
  end if;
  if not exists (select 1 from pg_constraint where conname='clientes_limite_nn') then
    alter table public.clientes add constraint clientes_limite_nn
      check (limite_credito is null or limite_credito >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='clientes_uf_fmt') then
    alter table public.clientes add constraint clientes_uf_fmt
      check (uf is null or uf ~ '^[A-Za-z]{2}$');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) SALDO DEVEDOR (fiado em aberto por cliente) — view p/ UI e trigger.
-- ---------------------------------------------------------------------
create or replace view public.vw_cliente_fiado with (security_invoker = true) as
select
  c.id as cliente_id,
  coalesce(sum(cr.valor_liquido - cr.valor_recebido)
           filter (where cr.tipo = 'fiado' and cr.status = 'aberto'), 0) as saldo_devedor
from public.clientes c
left join public.contas_receber cr on cr.cliente_id = c.id
group by c.id;
grant select on public.vw_cliente_fiado to authenticated;

-- ---------------------------------------------------------------------
-- 3) TRIGGER — trava o fiado no INSERT do recebível (BEFORE INSERT).
--    Roda dentro da registrar_venda/converter_orcamento; se barrar, a venda
--    inteira volta atrás (atômico). SECURITY DEFINER p/ ler clientes/CR.
-- ---------------------------------------------------------------------
create or replace function public.fiado_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sit   text;
  v_lim   numeric;
  v_nome  text;
  v_saldo numeric;
begin
  if new.tipo <> 'fiado' then
    return new;
  end if;
  if new.cliente_id is null then
    raise exception 'A venda fiado exige um cliente.' using errcode = '22023';
  end if;

  select situacao, limite_credito, nome into v_sit, v_lim, v_nome
    from public.clientes where id = new.cliente_id;

  if v_sit = 'bloqueado' then
    raise exception 'Cliente "%" esta bloqueado para fiado.', coalesce(v_nome,'')
      using errcode = '22023';
  end if;

  if v_lim is not null then
    select coalesce(sum(valor_liquido - valor_recebido), 0) into v_saldo
      from public.contas_receber
     where cliente_id = new.cliente_id and tipo = 'fiado' and status = 'aberto';
    if v_saldo + new.valor_liquido > v_lim + 0.0005 then
      raise exception 'Fiado passa do limite de "%": limite %, ja deve %, esta venda %.',
        coalesce(v_nome,''), v_lim, v_saldo, new.valor_liquido using errcode = '22023';
    end if;
  end if;

  return new;
end; $$;
drop trigger if exists trg_fiado_guard on public.contas_receber;
create trigger trg_fiado_guard before insert on public.contas_receber
  for each row execute function public.fiado_guard();

-- ---------------------------------------------------------------------
-- 4) AUDITORIA — mudança de situação/limite do cliente deixa rastro.
-- ---------------------------------------------------------------------
create or replace function public.auditar_clientes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.situacao is distinct from old.situacao
  or new.limite_credito is distinct from old.limite_credito then
    perform public.registrar_auditoria('clientes', new.id, 'update', jsonb_build_object(
      'antes',  jsonb_build_object('situacao', old.situacao, 'limite_credito', old.limite_credito),
      'depois', jsonb_build_object('situacao', new.situacao, 'limite_credito', new.limite_credito)));
  end if;
  return new;
end; $$;
drop trigger if exists trg_auditar_clientes on public.clientes;
create trigger trg_auditar_clientes after update on public.clientes
  for each row execute function public.auditar_clientes();
