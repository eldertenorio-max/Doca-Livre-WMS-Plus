-- Campos opcionais de entrada por item (UP, lote, datas)
-- Rode no SQL Editor do Supabase se usar sincronização na nuvem.

alter table public.ultrafrio_nf_itens
  add column if not exists up text,
  add column if not exists lote text,
  add column if not exists data_fabricacao text,
  add column if not exists data_validade text;
