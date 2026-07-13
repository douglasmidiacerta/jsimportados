-- =====================================================================
-- 0014_onda1_regras_caixa.sql — ONDA 1 (parte 2): regras de caixa e estoque
-- IDEMPOTENTE. Implementa via TRIGGERS DE TABELA (mais forte que mexer nas
-- RPCs: vale para qualquer caminho de escrita, e não recria funções antigas):
--   R1: TODA venda (dinheiro, pix, cartao, fiado) exige CAIXA ABERTO, e fica
--       vinculada à sessão (vendas.caixa_sessao_id sempre preenchido).
--   R2: produto com vender_sem_estoque=false NÃO vende além do saldo.
--   R3: fechamento de caixa com diferença ≠ 0 exige JUSTIFICATIVA
--       (observações de fechamento), copiada para justificativa_diferenca.
-- Regras do dono: docs/regras-erp.md §5. Depende de: 0005 (caixa), 0013.
-- =====================================================================

-- ---------------------------------------------------------------------
-- R1) Venda só com caixa aberto (BEFORE INSERT em vendas)
-- ---------------------------------------------------------------------
create or replace function public.vendas_exige_caixa()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_sessao uuid;
begin
  select id into v_sessao from public.caixa_sessoes where status = 'aberto' limit 1;
  if v_sessao is null then
    raise exception 'Abra o caixa antes de vender.' using errcode = '22023';
  end if;
  new.caixa_sessao_id := coalesce(new.caixa_sessao_id, v_sessao);
  return new;
end; $$;
drop trigger if exists trg_vendas_exige_caixa on public.vendas;
create trigger trg_vendas_exige_caixa before insert on public.vendas
  for each row execute function public.vendas_exige_caixa();

-- ---------------------------------------------------------------------
-- R2) vender_sem_estoque=false trava a saída de venda além do saldo
--     (BEFORE INSERT em movimentacoes_estoque, só para saída de venda)
-- ---------------------------------------------------------------------
create or replace function public.estoque_venda_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pode boolean; v_saldo numeric(14,3); v_nome text;
begin
  if new.tipo = 'saida' and new.origem = 'venda' then
    select vender_sem_estoque, estoque_atual, nome into v_pode, v_saldo, v_nome
      from public.produtos where id = new.produto_id for update;
    if v_pode = false and (v_saldo + new.quantidade) < -0.0005 then
      raise exception 'Sem estoque de "%" (restam %). Este produto nao vende sem estoque.',
        v_nome, v_saldo using errcode = '22023';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_estoque_venda_guard on public.movimentacoes_estoque;
create trigger trg_estoque_venda_guard before insert on public.movimentacoes_estoque
  for each row execute function public.estoque_venda_guard();

-- ---------------------------------------------------------------------
-- R3) Fechamento com diferença exige justificativa (BEFORE UPDATE)
--     A justificativa é o campo de observações do fechamento (a operadora
--     já tem esse campo na tela); copiamos para justificativa_diferenca.
-- ---------------------------------------------------------------------
create or replace function public.caixa_exige_justificativa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'aberto' and new.status = 'fechado'
     and new.diferenca is not null and new.diferenca <> 0 then
    if coalesce(btrim(coalesce(new.justificativa_diferenca, new.observacoes_fechamento)), '') = '' then
      raise exception 'A diferenca de % precisa de justificativa: escreva o motivo nas observacoes do fechamento.',
        new.diferenca using errcode = '22023';
    end if;
    new.justificativa_diferenca := coalesce(
      nullif(btrim(coalesce(new.justificativa_diferenca, '')), ''),
      btrim(new.observacoes_fechamento));
    perform public.registrar_auditoria('caixa_sessoes', new.id, 'fechamento_com_diferenca',
      jsonb_build_object('diferenca', new.diferenca, 'justificativa', new.justificativa_diferenca));
  end if;
  return new;
end; $$;
drop trigger if exists trg_caixa_exige_justificativa on public.caixa_sessoes;
create trigger trg_caixa_exige_justificativa before update on public.caixa_sessoes
  for each row execute function public.caixa_exige_justificativa();
-- (Fim da 0014)
