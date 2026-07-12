-- =====================================================================
-- 0011_produto_2_0.sql — cadastro de produto ampliado + fundação da loja virtual
-- IDEMPOTENTE. Adiciona: subcategorias (hierarquia em categorias), marca/modelo,
-- preço de atacado + qtde mínima, custo da última compra (além do médio),
-- galeria de fotos (produto_fotos) e campos da loja virtual
-- (ativo-na-loja, destaque-home, descrição/garantia/itens/especificações).
-- Depende de: categorias, produtos, produtos_custo, meu_papel(),
--   aplicar_movimentacao (recriada aqui), produtos_operacao_guard (recriada aqui).
-- ISOLAMENTO: custo (médio e última compra) segue só-gestão (produtos_custo);
--   preços de atacado NÃO são sensíveis (como preco_venda). Margens são
--   calculadas na tela da gestão, nunca trafegam para o balcão.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CATEGORIAS — hierarquia de 2 níveis (categoria -> subcategoria)
-- ---------------------------------------------------------------------
alter table public.categorias
  add column if not exists parent_id uuid references public.categorias(id) on delete cascade;
create index if not exists categorias_parent_idx on public.categorias (parent_id);

-- nome único agora é POR PAI: subcategorias homônimas em pais diferentes são ok
-- (parent_id nulo -> uuid-zero, então nomes de topo continuam únicos entre si).
drop index if exists public.categorias_nome_uidx;
create unique index categorias_nome_uidx on public.categorias
  (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(nome))
  where ativo;

-- guarda: no máximo 2 níveis; sem auto-referência; um pai não vira filho.
create or replace function public.categorias_2niveis_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'Uma categoria nao pode ser subcategoria de si mesma.' using errcode='22023';
    end if;
    if (select parent_id from public.categorias where id = new.parent_id) is not null then
      raise exception 'Subcategoria nao pode ter subcategoria (maximo 2 niveis).' using errcode='22023';
    end if;
    if exists (select 1 from public.categorias where parent_id = new.id) then
      raise exception 'Esta categoria ja tem subcategorias; nao pode virar subcategoria.' using errcode='22023';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_categorias_2niveis on public.categorias;
create trigger trg_categorias_2niveis before insert or update on public.categorias
  for each row execute function public.categorias_2niveis_guard();

-- ---------------------------------------------------------------------
-- 2) PRODUTOS — novas colunas
-- ---------------------------------------------------------------------
alter table public.produtos
  add column if not exists subcategoria_id  uuid references public.categorias(id) on delete set null,
  add column if not exists marca            text,
  add column if not exists modelo           text,
  add column if not exists preco_atacado    numeric(12,2),
  add column if not exists qtde_min_atacado numeric(14,3),
  add column if not exists loja_ativo       boolean not null default false,
  add column if not exists destaque_home    boolean not null default false,
  add column if not exists descricao        text,
  add column if not exists garantia         text,
  add column if not exists itens_inclusos   text,
  add column if not exists especificacoes   text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='produtos_preco_atacado_nn') then
    alter table public.produtos add constraint produtos_preco_atacado_nn
      check (preco_atacado is null or preco_atacado >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='produtos_qtde_min_atacado_pos') then
    alter table public.produtos add constraint produtos_qtde_min_atacado_pos
      check (qtde_min_atacado is null or qtde_min_atacado > 0);
  end if;
end $$;
create index if not exists produtos_subcategoria_idx on public.produtos (subcategoria_id);
create index if not exists produtos_loja_idx on public.produtos (loja_ativo) where loja_ativo;

-- ---------------------------------------------------------------------
-- 3) PRODUTOS_CUSTO — custo da última compra (além do médio). Herda a RLS
--    só-gestão de produtos_custo (nunca vaza para a operação).
-- ---------------------------------------------------------------------
alter table public.produtos_custo
  add column if not exists custo_ultima_compra numeric(14,4);

-- ---------------------------------------------------------------------
-- 4) APLICAR_MOVIMENTACAO — igual à Fase 3, agora gravando também
--    custo_ultima_compra na entrada COM custo (ou seja, nas compras).
--    Balcão (entrada sem custo), saída e ajuste NÃO tocam custo nenhum.
-- ---------------------------------------------------------------------
create or replace function public.aplicar_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo numeric(14,3);
  v_custo numeric(14,4);
  v_novo  numeric(14,4);
