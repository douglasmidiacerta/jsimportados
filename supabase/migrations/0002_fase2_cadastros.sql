-- =====================================================================
-- JS Importados — Fase 2 (Cadastros): categorias, produtos, fornecedores, clientes
-- Idempotente. Rodar no SQL Editor do Supabase.
-- Depende de public.meu_papel() (STABLE, SECURITY DEFINER, search_path=public) já existente.
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------- Trigger util: manter atualizado_em (search_path fixo) ----------
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ============================ CATEGORIAS ============================
create table if not exists public.categorias (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint categorias_nome_nao_vazio check (length(btrim(nome)) > 0)
);
drop index if exists public.categorias_nome_uidx;
create unique index categorias_nome_uidx on public.categorias (lower(nome)) where ativo;
drop trigger if exists trg_categorias_touch on public.categorias;
create trigger trg_categorias_touch before update on public.categorias
  for each row execute function public.tocar_atualizado_em();

-- ============================ FORNECEDORES ============================
create table if not exists public.fornecedores (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  contato       text,
  telefone      text,
  cidade        text,
  pais          text not null default 'Paraguai',
  observacoes   text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint fornecedores_nome_nao_vazio check (length(btrim(nome)) > 0)
);
drop index if exists public.fornecedores_nome_uidx;
create unique index fornecedores_nome_uidx on public.fornecedores (lower(nome)) where ativo;
drop trigger if exists trg_fornecedores_touch on public.fornecedores;
create trigger trg_fornecedores_touch before update on public.fornecedores
  for each row execute function public.tocar_atualizado_em();

-- ============================ CLIENTES ============================
create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  telefone      text,
  documento     text,                                   -- CPF/CNPJ opcional
  observacoes   text,
  ativo         boolean not null default true,
  criado_por    uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint clientes_nome_nao_vazio check (length(btrim(nome)) > 0)
);
create index if not exists clientes_nome_idx      on public.clientes (lower(nome));
create index if not exists clientes_nome_trgm_idx on public.clientes using gin (nome gin_trgm_ops);
drop trigger if exists trg_clientes_touch on public.clientes;
create trigger trg_clientes_touch before update on public.clientes
  for each row execute function public.tocar_atualizado_em();

-- ============================ PRODUTOS ============================
create table if not exists public.produtos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  categoria_id  uuid references public.categorias(id) on delete set null,  -- opcional
  unidade       text not null default 'un'
                  check (unidade in ('un','kg','g','l','ml','cx','pct','par','m','dz')),
  preco_venda   numeric(12,2) not null default 0,                          -- BRL (Fase 2)
  custo         numeric(14,4),                                             -- placeholder Fase 3 (custo real multi-moeda)
  foto_path     text,                                                      -- objeto no Storage (bucket 'produtos')
  observacoes   text,
  ativo         boolean not null default true,
  criado_por    uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint produtos_nome_nao_vazio check (length(btrim(nome)) > 0),
  constraint produtos_preco_nao_neg  check (preco_venda >= 0),
  constraint produtos_custo_nao_neg  check (custo is null or custo >= 0)
);

-- Identidade NOME + CATEGORIA (case-insensitive; trata categoria nula; só entre produtos ativos)
create unique index if not exists produtos_nome_categoria_uidx
  on public.produtos (
    lower(nome),
    coalesce(categoria_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where ativo;
create index if not exists produtos_categoria_idx on public.produtos (categoria_id);
create index if not exists produtos_ativo_idx     on public.produtos (ativo) where ativo;
create index if not exists produtos_nome_trgm_idx on public.produtos using gin (nome gin_trgm_ops);

drop trigger if exists trg_produtos_touch on public.produtos;
create trigger trg_produtos_touch before update on public.produtos
  for each row execute function public.tocar_atualizado_em();

-- Blindagem coluna-a-coluna: operação (não-gestão) não define custo ao criar produto.
create or replace function public.produtos_operacao_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select public.meu_papel()) is distinct from 'gestao' then
    new.custo := null;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_produtos_operacao_guard on public.produtos;
create trigger trg_produtos_operacao_guard before insert on public.produtos
  for each row execute function public.produtos_operacao_guard();

-- Semente de categoria default (opcional/amigável; nao travada)
insert into public.categorias (nome)
select 'Geral'
where not exists (select 1 from public.categorias where lower(nome) = 'geral');

-- ============================ RLS ============================
alter table public.categorias   enable row level security;
alter table public.produtos     enable row level security;
alter table public.fornecedores enable row level security;
alter table public.clientes     enable row level security;

-- ---- CATEGORIAS: todos leem; escrita so gestao ----
drop policy if exists categorias_select on public.categorias;
create policy categorias_select on public.categorias for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists categorias_insert on public.categorias;
create policy categorias_insert on public.categorias for insert to authenticated
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists categorias_update on public.categorias;
create policy categorias_update on public.categorias for update to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists categorias_delete on public.categorias;
create policy categorias_delete on public.categorias for delete to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- ---- PRODUTOS: todos leem/criam; so gestao edita/apaga (protege preco/custo) ----
drop policy if exists produtos_select on public.produtos;
create policy produtos_select on public.produtos for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists produtos_insert on public.produtos;
create policy produtos_insert on public.produtos for insert to authenticated
  with check ((select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists produtos_update on public.produtos;
create policy produtos_update on public.produtos for update to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists produtos_delete on public.produtos;
create policy produtos_delete on public.produtos for delete to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- ---- FORNECEDORES: gestao em tudo (operacao nunca ve) ----
drop policy if exists fornecedores_select on public.fornecedores;
create policy fornecedores_select on public.fornecedores for select to authenticated
  using ((select public.meu_papel()) = 'gestao');
drop policy if exists fornecedores_insert on public.fornecedores;
create policy fornecedores_insert on public.fornecedores for insert to authenticated
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists fornecedores_update on public.fornecedores;
create policy fornecedores_update on public.fornecedores for update to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists fornecedores_delete on public.fornecedores;
create policy fornecedores_delete on public.fornecedores for delete to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- ---- CLIENTES: todos leem/criam; so gestao edita/apaga ----
drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes for insert to authenticated
  with check ((select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists clientes_update on public.clientes;
create policy clientes_update on public.clientes for update to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists clientes_delete on public.clientes;
create policy clientes_delete on public.clientes for delete to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- ============================ STORAGE (fotos de produto) ============================
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

drop policy if exists produtos_foto_read on storage.objects;
create policy produtos_foto_read on storage.objects for select to public
  using (bucket_id = 'produtos');
drop policy if exists produtos_foto_insert on storage.objects;
create policy produtos_foto_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and (select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists produtos_foto_update on storage.objects;
create policy produtos_foto_update on storage.objects for update to authenticated
  using (bucket_id = 'produtos' and (select public.meu_papel()) = 'gestao')
  with check (bucket_id = 'produtos' and (select public.meu_papel()) = 'gestao');
drop policy if exists produtos_foto_delete on storage.objects;
create policy produtos_foto_delete on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and (select public.meu_papel()) = 'gestao');
