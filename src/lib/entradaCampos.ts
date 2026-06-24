export type EntradaItemCampos = {
  up?: string
  lote?: string
  dataFabricacao?: string
  dataValidade?: string
}

export function pickItemCampos(fields: EntradaItemCampos): EntradaItemCampos {
  const out: EntradaItemCampos = {}
  const up = fields.up?.trim()
  const lote = fields.lote?.trim()
  const dataFabricacao = fields.dataFabricacao?.trim()
  const dataValidade = fields.dataValidade?.trim()
  if (up) out.up = up
  if (lote) out.lote = lote
  if (dataFabricacao) out.dataFabricacao = dataFabricacao
  if (dataValidade) out.dataValidade = dataValidade
  return out
}
