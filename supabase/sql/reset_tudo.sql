-- Zera estoque, histórico e dados de permanência das NFs (Financeiro → Data de entrada).
-- Mantém: cadastro de remetentes, tabelas de frete, clientes e contratos financeiros.

delete from public.ultrafrio_movimentos;
delete from public.ultrafrio_notas_canceladas;
delete from public.ultrafrio_enderecamentos;
delete from public.ultrafrio_nf_itens;
delete from public.ultrafrio_notas_fiscais;
