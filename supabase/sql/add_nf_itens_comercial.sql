-- Valores comerciais e peso por item (NF-e)
-- Rode no SQL Editor do Supabase se usar sincronização na nuvem.

alter table public.ultrafrio_nf_itens
  add column if not exists peso_bruto numeric,
  add column if not exists valor_unitario numeric,
  add column if not exists valor_total numeric;
