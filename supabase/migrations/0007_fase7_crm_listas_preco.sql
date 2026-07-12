-- =====================================================================
-- 0007_fase7_crm_listas_preco.sql  — IDEMPOTENTE (rodar como owner via Node pg)
-- Depende de: meu_papel(), tocar_atualizado_em(), hoje_brt(),
--   clientes(0002), produtos(0002/0003), vendas(0004). NAO altera registrar_venda.
-- PRECO: legivel pela operacao (preco != custo). CRM: gestao-only.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) LISTAS_PRECO — tabelas nomeadas. EXATAMENTE uma is_default (=Varejo).
-- ---------------------------------------------------------------------
create table if not exists public.listas_preco (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  is_default    boolean not null default false,
  ativo         boolean not null default true,
  ordem         int not null default 100,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint listas_preco_nome_nn check (length(btrim(nome)) > 0)
);
create unique index if not exists listas_preco_nome_uidx
  on public.listas_preco (lower(nome)) where ativo;
create unique index if not exists listas_preco_default_uidx
  on public.listas_preco (is_default) where is_default;   -- no maximo UMA default
drop trigger if exists trg_listas_preco_touch on public.listas_preco;
create trigger trg_listas_preco_touch before update on public.listas_preco
  for each row execute function public.tocar_atualizado_em();

-- Guard declarativo: promover uma default zera as outras (auto-cascata);
-- default nao pode ser desativada nem apagada.
create or replace function public.listas_preco_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op in ('INSERT','UPDATE') then
    if new.is_default then
      if not new.ativo then
        raise exception 'A lista padrao nao pode ser desativada. Defina outra como padrao antes.'
          using errcode = '23514';
      end if;
      if tg_op = 'INSERT' or not old.is_default then
        update public.listas_preco set is_default = false
          where is_default and id is distinct from new.id;   -- recursao segura (new.is_default=false nesses)
      end if;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.is_default then
      raise exception 'A lista padrao nao pode ser apagada. Defina outra como padrao antes.'
        using errcode = '23514';
    end if;
    return old;
  end if;
  return null;
end; $$;
drop trigger if exists trg_listas_preco_guard on public.listas_preco;
create trigger trg_listas_preco_guard
  before insert or update or delete on public.listas_preco
  for each row execute function public.listas_preco_guard();

-- Invariante >=1 default, checado no COMMIT (permite estados intermediarios da cascata).
create or replace function public.listas_preco_default_exists()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.listas_preco where is_default) then
    raise exception 'Deve existir uma lista de preco padrao.' using errcode = '23514';
  end if;
  return null;
end; $$;
drop trigger if exists trg_listas_preco_default_exists on public.listas_preco;
create constraint trigger trg_listas_preco_default_exists
  after insert or update or delete on public.listas_preco
  deferrable initially deferred
  for each row execute function public.listas_preco_default_exists();

-- NOTA: o SEED de listas_preco fica no FIM da migration. Os inserts disparam a
-- constraint trigger DEFERRED (eventos pendentes até o commit); se rodassem aqui,
-- criar as FKs de `precos`/`clientes` (que referenciam listas_preco) tentaria
-- ALTER numa tabela com eventos pendentes -> erro. Seedar depois de todas as FKs.

-- ---------------------------------------------------------------------
-- 2) PRECOS — override por (produto, lista). SO listas != default. Preco de VENDA.
-- ---------------------------------------------------------------------
create table if not exists public.precos (
  produto_id    uuid not null references public.produtos(id) on delete cascade,
  lista_id      uuid not null references public.listas_preco(id) on delete cascade,
  preco         numeric(12,2) not null,
  atualizado_em timestamptz not null default now(),
  primary key (produto_id, lista_id),
  constraint precos_nn check (preco >= 0)
);
create index if not exists precos_lista_idx on public.precos (lista_id);
drop trigger if exists trg_precos_touch on public.precos;
create trigger trg_precos_touch before update on public.precos
  for each row execute function public.tocar_atualizado_em();

-- Guard: proibe override para a lista default (Varejo mora so em produtos.preco_venda).
create or replace function public.precos_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.listas_preco l where l.id = new.lista_id and l.is_default) then
    raise exception 'A lista padrao usa o preco de venda do produto; nao crie override para ela.'
      using errcode = '23514';
  end if;
  return new;
