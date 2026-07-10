-- Bootstrap completo Ultrafrio WMS
-- Cole no SQL Editor do projeto novo


-- ========== supabase/sql/create_ultrafrio_enderecamento.sql ==========
-- Ultrafrio â€” endereÃ§amento de NF-e no painel de cÃ¢maras
-- Rode no SQL Editor do Supabase (uma vez).

create table if not exists public.ultrafrio_notas_fiscais (
  id text primary key,
  numero text not null,
  serie text not null default '',
  chave text not null default '',
  emitente text not null default '',
  data_emissao text not null default '',
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluida')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ultrafrio_nf_itens (
  id uuid primary key default gen_random_uuid(),
  nf_id text not null references public.ultrafrio_notas_fiscais (id) on delete cascade,
  item_index integer not null,
  codigo text not null default '',
  descricao text not null default '',
  quantidade numeric not null default 0,
  unidade text not null default '',
  unique (nf_id, item_index)
);

create table if not exists public.ultrafrio_enderecamentos (
  id uuid primary key default gen_random_uuid(),
  nf_id text not null references public.ultrafrio_notas_fiscais (id) on delete cascade,
  item_index integer not null,
  address_id text not null,
  created_at timestamptz not null default now(),
  unique (address_id)
);

create index if not exists idx_ultrafrio_nf_itens_nf on public.ultrafrio_nf_itens (nf_id);
create index if not exists idx_ultrafrio_end_nf on public.ultrafrio_enderecamentos (nf_id);
create index if not exists idx_ultrafrio_end_addr on public.ultrafrio_enderecamentos (address_id);

create or replace function public.ultrafrio_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ultrafrio_nf_updated on public.ultrafrio_notas_fiscais;
create trigger trg_ultrafrio_nf_updated
  before update on public.ultrafrio_notas_fiscais
  for each row execute function public.ultrafrio_touch_updated_at();

alter table public.ultrafrio_notas_fiscais enable row level security;
alter table public.ultrafrio_nf_itens enable row level security;
alter table public.ultrafrio_enderecamentos enable row level security;

-- PolÃ­ticas abertas (ferramenta interna). Restrinja depois com auth, se necessÃ¡rio.
drop policy if exists ultrafrio_nf_all on public.ultrafrio_notas_fiscais;
create policy ultrafrio_nf_all on public.ultrafrio_notas_fiscais
  for all using (true) with check (true);

drop policy if exists ultrafrio_itens_all on public.ultrafrio_nf_itens;
create policy ultrafrio_itens_all on public.ultrafrio_nf_itens
  for all using (true) with check (true);

drop policy if exists ultrafrio_end_all on public.ultrafrio_enderecamentos;
create policy ultrafrio_end_all on public.ultrafrio_enderecamentos
  for all using (true) with check (true);


-- ========== supabase/sql/create_ultrafrio_movimentos.sql ==========
-- Ultrafrio â€” histÃ³rico de entradas e saÃ­das
-- Rode no SQL Editor do Supabase (apÃ³s create_ultrafrio_enderecamento.sql).

create table if not exists public.ultrafrio_movimentos (
  id text primary key,
  tipo text not null check (tipo in ('entrada', 'saida', 'movimentacao')),
  nf_id text not null references public.ultrafrio_notas_fiscais (id) on delete cascade,
  nf_numero text not null,
  emitente text not null default '',
  created_at timestamptz not null default now(),
  payload jsonb not null default '{"itens":[]}'::jsonb
);

create index if not exists idx_ultrafrio_mov_nf on public.ultrafrio_movimentos (nf_id);
create index if not exists idx_ultrafrio_mov_tipo on public.ultrafrio_movimentos (tipo);

alter table public.ultrafrio_movimentos enable row level security;

drop policy if exists ultrafrio_mov_all on public.ultrafrio_movimentos;
create policy ultrafrio_mov_all on public.ultrafrio_movimentos
  for all using (true) with check (true);


