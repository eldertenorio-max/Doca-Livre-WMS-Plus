-- Ultrafrio — habilita sincronização em tempo real entre navegadores
-- Rode no SQL Editor do Supabase (após criar as tabelas).

alter table public.ultrafrio_notas_fiscais replica identity full;
alter table public.ultrafrio_nf_itens replica identity full;
alter table public.ultrafrio_enderecamentos replica identity full;
alter table public.ultrafrio_movimentos replica identity full;
alter table public.ultrafrio_notas_canceladas replica identity full;
alter table public.ultrafrio_cadastro_remetentes replica identity full;

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
    'ultrafrio_cadastro_remetentes'
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
