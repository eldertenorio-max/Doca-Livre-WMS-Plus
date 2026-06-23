-- Tabela de NF-e canceladas e vínculo com nota substituta
CREATE TABLE IF NOT EXISTS ultrafrio_notas_canceladas (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL,
  serie TEXT DEFAULT '',
  chave TEXT DEFAULT '',
  emitente TEXT DEFAULT '',
  data_emissao TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  vinculo_nf_nova_id TEXT,
  vinculo_nf_nova_numero TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ultrafrio_canceladas_vinculo
  ON ultrafrio_notas_canceladas (vinculo_nf_nova_id);

ALTER TABLE ultrafrio_notas_canceladas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_ultrafrio_notas_canceladas"
  ON ultrafrio_notas_canceladas
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
