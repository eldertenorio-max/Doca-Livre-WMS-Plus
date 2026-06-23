import { migrarRuasNosDados, sincronizarMovimentosEntrada } from './movimentos'
import { syncVinculosNotas } from './nfCanceladas'
import { emitentesFromPersisted } from './emitentesRegistry'
import { getStorageMode } from './repository'
import { loadLocalPersistedData } from './repository/localRepository'
import { isSupabaseConfigured } from './supabaseClient'
import type { PersistedData } from '../types'

export function isPersistedEmpty(data: PersistedData): boolean {
  return (
    data.notas.length === 0 &&
    data.movimentos.length === 0 &&
    data.notasCanceladas.length === 0
  )
}

export function normalizePersistedData(data: PersistedData): PersistedData {
  const base = syncVinculosNotas(sincronizarMovimentosEntrada(migrarRuasNosDados(data)))
  return {
    ...base,
    emitentes: base.emitentes?.length ? base.emitentes : emitentesFromPersisted(base),
  }
}

export function prepareLoadedData(
  remote: PersistedData,
  options?: { allowLocalMigration?: boolean },
): { data: PersistedData; migratedFromLocal: boolean } {
  const normalized = normalizePersistedData(remote)

  if (
    options?.allowLocalMigration &&
    isSupabaseConfigured() &&
    getStorageMode() === 'supabase' &&
    isPersistedEmpty(normalized)
  ) {
    const local = normalizePersistedData(loadLocalPersistedData())
    if (!isPersistedEmpty(local)) {
      return { data: local, migratedFromLocal: true }
    }
  }

  return { data: normalized, migratedFromLocal: false }
}
