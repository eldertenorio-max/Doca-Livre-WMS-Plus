-- Totais da NF (peso, valor, volume)
-- Rode no SQL Editor do Supabase se usar sincronização na nuvem.

alter table public.ultrafrio_notas_fiscais
  add column if not exists peso_bruto numeric,
  add column if not exists peso_liquido numeric,
  add column if not exists valor_total_nota numeric,
  add column if not exists quantidade_volume text;
