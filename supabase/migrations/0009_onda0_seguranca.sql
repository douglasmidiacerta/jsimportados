-- =====================================================================
-- 0009_onda0_seguranca.sql — ONDA 0: controle de acesso
-- IDEMPOTENTE. Fecha o cadastro publico (so e-mail convidado entra, travado
-- no handle_new_user), da a gestao ferramentas para convidar/promover/desligar
-- usuarios (RPCs SECURITY DEFINER com guarda do "ultimo gestor").
-- Depende de: public.perfis (id/nome/papel/ativo), public.meu_papel(),
--   auth.users, trigger on_auth_user_created -> handle_new_user.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) meu_papel() PASSA A RESPEITAR ativo. Fix central de seguranca: as travas
--    de UI (exigirPerfil) NAO protegem a API direta do Supabase; toda a RLS e
--    todas as RPCs SECURITY DEFINER gateiam por meu_papel(). Se um usuario
--    DESATIVADO mantivesse o papel aqui, com o JWT valido ele chamaria a API
--    por fora e continuaria com acesso (ate se reativar). Filtrando por ativo,
--    inativo -> NULL -> perde acesso no banco inteiro (fail-closed).
-- ---------------------------------------------------------------------
--    Retorna '' (string vazia) — NAO null — para inativo/sem-perfil: assim os
--    guards existentes do tipo `if meu_papel() not in (...) then raise` fecham
--    (em SQL, `null not in (...)` = null, e o IF nao dispara — deixaria passar;
--    `'' not in (...)` = true, e o raise dispara). E `'' = 'gestao'` = false na RLS.
create or replace function public.meu_papel()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select papel from public.perfis where id = auth.uid() and ativo), '');
$$;

-- 0b) FECHA auto-escalonamento: a policy perfil_proprio_update (Fase 1) deixava
--     o usuario ATUALIZAR a propria linha de perfis via API direta (PostgREST) —
--     ou seja, operacao podia se auto-promover a 'gestao', e um inativo podia se
--     re-ativar. O app nunca atualiza perfis pelo cliente (so pelas RPCs com
--     guarda). Removemos a policy. Leitura da propria linha (perfil_proprio_select)
--     continua, para o check de 'ativo' funcionar.
drop policy if exists perfil_proprio_update on public.perfis;

-- ---------------------------------------------------------------------
-- 1) CONVITES — allowlist de e-mails. Gestao-only. Sem convite, sem conta.
-- ---------------------------------------------------------------------
create table if not exists public.convites (
  email      text primary key,                 -- sempre em minusculas
  papel      text not null default 'operacao'
               check (papel in ('operacao','gestao')),
  usado      boolean not null default false,
  usado_em   timestamptz,
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em  timestamptz not null default now(),
  constraint convites_email_lower check (email = lower(email))
);
alter table public.convites enable row level security;
drop policy if exists convites_gestao_all on public.convites;
create policy convites_gestao_all on public.convites for all to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');

-- ---------------------------------------------------------------------
-- 2) handle_new_user — GATE por convite (substitui a versao da Fase 1).
--    SEMPRE exige convite valido; sem convite -> RAISE (o cadastro inteiro
--    falha, mesmo chamando supabase.auth.signUp direto). NAO ha auto-promocao
--    a gestao por "perfis vazio" (seria escalonamento se a tabela zerasse).
--    Bootstrap de um banco NOVO: inserir um convite via SQL (owner) antes do
--    1o cadastro, ex.: insert into convites (email,papel) values ('dono@x','gestao').
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email   text := lower(coalesce(new.email, ''));
  v_convite public.convites%rowtype;
begin
  select * into v_convite from public.convites
    where email = v_email and not usado limit 1;
  if not found then
    raise exception 'Este e-mail nao foi convidado. Peca um convite ao gestor.'
      using errcode = '42501';
  end if;
  update public.convites set usado = true, usado_em = now() where email = v_email;

  insert into public.perfis (id, nome, papel)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome',''), v_convite.papel)
  on conflict (id) do nothing;
  return new;
end; $$;

