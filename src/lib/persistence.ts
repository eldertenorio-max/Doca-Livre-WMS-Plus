import { sanitizarNotasEntrada, todosItensEnderecados } from './excluirItemNf'
import {
  contarEnderecosPersistidos,
  limparMovimentosEntradaOrfaos,
  migrarRuasNosDados,
  recuperarEnderecosPerdidos,
  sincronizarMovimentosEntrada,
} from './movimentos'
import { syncVinculosNotas } from './nfCanceladas'
import { emitentesFromPersisted } from './emitentesRegistry'
import type { NotaFiscal, PersistedData } from '../types'

function normalizarStatusNotas(notas: NotaFiscal[]): NotaFiscal[] {
  return sanitizarNotasEntrada(
    notas.map((nf) => {
      if (nf.status === 'em_andamento' && todosItensEnderecados(nf)) {
        return { ...nf, status: 'concluida' as const }
      }
      return nf
    }),
  )
}

export function normalizePersistedData(data: PersistedData): PersistedData {
  const base = limparMovimentosEntradaOrfaos(
    syncVinculosNotas(
      recuperarEnderecosPerdidos(
        sincronizarMovimentosEntrada(migrarRuasNosDados(data)),
      ),
    ),
  )
  return {
    ...base,
    notas: normalizarStatusNotas(base.notas),
    emitentes: base.emitentes?.length ? base.emitentes : emitentesFromPersisted(base),
  }
}

/** Dados vindos da nuvem — sem mesclar com localStorage do navegador. */
export function prepareLoadedData(remote: PersistedData): PersistedData {
  return normalizePersistedData(remote)
}

export function prepareLoadedDataWithRepair(remote: PersistedData): {
  data: PersistedData
  enderecosRecuperados: number
} {
  const antes = contarEnderecosPersistidos(remote)
  const data = normalizePersistedData(remote)
  const depois = contarEnderecosPersistidos(data)
  return { data, enderecosRecuperados: Math.max(0, depois - antes) }
}
