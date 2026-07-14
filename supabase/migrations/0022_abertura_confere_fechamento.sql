-- =====================================================================
-- 0022 — A ABERTURA DO CAIXA CONFERE COM O FECHAMENTO ANTERIOR
--
-- Decisão do dono (14/07/2026): o dinheiro dorme na gaveta, então o que
-- sobrou no fechamento de ontem TEM que estar lá na abertura de hoje. Se não
-- estiver, é divergência da noite e ele quer VER.
--
-- ⚠️ De propósito NÃO pré-preenchemos a abertura com o fechamento anterior:
-- isso faria os dois números serem sempre iguais por construção e a
-- divergência noturna viraria invisível — justamente o contrário do objetivo.
-- A operadora CONTA às cegas (como já faz no fechamento), o sistema compara e
-- REVELA a diferença, exigindo justificativa. Mesma filosofia da 0014
-- (fechar com diferença exige justificativa).
-- =====================================================================

alter table public.caixa_sessoes
  add column if not exists valor_fechamento_anterior numeric(14,2),
  add column if not exists diferenca_abertura        numeric(14,2),
  add column if not exists justificativa_abertura    text;

comment on column public.caixa_sessoes.valor_fechamento_anterior is
  'Quanto a sessão anterior deixou na gaveta (o valor_contado dela). Null na 1ª sessão.';
comment on column public.caixa_sessoes.diferenca_abertura is
  'valor_abertura − valor_fechamento_anterior. Negativo = faltou dinheiro na gaveta.';

-- Quanto sobrou na gaveta no último fechamento. SECURITY DEFINER porque a
-- operação precisa da checagem, mas NÃO deve poder ler a sessão fechada
-- inteira. Retorna só o número — e o app só chama isto DEPOIS que a pessoa
-- digitou a contagem dela (senão vazaria a resposta antes da pergunta).
create or replace function public.ultimo_fechamento_caixa()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select cs.valor_contado
  from public.caixa_sessoes cs
  where cs.status = 'fechado' and cs.valor_contado is not null
  order by cs.fechado_em desc, cs.aberto_em desc  -- desempate determinístico
  limit 1;
$$;
revoke all on function public.ultimo_fechamento_caixa() from public;
grant execute on function public.ultimo_fechamento_caixa() to authenticated;

-- abrir_caixa recriada: confere contra o fechamento anterior e exige
-- justificativa quando não bate. (Base: 0005, mesma assinatura e permissões.)
create or replace function public.abrir_caixa(p_valor numeric default 0, p_obs text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel     text;
  v_id        uuid;
  v_anterior  numeric(14,2);
  v_valor     numeric(14,2);
  v_dif       numeric(14,2);
  v_obs       text;
begin
  v_papel := (select public.meu_papel());
  if v_papel not in ('operacao','gestao') then
    raise exception 'Sem permissao para abrir o caixa.' using errcode = '42501';
  end if;
  if exists (select 1 from public.caixa_sessoes where status = 'aberto') then
    raise exception 'Ja existe um caixa aberto. Feche o atual antes de abrir outro.'
      using errcode = '22023';
  end if;

  v_valor := greatest(round(coalesce(p_valor, 0), 2), 0);
  v_obs   := nullif(btrim(coalesce(p_obs, '')), '');

  -- o que sobrou na gaveta no fechamento anterior (null na 1ª sessão)
  select cs.valor_contado into v_anterior
  from public.caixa_sessoes cs
  where cs.status = 'fechado' and cs.valor_contado is not null
  order by cs.fechado_em desc, cs.aberto_em desc  -- desempate determinístico
  limit 1;

  if v_anterior is not null then
    v_dif := v_valor - v_anterior;
    -- não bateu com a gaveta de ontem: precisa dizer o que houve
    if v_dif <> 0 and v_obs is null then
      raise exception 'A abertura nao bate com o fechamento anterior. Explique a diferenca para poder abrir.'
        using errcode = '22023';
    end if;
  else
    v_dif := null;  -- primeira sessão: não há com o que comparar
  end if;

  insert into public.caixa_sessoes (
    status, valor_abertura, observacoes_abertura, aberto_por,
    valor_fechamento_anterior, diferenca_abertura, justificativa_abertura
  )
  values (
    'aberto', v_valor, v_obs, auth.uid(),
    v_anterior, v_dif,
    case when coalesce(v_dif, 0) <> 0 then v_obs end
  )
  returning id into v_id;

  -- rastro: divergência da noite entra na auditoria
  if coalesce(v_dif, 0) <> 0 then
    insert into public.auditoria (tabela, registro_id, acao, dados)
    values ('caixa_sessoes', v_id, 'abertura_divergente',
            jsonb_build_object(
              'fechamento_anterior', v_anterior,
              'contado_na_abertura', v_valor,
              'diferenca', v_dif,
              'justificativa', v_obs));
  end if;

  return v_id;
end;
$$;
grant execute on function public.abrir_caixa(numeric, text) to authenticated;