end; $$;
drop trigger if exists trg_precos_guard on public.precos;
create trigger trg_precos_guard before insert or update on public.precos
  for each row execute function public.precos_guard();

-- Resolucao canonica (para relatorios/editor da gestao; o PDV replica em TS).
-- default -> preco_venda; senao coalesce(override, preco_venda). Espelha precoNaLista.
create or replace function public.preco_do_produto(p_produto uuid, p_lista uuid)
returns numeric language sql stable set search_path = public as $$
  select case when l.is_default then p.preco_venda
              else coalesce(pr.preco, p.preco_venda) end
  from public.produtos p
  cross join public.listas_preco l
  left join public.precos pr on pr.produto_id = p.id and pr.lista_id = l.id
  where p.id = p_produto and l.id = p_lista;
$$;
grant execute on function public.preco_do_produto(uuid, uuid) to authenticated;

-- Mes corrente no fuso BRT (para aniversariantes; evita erro de virada por UTC).
create or replace function public.mes_brt()
returns int language sql stable set search_path = public as $$
  select extract(month from public.hoje_brt())::int;
$$;
grant execute on function public.mes_brt() to authenticated;

-- ---------------------------------------------------------------------
-- 3) CLIENTES += aniversario + lista_preco_id (row-level; operacao LE p/ precificar).
-- ---------------------------------------------------------------------
alter table public.clientes add column if not exists aniversario date;
alter table public.clientes add column if not exists lista_preco_id uuid
  references public.listas_preco(id) on delete set null;   -- lista some => cliente cai no Varejo
create index if not exists clientes_lista_idx on public.clientes (lista_preco_id);
create index if not exists clientes_aniv_mmdd_idx
  on public.clientes ((extract(month from aniversario)), (extract(day from aniversario)))
  where aniversario is not null;

-- ---------------------------------------------------------------------
-- 4) CRM — etiquetas (N:N) + interacoes (nota/lembrete/ligacao/whatsapp). GESTAO-ONLY.
-- ---------------------------------------------------------------------
create table if not exists public.etiquetas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  cor       text not null default 'accent',   -- token: accent|good|amber|danger
  ativo     boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint etiquetas_nome_nn check (length(btrim(nome)) > 0)
);
create unique index if not exists etiquetas_nome_uidx
  on public.etiquetas (lower(nome)) where ativo;   -- permite reusar nome apos arquivar

create table if not exists public.cliente_etiquetas (
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  etiqueta_id uuid not null references public.etiquetas(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  primary key (cliente_id, etiqueta_id)     -- idempotente: sem etiqueta duplicada no cliente
);
create index if not exists cliente_etiquetas_etq_idx on public.cliente_etiquetas (etiqueta_id);

create table if not exists public.crm_interacoes (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  tipo          text not null default 'nota'
                  check (tipo in ('nota','lembrete','ligacao','whatsapp')),
  texto         text not null,
  lembrete_em   date,
  concluido     boolean not null default false,
  criado_por    uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint crm_texto_nn      check (length(btrim(texto)) > 0),
  constraint crm_lembrete_data check (tipo <> 'lembrete' or lembrete_em is not null)
);
create index if not exists crm_cliente_idx  on public.crm_interacoes (cliente_id, criado_em desc);
create index if not exists crm_lembrete_idx on public.crm_interacoes (lembrete_em)
  where tipo = 'lembrete' and not concluido;
drop trigger if exists trg_crm_touch on public.crm_interacoes;
create trigger trg_crm_touch before update on public.crm_interacoes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- 5) VIEWS — gestao-only (security_invoker + guarda interna meu_papel()='gestao').
-- ---------------------------------------------------------------------
-- Carteira: agrega vendas por cliente + ranking. A guarda interna e a defesa real
-- (sem ela, a RLS de vendas daria carteira PARCIAL a operacao = vazamento sutil).
create or replace view public.vw_carteira_clientes with (security_invoker = true) as
select c.id                     as cliente_id,
       c.nome,
       c.telefone,
       count(v.id)              as n_compras,
       coalesce(sum(v.total),0) as total_comprado,
       max(v.data_venda)        as ultima_compra,
       case when count(v.id) > 0
            then round(coalesce(sum(v.total),0) / count(v.id), 2) else 0 end as ticket_medio,
       rank() over (order by coalesce(sum(v.total),0) desc)                   as ranking
