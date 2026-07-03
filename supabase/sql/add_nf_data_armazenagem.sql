alter table public.ultrafrio_notas_fiscais
  add column if not exists data_armazenagem date;

update public.ultrafrio_notas_fiscais
set data_armazenagem = coalesce(data_armazenagem, created_at::date)
where data_armazenagem is null;

comment on column public.ultrafrio_notas_fiscais.data_armazenagem
  is 'Data a partir da qual a armazenagem da NF começa a ser cobrada no Financeiro.';
