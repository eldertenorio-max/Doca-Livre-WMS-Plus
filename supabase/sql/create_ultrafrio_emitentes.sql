-- Ultrafrio — cadastro de emitentes para sugestões no NF manual
-- Rode no SQL Editor do Supabase (após create_ultrafrio_enderecamento.sql).

create table if not exists public.ultrafrio_emitentes (
  nome_key text primary key,
  nome text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_ultrafrio_emitentes_updated
  on public.ultrafrio_emitentes (updated_at desc);

alter table public.ultrafrio_emitentes enable row level security;

drop policy if exists ultrafrio_emitentes_all on public.ultrafrio_emitentes;
create policy ultrafrio_emitentes_all on public.ultrafrio_emitentes
  for all using (true) with check (true);

-- Preenche com emitentes já existentes nas notas (se houver).
insert into public.ultrafrio_emitentes (nome_key, nome, updated_at)
select distinct on (lower(trim(emitente)))
  lower(trim(emitente)),
  trim(emitente),
  now()
from public.ultrafrio_notas_fiscais
where trim(emitente) <> ''
  and lower(trim(emitente)) <> 'cadastro manual'
on conflict (nome_key) do nothing;

insert into public.ultrafrio_emitentes (nome_key, nome, updated_at)
select distinct on (lower(trim(emitente)))
  lower(trim(emitente)),
  trim(emitente),
  now()
from public.ultrafrio_notas_canceladas
where trim(emitente) <> ''
  and lower(trim(emitente)) <> 'cadastro manual'
on conflict (nome_key) do nothing;
