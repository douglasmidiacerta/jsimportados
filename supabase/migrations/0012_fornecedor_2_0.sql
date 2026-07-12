-- =====================================================================
-- 0012_fornecedor_2_0.sql — cadastro rico de fornecedor (só-gestão)
-- IDEMPOTENTE. Fornecedor ganha PF/PJ + campos fiscais básicos, e coleções
-- 1:N: endereços, contatos, dados bancários, documentos (arquivos em bucket
-- PRIVADO). RPC atômica salvar_fornecedor_filhos faz replace-all das 4 coleções
-- numa transação. Campos de NF-e (Indicador IE, IE, IM, email NFe) ficam p/ depois.
-- Fornecedores e tudo aqui é SÓ-GESTÃO (a operação nunca vê fornecedor).
-- Depende de: public.fornecedores, public.meu_papel().
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) FORNECEDORES — colunas novas (todas opcionais; só 'nome' é obrigatório)
-- ---------------------------------------------------------------------
alter table public.fornecedores
  add column if not exists tipo_pessoa       text not null default 'juridica',
  add column if not exists situacao          text not null default 'geral',
  add column if not exists razao_social      text,
  add column if not exists nome_fantasia     text,
  add column if not exists documento         text,   -- CNPJ ou CPF
  add column if not exists celular           text,
  add column if not exists email             text,
  add column if not exists site              text,
  add column if not exists eh_transportadora boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='fornecedores_tipo_pessoa_chk') then
    alter table public.fornecedores add constraint fornecedores_tipo_pessoa_chk
      check (tipo_pessoa in ('fisica','juridica'));
  end if;
  if not exists (select 1 from pg_constraint where conname='fornecedores_situacao_chk') then
    alter table public.fornecedores add constraint fornecedores_situacao_chk
      check (situacao in ('geral','bloqueado'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) TABELAS-FILHAS 1:N (endereços, contatos, bancos, documentos)
-- ---------------------------------------------------------------------
create table if not exists public.fornecedor_enderecos (
  id           uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  cep          text, logradouro text, numero text, complemento text,
  bairro       text, cidade text, uf text,
  exterior     boolean not null default false,
  ordem        int not null default 0,
  criado_em    timestamptz not null default now()
);
create index if not exists forn_end_idx on public.fornecedor_enderecos (fornecedor_id, ordem);

create table if not exists public.fornecedor_contatos (
  id           uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  nome text, cargo text, telefone text, email text,
  ordem        int not null default 0,
  criado_em    timestamptz not null default now()
);
create index if not exists forn_cont_idx on public.fornecedor_contatos (fornecedor_id, ordem);

create table if not exists public.fornecedor_bancos (
  id           uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  tipo text, banco text, agencia text, agencia_digito text, conta text, conta_digito text,
  ordem        int not null default 0,
  criado_em    timestamptz not null default now()
);
create index if not exists forn_banco_idx on public.fornecedor_bancos (fornecedor_id, ordem);

create table if not exists public.fornecedor_documentos (
  id           uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  tipo text, descricao text,
  arquivo_path text not null,             -- objeto no bucket privado 'fornecedor-docs'
  tipo_arquivo text,                      -- 'image' | 'pdf'
  ordem        int not null default 0,
  criado_em    timestamptz not null default now(),
  constraint forn_doc_path_nn check (length(btrim(arquivo_path)) > 0)
);
create index if not exists forn_doc_idx on public.fornecedor_documentos (fornecedor_id, ordem);

-- ---------------------------------------------------------------------
-- 3) RLS — tudo SÓ-GESTÃO (igual à tabela fornecedores)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['fornecedor_enderecos','fornecedor_contatos','fornecedor_bancos','fornecedor_documentos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_gestao on public.%I', t, t);
    execute format(
      'create policy %I_gestao on public.%I for all to authenticated '
      || 'using ((select public.meu_papel()) = ''gestao'') '
      || 'with check ((select public.meu_papel()) = ''gestao'')', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4) STORAGE — bucket PRIVADO de documentos (só-gestão; visto via signed URL)
-- ---------------------------------------------------------------------
-- limites no PROPRIO bucket (defense-in-depth; nao confia so no cliente):
-- 8 MB e apenas imagem/PDF.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fornecedor-docs', 'fornecedor-docs', false, 8388608,
        array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists forn_docs_all on storage.objects;
create policy forn_docs_all on storage.objects for all to authenticated
  using (bucket_id = 'fornecedor-docs' and (select public.meu_papel()) = 'gestao')
  with check (bucket_id = 'fornecedor-docs' and (select public.meu_papel()) = 'gestao');

-- ---------------------------------------------------------------------
-- 5) RPC ATÔMICA — replace-all das 4 coleções numa transação só.
--    (evita perda parcial se algo falhar no meio; guarda gestão)
-- ---------------------------------------------------------------------
create or replace function public.salvar_fornecedor_filhos(
  p_fornecedor_id uuid,
  p_enderecos     jsonb default '[]',
  p_contatos      jsonb default '[]',
  p_bancos        jsonb default '[]',
  p_documentos    jsonb default '[]'
) returns void language plpgsql security definer set search_path = public as $$
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode editar fornecedores.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.fornecedores where id = p_fornecedor_id) then
    raise exception 'Fornecedor inexistente.' using errcode = '22023';
  end if;

  delete from public.fornecedor_enderecos where fornecedor_id = p_fornecedor_id;
  insert into public.fornecedor_enderecos
    (fornecedor_id, cep, logradouro, numero, complemento, bairro, cidade, uf, exterior, ordem)
  select p_fornecedor_id, e->>'cep', e->>'logradouro', e->>'numero', e->>'complemento',
         e->>'bairro', e->>'cidade', e->>'uf', coalesce((e->>'exterior')::boolean,false), (ord-1)::int
  from jsonb_array_elements(coalesce(p_enderecos,'[]'::jsonb)) with ordinality as t(e, ord);

  delete from public.fornecedor_contatos where fornecedor_id = p_fornecedor_id;
  insert into public.fornecedor_contatos (fornecedor_id, nome, cargo, telefone, email, ordem)
  select p_fornecedor_id, c->>'nome', c->>'cargo', c->>'telefone', c->>'email', (ord-1)::int
  from jsonb_array_elements(coalesce(p_contatos,'[]'::jsonb)) with ordinality as t(c, ord);

  delete from public.fornecedor_bancos where fornecedor_id = p_fornecedor_id;
  insert into public.fornecedor_bancos
    (fornecedor_id, tipo, banco, agencia, agencia_digito, conta, conta_digito, ordem)
  select p_fornecedor_id, b->>'tipo', b->>'banco', b->>'agencia', b->>'agencia_digito',
         b->>'conta', b->>'conta_digito', (ord-1)::int
  from jsonb_array_elements(coalesce(p_bancos,'[]'::jsonb)) with ordinality as t(b, ord);

  delete from public.fornecedor_documentos where fornecedor_id = p_fornecedor_id;
  insert into public.fornecedor_documentos
    (fornecedor_id, tipo, descricao, arquivo_path, tipo_arquivo, ordem)
  select p_fornecedor_id, d->>'tipo', d->>'descricao', d->>'arquivo_path', d->>'tipo_arquivo', (ord-1)::int
  from jsonb_array_elements(coalesce(p_documentos,'[]'::jsonb)) with ordinality as t(d, ord)
  where length(btrim(coalesce(d->>'arquivo_path',''))) > 0;
end; $$;
grant execute on function public.salvar_fornecedor_filhos(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
-- (Fim da 0012)
