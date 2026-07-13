-- =====================================================================
-- 0021 — LEVA G: resultado geral por período (padrão FPQ) + plano de contas
-- O "plano de contas" (categorias de despesa) já existe (despesa_categorias,
-- com CRUD gestão). Aqui entra o RELATÓRIO consolidado de resultado num período
-- flexível, com as despesas DETALHADAS por categoria. Mesma fórmula da DRE
-- mensal (vw_dre_mensal), para não haver dupla contagem:
--   resultado = lucro_bruto − despesas − taxas_cartao + juros_fiado
-- =====================================================================

create or replace function public.rel_resultado_geral(p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_receita   numeric;
  v_cmv       numeric;
  v_cmv_ok    boolean;
  v_taxas     numeric;
  v_juros     numeric;
  v_despesas  jsonb;
  v_desp_tot  numeric;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Sem permissao.' using errcode = '42501';
  end if;

  -- receita e juros (fiado) — vendas não canceladas no período
  select coalesce(sum(v.subtotal - v.desconto), 0), coalesce(sum(v.juros), 0)
    into v_receita, v_juros
  from public.vendas v
  where v.data_venda between p_inicio and p_fim and v.status <> 'cancelada';

  -- CMV (custo dos produtos vendidos) no período
  select coalesce(sum(vc.custo_total), 0), coalesce(bool_and(vc.custo_completo), true)
    into v_cmv, v_cmv_ok
  from public.vendas_custo vc
  join public.vendas v on v.id = vc.venda_id
  where v.data_venda between p_inicio and p_fim and v.status <> 'cancelada';

  -- MDR (taxas de cartão) das parcelas não canceladas no período
  select coalesce(sum(cr.valor_taxa), 0) into v_taxas
  from public.contas_receber cr
  join public.vendas v on v.id = cr.venda_id
  where v.data_venda between p_inicio and p_fim and cr.status <> 'cancelado';

  -- despesas por categoria (competência no período)
  select coalesce(jsonb_agg(jsonb_build_object('categoria', cat, 'total', tot) order by tot desc), '[]'::jsonb),
         coalesce(sum(tot), 0)
    into v_despesas, v_desp_tot
  from (
    select coalesce(dc.nome, 'Sem categoria') as cat, sum(cp.valor) as tot
    from public.contas_pagar cp
    left join public.despesa_categorias dc on dc.id = cp.categoria_id
    where cp.tipo = 'despesa' and cp.status <> 'cancelado'
      and cp.competencia between p_inicio and p_fim
    group by 1
  ) x;

  return jsonb_build_object(
    'receita', round(v_receita, 2),
    'cmv', round(v_cmv, 2),
    'cmv_completo', v_cmv_ok,
    'lucro_bruto', round(v_receita - v_cmv, 2),
    'taxas_cartao', round(v_taxas, 2),
    'juros_fiado', round(v_juros, 2),
    'despesas', v_despesas,
    'despesas_total', round(v_desp_tot, 2),
    'resultado', round(v_receita - v_cmv - v_desp_tot - v_taxas + v_juros, 2)
  );
end; $$;
grant execute on function public.rel_resultado_geral(date, date) to authenticated;
