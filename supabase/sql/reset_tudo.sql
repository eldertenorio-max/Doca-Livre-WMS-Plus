-- Zera estoque, histórico e financeiro derivado das NFs (rode no SQL Editor do Supabase se o script Node falhar).
-- Mantém cadastro de remetentes e tabelas de cobrança.

delete from public.ultrafrio_movimentos;
delete from public.ultrafrio_notas_canceladas;
delete from public.ultrafrio_enderecamentos;
delete from public.ultrafrio_nf_itens;
delete from public.ultrafrio_notas_fiscais;
delete from public.ultrafrio_fin_contratos;
delete from public.ultrafrio_fin_clientes;
