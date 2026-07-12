-- =====================================================================
-- 0008_fase8_relatorios.sql  — FASE 8: RELATORIOS & ANALISE
-- IDEMPOTENTE (rodar como owner via Node pg). GESTAO-ONLY, SO LEITURA.
-- NAO cria tabela; NAO altera registrar_venda/registrar_compra; NAO recria
-- objetos das fases anteriores (vw_dre_mensal, vw_caixa_resumo, vw_extrato,
-- hoje_brt, meu_papel permanecem intactos).
--
-- Padrao (identico Fases 6/7): FUNCTIONS parametrizadas por periodo (VIEW nao
-- aceita parametro) + VIEW p/ snapshot. TODAS security invoker + GUARDA INTERNA
-- (select public.meu_papel())='gestao'. Nenhuma SECURITY DEFINER (evita bypass
-- de RLS). Todas STABLE.
--
-- CONSISTENCIA COM A DRE (vw_dre_mensal): receita = sum(subtotal-desconto);
--   lucro de periodo = sum(subtotal-desconto) - sum(coalesce(custo_total,0)).
--   Lucratividade POR PRODUTO usa sum(subtotal) SEM desconto (desconto e
--   nivel-venda, nao alocavel a item). Juros(fiado) e MDR(cartao) NUNCA entram
--   em lucratividade (sao financeiros, ja na DRE). Margem = fracao 0..1.
-- ABC e agregacao de em-aberto/auditoria-de-caixa sao feitas no data layer (JS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) LUCRATIVIDADE POR PRODUTO (base tambem da Curva ABC de produtos).
-- ---------------------------------------------------------------------
drop function if exists public.rel_lucratividade_produtos(date, date);
create function public.rel_lucratividade_produtos(p_inicio date, p_fim date)
returns table (
  produto_id       uuid,
  nome             text,
  quantidade       numeric,
  faturamento      numeric,
  custo            numeric,
  lucro            numeric,
  margem           numeric,      -- fracao 0..1 (UI *100)
  custo_incompleto boolean
) language sql stable security invoker set search_path = public as $$
  select
    vi.produto_id,
    max(p.nome)                                                    as nome,
    sum(vi.quantidade)                                             as quantidade,
    round(sum(vi.subtotal), 2)                                     as faturamento,
    round(sum(coalesce(vic.custo_total, 0)), 2)                    as custo,
    round(sum(vi.subtotal) - sum(coalesce(vic.custo_total, 0)), 2) as lucro,
    case when sum(vi.subtotal) > 0
         then round((sum(vi.subtotal) - sum(coalesce(vic.custo_total, 0)))
                    / sum(vi.subtotal), 4)
         else 0 end                                                as margem,
    bool_or(vic.custo_unitario is null)                            as custo_incompleto
  from public.vendas v
  join public.venda_itens vi             on vi.venda_id = v.id
  left join public.venda_itens_custo vic on vic.venda_item_id = vi.id
  join public.produtos p                 on p.id = vi.produto_id
  where v.data_venda between p_inicio and p_fim
    and (select public.meu_papel()) = 'gestao'   -- guarda anti-vazamento
  group by vi.produto_id;
$$;
grant execute on function public.rel_lucratividade_produtos(date, date) to authenticated;

-- ---------------------------------------------------------------------
-- 2a) VENDAS DO PERIODO — RESUMO (bate EXATO com vw_dre_mensal no range).
-- ---------------------------------------------------------------------
drop function if exists public.rel_vendas_resumo(date, date);
create function public.rel_vendas_resumo(p_inicio date, p_fim date)
returns table (
  n_vendas       bigint,
  faturamento    numeric,
  custo          numeric,
  lucro          numeric,
  desconto       numeric,
  juros          numeric,
  ticket_medio   numeric,
  custo_completo boolean
) language sql stable security invoker set search_path = public as $$
  select
    count(*)                                                        as n_vendas,
    round(coalesce(sum(v.subtotal - v.desconto), 0), 2)            as faturamento,
    round(coalesce(sum(coalesce(vc.custo_total, 0)), 0), 2)        as custo,
    round(coalesce(sum(v.subtotal - v.desconto), 0)
          - coalesce(sum(coalesce(vc.custo_total, 0)), 0), 2)      as lucro,
    round(coalesce(sum(v.desconto), 0), 2)                         as desconto,
    round(coalesce(sum(v.juros), 0), 2)                            as juros,
    case when count(*) > 0
         then round(coalesce(sum(v.subtotal - v.desconto), 0) / count(*), 2)
         else 0 end                                                as ticket_medio,
    coalesce(bool_and(coalesce(vc.custo_completo, true)), true)    as custo_completo
  from public.vendas v
  left join public.vendas_custo vc on vc.venda_id = v.id
  where v.data_venda between p_inicio and p_fim
    and (select public.meu_papel()) = 'gestao';
$$;
grant execute on function public.rel_vendas_resumo(date, date) to authenticated;

