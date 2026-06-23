export type EntradaCampoId = 'up' | 'lote' | 'dataFabricacao' | 'dataValidade'

export type EntradaCamposConfig = Record<EntradaCampoId, boolean>

export type EntradaItemCampos = {
  up?: string
  lote?: string
  dataFabricacao?: string
  dataValidade?: string
}

export const ENTRADA_CAMPOS_KEY = 'ultrafrio-entrada-campos-v1'

export const ENTRADA_CAMPOS_DEFAULT: EntradaCamposConfig = {
  up: false,
  lote: false,
  dataFabricacao: false,
  dataValidade: false,
}

export const ENTRADA_CAMPOS_LIST: { id: EntradaCampoId; label: string }[] = [
  { id: 'up', label: 'UP' },
  { id: 'lote', label: 'Lote' },
  { id: 'dataFabricacao', label: 'Data de fabricação' },
  { id: 'dataValidade', label: 'Data de validade' },
]

export function getStoredEntradaCampos(): EntradaCamposConfig {
  try {
    const raw = localStorage.getItem(ENTRADA_CAMPOS_KEY)
    if (!raw) return { ...ENTRADA_CAMPOS_DEFAULT }
    const parsed = JSON.parse(raw) as Partial<EntradaCamposConfig>
    return { ...ENTRADA_CAMPOS_DEFAULT, ...parsed }
  } catch {
    return { ...ENTRADA_CAMPOS_DEFAULT }
  }
}

export function storeEntradaCampos(config: EntradaCamposConfig) {
  try {
    localStorage.setItem(ENTRADA_CAMPOS_KEY, JSON.stringify(config))
  } catch {
    /* ignore */
  }
}

export function entradaCamposAtivos(config: EntradaCamposConfig): boolean {
  return ENTRADA_CAMPOS_LIST.some((c) => config[c.id])
}
