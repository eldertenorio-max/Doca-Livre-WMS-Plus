-- Ultrafrio — vozes cadastradas (sincronizam entre navegadores/computadores)
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