-- 2b) VENDAS POR DIA (serie p/ grafico de barras).
drop function if exists public.rel_vendas_por_dia(date, date);
create function public.rel_vendas_por_dia(p_inicio date, p_fim date)
returns table (
  dia date, n_vendas bigint, faturamento numeric, lucro numeric
) language sql stable security invoker set search_path = public as $$
  select
    v.data_venda                                                   as dia,
    count(*)                                                       as n_vendas,
    round(coalesce(sum(v.subtotal - v.desconto), 0), 2)           as faturamento,
    round(coalesce(sum(v.subtotal - v.desconto), 0)
          - coalesce(sum(coalesce(vc.custo_total, 0)), 0), 2)     as lucro
  from public.vendas v
  left join public.vendas_custo vc on vc.venda_id = v.id
  where v.data_venda between p_inicio and p_fim
    and (select public.meu_papel()) = 'gestao'
  group by v.data_venda
  order by v.data_venda;
$$;
grant execute on function public.rel_vendas_por_dia(date, date) to authenticated;

-- 2c) VENDAS POR FORMA DE PAGAMENTO.
drop function if exists public.rel_vendas_por_forma(date, date);
create function public.rel_vendas_por_forma(p_inicio date, p_fim date)
returns table (
  forma text, n_vendas bigint, faturamento numeric, lucro numeric
) language sql stable security invoker set search_path = public as $$
  select
    v.forma_pagamento                                              as forma,
    count(*)                                                       as n_vendas,
    round(coalesce(sum(v.subtotal - v.desconto), 0), 2)           as faturamento,
    round(coalesce(sum(v.subtotal - v.desconto), 0)
          - coalesce(sum(coalesce(vc.custo_total, 0)), 0), 2)     as lucro
  from public.vendas v
  left join public.vendas_custo vc on vc.venda_id = v.id
  where v.data_venda between p_inicio and p_fim
    and (select public.meu_papel()) = 'gestao'
  group by v.forma_pagamento
  order by 3 desc;
$$;
grant execute on function public.rel_vendas_por_forma(date, date) to authenticated;

-- ---------------------------------------------------------------------
-- 3) ABC DE ESTOQUE — VALOR PARADO (snapshot; sem periodo => VIEW).
--    valor_parado = estoque_atual * produtos_custo.custo (custo medio).
--    custo NULL => valor_parado 0 + flag custo_ausente.
-- ---------------------------------------------------------------------
drop view if exists public.vw_rel_estoque_parado;
create view public.vw_rel_estoque_parado with (security_invoker = true) as
select
  p.id                                                as produto_id,
  p.nome,
  p.estoque_atual,
  pc.custo,
  round(p.estoque_atual * coalesce(pc.custo, 0), 2)   as valor_parado,
  (pc.custo is null)                                  as custo_ausente
from public.produtos p
left join public.produtos_custo pc on pc.produto_id = p.id
where p.ativo
  and p.estoque_atual <> 0
  and (select public.meu_papel()) = 'gestao'          -- guarda anti-vazamento
order by valor_parado desc;
grant select on public.vw_rel_estoque_parado to authenticated;

-- ---------------------------------------------------------------------
-- 4) ABC DE CLIENTES por periodo (faturamento E lucro; 2 classificacoes JS).
--    So clientes IDENTIFICADOS (cliente_id not null); walk-in fica fora.
-- ---------------------------------------------------------------------
drop function if exists public.rel_clientes_periodo(date, date);
create function public.rel_clientes_periodo(p_inicio date, p_fim date)
returns table (
  cliente_id     uuid,
  nome           text,
  n_compras      bigint,
  faturamento    numeric,
  lucro          numeric,
  ticket_medio   numeric,
  custo_completo boolean
) language sql stable security invoker set search_path = public as $$
  select
    v.cliente_id,
    max(c.nome)                                                    as nome,
    count(*)                                                       as n_compras,
    round(coalesce(sum(v.subtotal - v.desconto), 0), 2)           as faturamento,
    round(coalesce(sum(v.subtotal - v.desconto), 0)
          - coalesce(sum(coalesce(vc.custo_total, 0)), 0), 2)     as lucro,
    case when count(*) > 0
         then round(coalesce(sum(v.subtotal - v.desconto), 0) / count(*), 2)
         else 0 end                                                as ticket_medio,
    coalesce(bool_and(coalesce(vc.custo_completo, true)), true)    as custo_completo
  from public.vendas v
  join public.clientes c           on c.id = v.cliente_id
  left join public.vendas_custo vc on vc.venda_id = v.id
  where v.cliente_id is not null
    and v.data_venda between p_inicio and p_fim
    and (select public.meu_papel()) = 'gestao'
  group by v.cliente_id;
$$;
grant execute on function public.rel_clientes_periodo(date, date) to authenticated;

-- ---------------------------------------------------------------------
-- GRUPO 4 (EM ABERTO + AUDITORIA DE CAIXA): SEM objetos novos.
--   Reusa no data layer: listarContasReceber('aberto') / listarContasPagar
--   ({status:'aberto'}) e listarSessoesCaixa(). Tabelas base sao RLS gestao-only.
-- (Fim da 0008)