from public.clientes c
left join public.vendas v on v.cliente_id = c.id
where (select public.meu_papel()) = 'gestao'
group by c.id, c.nome, c.telefone;
grant select on public.vw_carteira_clientes to authenticated;

-- Aniversariantes: expoe mes/dia p/ filtro (.eq('mes', N)). Guarda gestao-only.
create or replace view public.vw_aniversariantes with (security_invoker = true) as
select c.id as cliente_id, c.nome, c.telefone, c.aniversario,
       extract(month from c.aniversario)::int as mes,
       extract(day   from c.aniversario)::int as dia
from public.clientes c
where c.aniversario is not null and c.ativo
  and (select public.meu_papel()) = 'gestao';
grant select on public.vw_aniversariantes to authenticated;

-- ---------------------------------------------------------------------
-- 6) RLS
-- ---------------------------------------------------------------------
alter table public.listas_preco      enable row level security;
alter table public.precos            enable row level security;
alter table public.etiquetas         enable row level security;
alter table public.cliente_etiquetas enable row level security;
alter table public.crm_interacoes    enable row level security;

-- LISTAS_PRECO: todos LEEM (PDV precisa); escrita SO gestao (promocao=UPDATE, guard cascata).
drop policy if exists listas_preco_select on public.listas_preco;
create policy listas_preco_select on public.listas_preco for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists listas_preco_insert on public.listas_preco;
create policy listas_preco_insert on public.listas_preco for insert to authenticated
  with check ((select public.meu_papel()) = 'gestao');
drop policy if exists listas_preco_update on public.listas_preco;
create policy listas_preco_update on public.listas_preco for update to authenticated
  using ((select public.meu_papel()) = 'gestao') with check ((select public.meu_papel()) = 'gestao');
drop policy if exists listas_preco_delete on public.listas_preco;
create policy listas_preco_delete on public.listas_preco for delete to authenticated
  using ((select public.meu_papel()) = 'gestao');

-- PRECOS: todos LEEM (PDV; preco != custo); escrita SO gestao.
drop policy if exists precos_select on public.precos;
create policy precos_select on public.precos for select to authenticated
  using ((select public.meu_papel()) in ('operacao','gestao'));
drop policy if exists precos_write on public.precos;
create policy precos_write on public.precos for all to authenticated
  using ((select public.meu_papel()) = 'gestao') with check ((select public.meu_papel()) = 'gestao');

-- CRM (etiquetas/vinculos/interacoes): TUDO gestao-only (como custo/financeiro).
drop policy if exists etiquetas_all on public.etiquetas;
create policy etiquetas_all on public.etiquetas for all to authenticated
  using ((select public.meu_papel()) = 'gestao') with check ((select public.meu_papel()) = 'gestao');
drop policy if exists cliente_etiquetas_all on public.cliente_etiquetas;
create policy cliente_etiquetas_all on public.cliente_etiquetas for all to authenticated
  using ((select public.meu_papel()) = 'gestao') with check ((select public.meu_papel()) = 'gestao');
drop policy if exists crm_interacoes_all on public.crm_interacoes;
create policy crm_interacoes_all on public.crm_interacoes for all to authenticated
  using ((select public.meu_papel()) = 'gestao') with check ((select public.meu_papel()) = 'gestao');
-- clientes.aniversario/lista_preco_id herdam a RLS de clientes(0002): operacao LE a linha
-- (necessario p/ o PDV precificar; nenhuma coluna e custo) mas so gestao EDITA (update gestao-only).

-- ---------------------------------------------------------------------
-- 7) SEED das listas (Varejo=default; Atacado; Promocao) — POR ULTIMO.
--    (depois de todas as FKs que referenciam listas_preco; ver nota na secao 1).
--    A constraint DEFERRED valida >=1 default no commit; idempotente por lower(nome).
-- ---------------------------------------------------------------------
insert into public.listas_preco (nome, is_default, ordem)
select 'Varejo', true, 10   where not exists (select 1 from public.listas_preco where lower(nome)='varejo');
insert into public.listas_preco (nome, is_default, ordem)
select 'Atacado', false, 20  where not exists (select 1 from public.listas_preco where lower(nome)='atacado');
insert into public.listas_preco (nome, is_default, ordem)
select 'Promoção', false, 30 where not exists (select 1 from public.listas_preco where lower(nome)='promoção');
-- (Fim da 0007)