begin
  select estoque_atual into v_saldo
    from public.produtos
   where id = new.produto_id
   for update;
  if not found then
    raise exception 'Produto % inexistente', new.produto_id;
  end if;

  select custo into v_custo
    from public.produtos_custo
   where produto_id = new.produto_id;

  update public.produtos
     set estoque_atual = estoque_atual + new.quantidade
   where id = new.produto_id;

  if new.tipo = 'entrada' and new.custo_unitario is not null then
    if v_custo is null or v_saldo <= 0 then
      v_novo := new.custo_unitario;
    else
      v_novo := round(
        (v_saldo * v_custo + new.quantidade * new.custo_unitario)
        / (v_saldo + new.quantidade), 4);
    end if;
    -- custo médio ponderado + custo da ÚLTIMA compra (o custo real desta entrada)
    insert into public.produtos_custo (produto_id, custo, custo_ultima_compra)
    values (new.produto_id, v_novo, new.custo_unitario)
    on conflict (produto_id) do update
      set custo = excluded.custo,
          custo_ultima_compra = excluded.custo_ultima_compra;
  end if;
  -- saída, ajuste ou entrada de balcão sem custo: custo intacto

  return null;
end;
$$;
drop trigger if exists trg_mov_aplicar on public.movimentacoes_estoque;
create trigger trg_mov_aplicar after insert on public.movimentacoes_estoque
  for each row execute function public.aplicar_movimentacao();

-- ---------------------------------------------------------------------
-- 5) PRODUTOS_OPERACAO_GUARD — operação (não-gestão) nunca define preço de
--    atacado nem publica na loja ao criar produto. (O custo NÃO é coluna de
--    produtos desde a Fase 3 — vive em produtos_custo, só-gestão via RLS —
--    então não há o que zerar aqui: a operação simplesmente não o alcança.)
-- ---------------------------------------------------------------------
create or replace function public.produtos_operacao_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select public.meu_papel()) is distinct from 'gestao' then
    new.preco_atacado    := null;
    new.qtde_min_atacado := null;
    new.loja_ativo       := false;
    new.destaque_home    := false;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_produtos_operacao_guard on public.produtos;
create trigger trg_produtos_operacao_guard before insert on public.produtos
  for each row execute function public.produtos_operacao_guard();

-- ---------------------------------------------------------------------
-- 6) PRODUTO_FOTOS — galeria (várias fotos) para a loja virtual.
--    Objetos no bucket 'produtos' (já existente). foto_path do produto
--    continua sendo a foto de CAPA (usada no balcão/PDV/vitrine).
-- ---------------------------------------------------------------------
create table if not exists public.produto_fotos (
  id         uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  path       text not null,
  ordem      int  not null default 0,
  criado_em  timestamptz not null default now(),
  constraint produto_fotos_path_nao_vazio check (length(btrim(path)) > 0)
);
create index if not exists produto_fotos_produto_idx on public.produto_fotos (produto_id, ordem);

alter table public.produto_fotos enable row level security;
drop policy if exists produto_fotos_select on public.produto_fotos;
create policy produto_fotos_select on public.produto_fotos for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists produto_fotos_insert on public.produto_fotos;
create policy produto_fotos_insert on public.produto_fotos for insert to authenticated
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists produto_fotos_update on public.produto_fotos;
create policy produto_fotos_update on public.produto_fotos for update to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists produto_fotos_delete on public.produto_fotos;
create policy produto_fotos_delete on public.produto_fotos for delete to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- ---------------------------------------------------------------------
-- 7) SINCRONIZAR_PRODUTO_FOTOS — replace-all ATÔMICO da galeria (evita perder
--    fotos se o insert falhasse após o delete, no caminho app em 2 requisições).
--    Filtra paths vazios/espaços (respeita o CHECK) e renumera a ordem.
-- ---------------------------------------------------------------------
create or replace function public.sincronizar_produto_fotos(
  p_produto_id uuid, p_paths text[]
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode editar fotos.' using errcode = '42501';
  end if;
  delete from public.produto_fotos where produto_id = p_produto_id;
  insert into public.produto_fotos (produto_id, path, ordem)
  select p_produto_id, t.p, (row_number() over (order by t.ord) - 1)::int
  from (
    select btrim(x) as p, ord
    from unnest(p_paths) with ordinality as u(x, ord)
    where length(btrim(x)) > 0
  ) t;
end; $$;
grant execute on function public.sincronizar_produto_fotos(uuid, text[]) to authenticated;
-- (Fim da 0011)
