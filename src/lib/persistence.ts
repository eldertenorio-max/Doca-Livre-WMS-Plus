import { migrarRuasNosDados, sincronizarMovimentosEntrada } from './movimentos'
import { syncVinculosNotas } from './nfCanceladas'
import { emitentesFromPersisted } from './emitentesRegistry'
import type { PersistedData } from '../types'

export function normalizePersistedData(data: PersistedData): PersistedData {
  const base = syncVinculosNotas(sincronizarMovimentosEntrada(migrarRuasNosDados(data)))
  return {
    ...base,
    emitentes: base.emitentes?.length ? base.emitentes : emitentesFromPersisted(base),
  }
}

/** Dados vindos da nuvem — sem mesclar com localStorage do navegador. */
export function prepareLoadedData(remote: PersistedData): PersistedData {
  return normalizePersistedData(remote)
}