-- ========== supabase/sql/create_ultrafrio_notas_canceladas.sql ==========
-- Tabela de NF-e canceladas e vÃ­nculo com nota substituta
CREATE TABLE IF NOT EXISTS ultrafrio_notas_canceladas (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL,
  serie TEXT DEFAULT '',
  chave TEXT DEFAULT '',
  emitente TEXT DEFAULT '',
  data_emissao TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  vinculo_nf_nova_id TEXT,
  vinculo_nf_nova_numero TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ultrafrio_canceladas_vinculo
  ON ultrafrio_notas_canceladas (vinculo_nf_nova_id);

ALTER TABLE ultrafrio_notas_canceladas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_ultrafrio_notas_canceladas" ON ultrafrio_notas_canceladas;
DROP POLICY IF EXISTS ultrafrio_canceladas_all ON ultrafrio_notas_canceladas;

CREATE POLICY ultrafrio_canceladas_all ON ultrafrio_notas_canceladas
  FOR ALL USING (true) WITH CHECK (true);


-- ========== supabase/sql/create_ultrafrio_cadastro_remetentes.sql ==========
-- Ultrafrio â€” cadastro de remetentes para sugestÃµes no NF manual
-- Rode no SQL Editor do Supabase (apÃ³s create_ultrafrio_enderecamento.sql).

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'ultrafrio_emitentes'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'ultrafrio_cadastro_remetentes'
  ) then
    alter table public.ultrafrio_emitentes rename to ultrafrio_cadastro_remetentes;
  end if;
end $$;