-- ---------------------------------------------------------------------
-- 3) LISTAR_USUARIOS — perfis + e-mail (auth.users). Gestao-only (DEFINER).
-- ---------------------------------------------------------------------
drop function if exists public.listar_usuarios();
create function public.listar_usuarios()
returns table (id uuid, nome text, email text, papel text, ativo boolean, criado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, u.email::text, p.papel, p.ativo, p.criado_em
  from public.perfis p
  join auth.users u on u.id = p.id
  where (select public.meu_papel()) = 'gestao'
  order by p.criado_em;
$$;
grant execute on function public.listar_usuarios() to authenticated;

-- ---------------------------------------------------------------------
-- 4) RPCs de gestao de acesso (gestao-only; guarda do "ultimo gestor").
-- ---------------------------------------------------------------------
create or replace function public.convidar_usuario(p_email text, p_papel text default 'operacao')
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(btrim(coalesce(p_email,'')));
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode convidar.' using errcode='42501'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail invalido.' using errcode='22023'; end if;
  if p_papel not in ('operacao','gestao') then
    raise exception 'Papel invalido.' using errcode='22023'; end if;
  if exists (select 1 from public.perfis pf join auth.users u on u.id=pf.id where lower(u.email)=v_email) then
    raise exception 'Ja existe um usuario com esse e-mail.' using errcode='22023'; end if;
  insert into public.convites (email, papel) values (v_email, p_papel)
    on conflict (email) do update set papel = excluded.papel, usado = false, usado_em = null;
end; $$;
grant execute on function public.convidar_usuario(text, text) to authenticated;

create or replace function public.revogar_convite(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode revogar.' using errcode='42501'; end if;
  delete from public.convites where email = lower(btrim(coalesce(p_email,'')));
end; $$;
grant execute on function public.revogar_convite(text) to authenticated;

-- guarda: nunca deixar o sistema sem NENHUM gestor ativo, nem se auto-travar.
create or replace function public.definir_ativo_usuario(p_id uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_papel text; v_ativo boolean;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode fazer isso.' using errcode='42501'; end if;
  select papel, ativo into v_papel, v_ativo from public.perfis where id = p_id;
  if not found then raise exception 'Usuario nao encontrado.' using errcode='22023'; end if;
  if not p_ativo then
    if p_id = auth.uid() then
      raise exception 'Voce nao pode desativar a si mesmo.' using errcode='22023'; end if;
    if v_papel = 'gestao' then
      -- serializa acoes concorrentes de gestor (evita corrida que zeraria os gestores)
      perform 1 from public.perfis where papel='gestao' and ativo for update;
      if (select count(*) from public.perfis where papel='gestao' and ativo and id <> p_id) = 0 then
        raise exception 'Precisa de ao menos um gestor ativo.' using errcode='22023'; end if;
    end if;
  end if;
  update public.perfis set ativo = p_ativo where id = p_id;
end; $$;
grant execute on function public.definir_ativo_usuario(uuid, boolean) to authenticated;

create or replace function public.definir_papel_usuario(p_id uuid, p_papel text)
returns void language plpgsql security definer set search_path = public as $$
declare v_papel text; v_ativo boolean;
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode fazer isso.' using errcode='42501'; end if;
  if p_papel not in ('operacao','gestao') then
    raise exception 'Papel invalido.' using errcode='22023'; end if;
  select papel, ativo into v_papel, v_ativo from public.perfis where id = p_id;
  if not found then raise exception 'Usuario nao encontrado.' using errcode='22023'; end if;
  -- rebaixar o ultimo gestor ativo (ou a si mesmo) travaria a gestao
  if v_papel = 'gestao' and p_papel <> 'gestao' then
    if p_id = auth.uid() then
      raise exception 'Voce nao pode se rebaixar.' using errcode='22023'; end if;
    perform 1 from public.perfis where papel='gestao' and ativo for update;  -- serializa
    if (select count(*) from public.perfis where papel='gestao' and ativo and id <> p_id) = 0 then
      raise exception 'Precisa de ao menos um gestor ativo.' using errcode='22023'; end if;
  end if;
  update public.perfis set papel = p_papel where id = p_id;
end; $$;
grant execute on function public.definir_papel_usuario(uuid, text) to authenticated;
-- (Fim da 0009)
