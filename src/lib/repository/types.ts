import type { AppState, MovimentoRegistro, NotaFiscal, PersistedData } from '../../types'

export type StorageMode = 'local' | 'supabase'

export type EnderecamentoRepository = {
  mode: StorageMode
  loadData: () => Promise<PersistedData>
  saveData: (data: Omit<PersistedData, 'emitentes'>) => Promise<void>
  registrarEmitente: (nome: string) => Promise<void>
  loadUiPrefs: () => Pick<AppState, 'activeNfId' | 'activeItemIndex'>
  saveUiPrefs: (prefs: Pick<AppState, 'activeNfId' | 'activeItemIndex'>) => void
}

export type { NotaFiscal, MovimentoRegistro, PersistedData }