create table if not exists public.ultrafrio_cadastro_remetentes (
  nome_key text primary key,
  nome text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_ultrafrio_cadastro_remetentes_updated
  on public.ultrafrio_cadastro_remetentes (updated_at desc);

alter table public.ultrafrio_cadastro_remetentes enable row level security;

drop policy if exists ultrafrio_cadastro_remetentes_all on public.ultrafrio_cadastro_remetentes;
create policy ultrafrio_cadastro_remetentes_all on public.ultrafrio_cadastro_remetentes
  for all using (true) with check (true);

-- Preenche com remetentes jÃ¡ existentes nas notas (se houver).
insert into public.ultrafrio_cadastro_remetentes (nome_key, nome, updated_at)
select distinct on (lower(trim(emitente)))
  lower(trim(emitente)),
  trim(emitente),
  now()
from public.ultrafrio_notas_fiscais
where trim(emitente) <> ''
  and lower(trim(emitente)) <> 'cadastro manual'
on conflict (nome_key) do nothing;

insert into public.ultrafrio_cadastro_remetentes (nome_key, nome, updated_at)
select distinct on (lower(trim(emitente)))
  lower(trim(emitente)),
  trim(emitente),
  now()
from public.ultrafrio_notas_canceladas
where trim(emitente) <> ''
  and lower(trim(emitente)) <> 'cadastro manual'
on conflict (nome_key) do nothing;


-- ========== supabase/sql/create_ultrafrio_financeiro.sql ==========
-- MÃ³dulo Financeiro: tabelas de cobranÃ§a, contratos por cliente e clientes cadastrados.
-- Ferramenta interna: RLS aberta (sem autenticaÃ§Ã£o), igual Ã s demais tabelas do projeto.

-- Tabelas de cobranÃ§a (preÃ§os de armazenagem).
create table if not exists public.ultrafrio_fin_tabelas (
  id text primary key,
  nome text not null,
  custo_posicao_palete numeric not null default 0,
  custo_por_kilo numeric not null default 0,
  custo_por_palete numeric not null default 0,
  custo_entrada numeric not null default 0,
  custo_saida numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Clientes cadastrados (auto ao dar entrada de NF, ou manual). Nunca duplica CNPJ.
create table if not exists public.ultrafrio_fin_clientes (
  cnpj text primary key,
  razao_social text not null default '',
  origem text not null default 'auto',
  created_at timestamptz not null default now()
);

-- Contrato de armazenagem por cliente (regras do que cobrar).
create table if not exists public.ultrafrio_fin_contratos (
  id text primary key,
  cnpj text not null,
  razao_social text not null default '',
  tabela_id text,
  ciclo text not null default 'mensal',
  regra_tempo text not null default 'proporcional',
  cobrar_posicao_palete boolean not null default false,
  cobrar_kilo boolean not null default false,
  cobrar_palete boolean not null default false,
  cobrar_entrada boolean not null default false,
  cobrar_saida boolean not null default false,
  kilo_por_dia boolean not null default false,
  ativo boolean not null default true,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists ultrafrio_fin_contratos_cnpj_idx
  on public.ultrafrio_fin_contratos (cnpj);

alter table public.ultrafrio_fin_tabelas enable row level security;
alter table public.ultrafrio_fin_clientes enable row level security;
alter table public.ultrafrio_fin_contratos enable row level security;

drop policy if exists ultrafrio_fin_tabelas_all on public.ultrafrio_fin_tabelas;
create policy ultrafrio_fin_tabelas_all on public.ultrafrio_fin_tabelas
  for all using (true) with check (true);

drop policy if exists ultrafrio_fin_clientes_all on public.ultrafrio_fin_clientes;
create policy ultrafrio_fin_clientes_all on public.ultrafrio_fin_clientes
  for all using (true) with check (true);

drop policy if exists ultrafrio_fin_contratos_all on public.ultrafrio_fin_contratos;
create policy ultrafrio_fin_contratos_all on public.ultrafrio_fin_contratos
  for all using (true) with check (true);

-- Realtime
alter table public.ultrafrio_fin_tabelas replica identity full;
alter table public.ultrafrio_fin_clientes replica identity full;
alter table public.ultrafrio_fin_contratos replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.ultrafrio_fin_tabelas;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.ultrafrio_fin_clientes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.ultrafrio_fin_contratos;
  exception when duplicate_object then null;
  end;
end $$;


-- ========== supabase/sql/create_ultrafrio_voz_cadastros.sql ==========
-- Ultrafrio â€” vozes cadastradas (sincronizam entre navegadores/computadores)
-- Rode no SQL Editor do Supabase.

create table if not exists public.ultrafrio_voz_cadastros (
  id text primary key,
  name text not null,
  features jsonb not null,
  sample_count int not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ultrafrio_voz_cadastros_updated
  on public.ultrafrio_voz_cadastros (updated_at desc);

alter table public.ultrafrio_voz_cadastros enable row level security;

drop policy if exists ultrafrio_voz_cadastros_all on public.ultrafrio_voz_cadastros;
create policy ultrafrio_voz_cadastros_all on public.ultrafrio_voz_cadastros
  for all using (true) with check (true);


-- ========== supabase/sql/apply_pending_columns.sql ==========
-- Colunas pendentes para sincronizaÃ§Ã£o (peso, valores, campos de entrada)
-- Rode UMA VEZ no SQL Editor do Supabase se aparecer erro de coluna inexistente
-- (ex.: "Could not find the 'peso_bruto' column").

-- Totais da NF
alter table public.ultrafrio_notas_fiscais
  add column if not exists peso_bruto numeric,
  add column if not exists peso_liquido numeric,
  add column if not exists valor_total_nota numeric,
  add column if not exists quantidade_volume text,
  add column if not exists data_armazenagem date;

update public.ultrafrio_notas_fiscais
set data_armazenagem = coalesce(data_armazenagem, created_at::date)
where data_armazenagem is null;

-- Valores comerciais e peso por item
alter table public.ultrafrio_nf_itens
  add column if not exists peso_bruto numeric,
  add column if not exists valor_unitario numeric,
  add column if not exists valor_total numeric;

-- Campos opcionais de entrada por item
alter table public.ultrafrio_nf_itens
  add column if not exists up text,
  add column if not exists lote text,
  add column if not exists data_fabricacao text,
  add column if not exists data_validade text,
  add column if not exists paletes integer;

-- HistÃ³rico de movimentos sem FK obrigatÃ³ria para NF (ex.: exclusÃ£o do estoque)
alter table public.ultrafrio_movimentos
  drop constraint if exists ultrafrio_movimentos_nf_id_fkey;

alter table public.ultrafrio_movimentos
  alter column nf_id drop not null;

-- Reposicionamento de paletes (tipo movimentacao no historico)
alter table public.ultrafrio_movimentos
  drop constraint if exists ultrafrio_movimentos_tipo_check;

alter table public.ultrafrio_movimentos
  add constraint ultrafrio_movimentos_tipo_check
  check (tipo in ('entrada', 'saida', 'movimentacao'));


-- ========== supabase/sql/enable_realtime.sql ==========
-- Ultrafrio â€” habilita sincronizaÃ§Ã£o em tempo real entre navegadores
-- Rode no SQL Editor do Supabase (apÃ³s criar as tabelas).

alter table public.ultrafrio_notas_fiscais replica identity full;
alter table public.ultrafrio_nf_itens replica identity full;
alter table public.ultrafrio_enderecamentos replica identity full;
alter table public.ultrafrio_movimentos replica identity full;
alter table public.ultrafrio_notas_canceladas replica identity full;
alter table public.ultrafrio_cadastro_remetentes replica identity full;
alter table public.ultrafrio_voz_cadastros replica identity full;

do $$
declare
  t text;
begin
  foreach t in array array[
    'ultrafrio_notas_fiscais',
    'ultrafrio_nf_itens',
    'ultrafrio_enderecamentos',
    'ultrafrio_movimentos',
    'ultrafrio_notas_canceladas',
    'ultrafrio_cadastro_remetentes',
    'ultrafrio_voz_cadastros'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


