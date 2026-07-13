-- =====================================================================
-- 0018 — LEVA C: código de barras + código sequencial + estoque mínimo
-- Decisão do dono (inventário FPQ): habilitar código de barras (EAN real OU
-- gerado sequencial), código interno sequencial do produto, ponto de reposição
-- (estoque mínimo). Margem % como entrada e o relatório de patrimônio são no
-- app (calculadora na ficha / relatório custo×venda) — sem schema novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CÓDIGO DE BARRAS — EAN digitado OU gerado (EAN-13 interno) no app.
--    Único quando preenchido (dois produtos não compartilham o mesmo código).
-- ---------------------------------------------------------------------
alter table public.produtos add column if not exists codigo_barras text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='produtos_codigo_barras_fmt') then
    alter table public.produtos add constraint produtos_codigo_barras_fmt
      check (codigo_barras is null or codigo_barras ~ '^[0-9]{6,14}$');
  end if;
end $$;
create unique index if not exists produtos_codigo_barras_uq
  on public.produtos (codigo_barras) where codigo_barras is not null;

-- ---------------------------------------------------------------------
-- 2) CÓDIGO SEQUENCIAL interno — número curto do produto (P-000123 no app).
--    Backfill em ordem de criação; sequência a partir daí.
-- ---------------------------------------------------------------------
alter table public.produtos add column if not exists codigo_sequencial bigint;
create sequence if not exists public.produto_codigo_seq;
do $$
begin
  if exists (select 1 from public.produtos where codigo_sequencial is null) then
    with ord as (select id, row_number() over (order by criado_em, id) rn from public.produtos)
    update public.produtos p set codigo_sequencial = ord.rn from ord
     where ord.id = p.id and p.codigo_sequencial is null;
  end if;
end $$;
select setval('public.produto_codigo_seq', coalesce((select max(codigo_sequencial) from public.produtos), 0), true);
alter table public.produtos alter column codigo_sequencial set default nextval('public.produto_codigo_seq');
alter table public.produtos alter column codigo_sequencial set not null;
create unique index if not exists produtos_codigo_sequencial_uq on public.produtos (codigo_sequencial);

-- ---------------------------------------------------------------------
-- 3) ESTOQUE MÍNIMO — ponto de reposição. 0 = não avisa.
-- ---------------------------------------------------------------------
alter table public.produtos add column if not exists estoque_minimo numeric(14,3) not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='produtos_estoque_minimo_nn') then
    alter table public.produtos add constraint produtos_estoque_minimo_nn
      check (estoque_minimo >= 0);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4) RELATÓRIO PATRIMÔNIO — valor do estoque a custo e a preço de venda.
--    Só gestão (guarda interna). custo médio vem de produtos_custo.
-- ---------------------------------------------------------------------
create or replace function public.rel_patrimonio()
returns table (
  produto_id     uuid,
  nome           text,
  codigo_sequencial bigint,
  estoque        numeric,
  estoque_minimo numeric,
  custo_medio    numeric,
  preco_venda    numeric,
  valor_custo    numeric,   -- estoque × custo médio
  valor_venda    numeric,   -- estoque × preço de venda
  abaixo_minimo  boolean
) language sql stable security invoker set search_path = public as $$
  select
    p.id, p.nome, p.codigo_sequencial,
    p.estoque_atual, p.estoque_minimo,
    pc.custo, p.preco_venda,
    round(p.estoque_atual * coalesce(pc.custo, 0), 2),
    round(p.estoque_atual * coalesce(p.preco_venda, 0), 2),
    (p.estoque_minimo > 0 and p.estoque_atual <= p.estoque_minimo)
  from public.produtos p
  left join public.produtos_custo pc on pc.produto_id = p.id
  where p.ativo
    and (select public.meu_papel()) = 'gestao'
  order by p.nome;
$$;
grant execute on function public.rel_patrimonio() to authenticated;
