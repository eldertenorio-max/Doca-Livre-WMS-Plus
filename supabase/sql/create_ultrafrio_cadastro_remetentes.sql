-- Ultrafrio — cadastro de remetentes para sugestões no NF manual
-- Rode no SQL Editor do Supabase (após create_ultrafrio_enderecamento.sql).

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

-- Preenche com remetentes já existentes nas notas (se houver).
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
