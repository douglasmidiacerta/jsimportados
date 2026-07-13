-- =====================================================================
-- 0020 — LEVA E: configuração da empresa (dados p/ o sistema e p/ impressões)
-- Singleton (id=true), como financeiro_config. Guarda nome, CNPJ, contato,
-- endereço, logo, mensagem de rodapé e nº de vias — usados no cabeçalho das
-- telas e nas impressões (Leva F). Leitura liberada (nome/logo não é sensível);
-- escrita só gestão.
-- =====================================================================

create table if not exists public.empresa_config (
  id              boolean primary key default true,
  nome            text not null default 'JS Importados',
  cnpj            text,
  telefone        text,
  email           text,
  cep             text,
  logradouro      text,
  numero          text,
  complemento     text,
  bairro          text,
  cidade          text,
  uf              text,
  logo_path       text,
  mensagem_rodape text,                       -- rodapé de recibos/impressões
  vias            int not null default 1,     -- nº de vias padrão nas impressões
  atualizado_em   timestamptz not null default now(),
  constraint empresa_config_singleton check (id = true),
  constraint empresa_config_uf_fmt check (uf is null or uf ~ '^[A-Za-z]{2}$'),
  constraint empresa_config_vias_ok check (vias between 1 and 4)
);
insert into public.empresa_config (id) values (true) on conflict (id) do nothing;

drop trigger if exists trg_empresa_config_touch on public.empresa_config;
create trigger trg_empresa_config_touch before update on public.empresa_config
  for each row execute function public.tocar_atualizado_em();

alter table public.empresa_config enable row level security;

-- leitura p/ qualquer usuário logado (o balcão mostra o nome/logo nos recibos)
drop policy if exists empresa_config_select on public.empresa_config;
create policy empresa_config_select on public.empresa_config for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));

-- escrita só gestão
drop policy if exists empresa_config_write on public.empresa_config;
create policy empresa_config_write on public.empresa_config for update to authenticated
  using ((select public.meu_papel()) = 'gestao')
  with check ((select public.meu_papel()) = 'gestao');
