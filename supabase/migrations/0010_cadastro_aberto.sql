-- =====================================================================
-- 0010_cadastro_aberto.sql — janela de cadastro aberto (temporaria)
-- Permite abrir o cadastro para "qualquer um com o link" SEM convite,
-- criando SEMPRE papel 'operacao' (NUNCA gestao). Controlado por uma flag
-- em app_config que a gestao liga/desliga (RPC definir_cadastro_aberto).
-- Convite continua tendo PRIORIDADE sobre o cadastro aberto.
-- A flag nasce FECHADA; abrir é acao de runtime (nao fica gravado aqui).
-- IDEMPOTENTE. Depende de: public.perfis, public.meu_papel(), public.convites.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) app_config: chave/valor simples. Gestao-only na API (PostgREST);
--    handle_new_user (SECURITY DEFINER) le direto, sem passar pela RLS.
-- ---------------------------------------------------------------------
create table if not exists public.app_config (
  chave         text primary key,
  valor         text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.app_config enable row level security;
drop policy if exists app_config_gestao on public.app_config;
create policy app_config_gestao on public.app_config for all to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');

-- nasce FECHADO; nunca reabre sozinho ao re-rodar a migration
insert into public.app_config (chave, valor) values ('cadastro_aberto','false')
  on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- 2) handle_new_user: 1) convite valido -> papel do convite; senao
--    2) cadastro_aberto -> 'operacao' (NUNCA gestao); senao 3) RAISE.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email   text := lower(coalesce(new.email, ''));
  v_convite public.convites%rowtype;
  v_aberto  boolean := coalesce(
    (select valor = 'true' from public.app_config where chave = 'cadastro_aberto'), false);
  v_papel   text;
begin
  select * into v_convite from public.convites
    where email = v_email and not usado limit 1;
  if found then
    v_papel := v_convite.papel;
    update public.convites set usado = true, usado_em = now() where email = v_email;
  elsif v_aberto then
    v_papel := 'operacao';   -- cadastro aberto SO cria operacao, nunca gestao
  else
    raise exception 'Este e-mail nao foi convidado. Peca um convite ao gestor.'
      using errcode = '42501';
  end if;

  insert into public.perfis (id, nome, papel)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome',''), v_papel)
  on conflict (id) do nothing;
  return new;
end; $$;

-- ---------------------------------------------------------------------
-- 3) RPC: gestao liga/desliga o cadastro aberto (autoriza no banco).
-- ---------------------------------------------------------------------
create or replace function public.definir_cadastro_aberto(p_aberto boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select public.meu_papel()) <> 'gestao' then
    raise exception 'Apenas a gestao pode fazer isso.' using errcode = '42501';
  end if;
  insert into public.app_config (chave, valor, atualizado_em)
  values ('cadastro_aberto', case when p_aberto then 'true' else 'false' end, now())
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
end; $$;
grant execute on function public.definir_cadastro_aberto(boolean) to authenticated;
-- (Fim da 0010)
