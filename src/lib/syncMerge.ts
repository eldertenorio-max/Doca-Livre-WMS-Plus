import { todosItensEnderecados } from './excluirItemNf'
import { itemEnderecamentoCompleto } from './paletes'
import type { NotaFiscal, NfeItem, PersistedData } from '../types'

function entityById<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((x) => x.id === id)
}

function entityJson<T>(entity: T | undefined): string {
  return entity === undefined ? '__missing__' : JSON.stringify(entity)
}

function enderecoCount(nf: NotaFiscal): number {
  return nf.items.reduce((s, it) => s + it.allocatedAddresses.length, 0)
}

function nfCompleteness(nf: NotaFiscal): number {
  const completeItems = nf.items.filter(itemEnderecamentoCompleto).length
  const statusBonus = nf.status === 'concluida' ? 1_000_000 : 0
  return statusBonus + completeItems * 1_000 + enderecoCount(nf)
}

function mergeAllocatedAddresses(remote: string[], fallback: string[]): string[] {
  if (fallback.length > remote.length) return [...fallback]
  if (remote.length > fallback.length) return [...remote]
  return remote.length > 0 ? [...remote] : [...fallback]
}

function preserveOptionalItemFields(item: NfeItem, fallback: NfeItem): NfeItem {
  const allocatedAddresses = mergeAllocatedAddresses(item.allocatedAddresses, fallback.allocatedAddresses)
  return {
    ...item,
    allocatedAddresses,
    pesoBruto: item.pesoBruto ?? fallback.pesoBruto,
    valorUnitario: item.valorUnitario ?? fallback.valorUnitario,
    valorTotal: item.valorTotal ?? fallback.valorTotal,
    up: item.up || fallback.up,
    lote: item.lote || fallback.lote,
    dataFabricacao: item.dataFabricacao || fallback.dataFabricacao,
    dataValidade: item.dataValidade || fallback.dataValidade,
    paletes: item.paletes ?? fallback.paletes,
    localizacao: item.localizacao ?? fallback.localizacao,
  }
}

function mergeNfItems(primary: NotaFiscal, fallback: NotaFiscal): NfeItem[] {
  const primaryByIndex = new Map(primary.items.map((it) => [it.index, it]))
  const fallbackByIndex = new Map(fallback.items.map((it) => [it.index, it]))
  const indexes = new Set([...primaryByIndex.keys(), ...fallbackByIndex.keys()])
  return [...indexes]
    .sort((a, b) => a - b)
    .map((index) => {
      const primary = primaryByIndex.get(index)
      const fb = fallbackByIndex.get(index)
      if (primary && fb) return preserveOptionalItemFields(primary, fb)
      return (primary ?? fb)!
    })
}

function resolveNfStatus(
  nf: NotaFiscal,
  fallback: NotaFiscal,
  items: NfeItem[],
): NotaFiscal['status'] {
  if (fallback.status === 'concluida') return 'concluida'
  const candidate = { ...nf, items }
  if (todosItensEnderecados(candidate)) return 'concluida'
  if (nf.status === 'concluida') return 'concluida'
  return nf.status
}

function preserveOptionalNfFields(nf: NotaFiscal, fallback: NotaFiscal): NotaFiscal {
  const items = mergeNfItems(nf, fallback)
  return {
    ...nf,
    status: resolveNfStatus(nf, fallback, items),
    pesoBruto: nf.pesoBruto ?? fallback.pesoBruto,
    pesoLiquido: nf.pesoLiquido ?? fallback.pesoLiquido,
    valorTotalNota: nf.valorTotalNota ?? fallback.valorTotalNota,
    quantidadeVolume: nf.quantidadeVolume ?? fallback.quantidadeVolume,
    nfCanceladaOrigemId: nf.nfCanceladaOrigemId ?? fallback.nfCanceladaOrigemId,
    nfCanceladaOrigemNumero: nf.nfCanceladaOrigemNumero ?? fallback.nfCanceladaOrigemNumero,
    items,
  }
}

function pickBestNf(a: NotaFiscal, b: NotaFiscal): NotaFiscal {
  const scoreA = nfCompleteness(a)
  const scoreB = nfCompleteness(b)
  return scoreA >= scoreB ? a : b
}

function mergeSingleNotaFiscal(
  b: NotaFiscal | undefined,
  l: NotaFiscal | undefined,
  r: NotaFiscal | undefined,
): NotaFiscal | undefined {
  if (entityJson(b) !== entityJson(l)) {
    return l
  }

  if (entityJson(b) !== entityJson(r)) {
    if (r === undefined) return l
    const fallback = l ?? b
    if (!fallback) return r
    const fromRemote = preserveOptionalNfFields(r, fallback)
    const fromFallback = preserveOptionalNfFields(fallback, r)
    return pickBestNf(fromFallback, fromRemote)
  }

  return l
}

function mergeNotaFiscal(base: NotaFiscal[], local: NotaFiscal[], remote: NotaFiscal[]): NotaFiscal[] {
  const allIds = new Set([
    ...base.map((x) => x.id),
    ...local.map((x) => x.id),
    ...remote.map((x) => x.id),
  ])
  const result: NotaFiscal[] = []

  for (const id of allIds) {
    const merged = mergeSingleNotaFiscal(entityById(base, id), entityById(local, id), entityById(remote, id))
    if (merged !== undefined) result.push(merged)
  }

  return result
}

export function pickPersisted(state: {
  notas: PersistedData['notas']
  movimentos: PersistedData['movimentos']
  notasCanceladas: PersistedData['notasCanceladas']
  emitentes: PersistedData['emitentes']
}): PersistedData {
  return {
    notas: state.notas,
    movimentos: state.movimentos,
    notasCanceladas: state.notasCanceladas,
    emitentes: state.emitentes,
  }
}

export function persistedEquals(a: PersistedData, b: PersistedData): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Mescla base → local vs remoto: alterações locais prevalecem; o restante vem da nuvem. */
export function mergeEntityList<T extends { id: string }>(
  base: T[],
  local: T[],
  remote: T[],
): T[] {
  const allIds = new Set([
    ...base.map((x) => x.id),
    ...local.map((x) => x.id),
    ...remote.map((x) => x.id),
  ])
  const result: T[] = []

  for (const id of allIds) {
    const b = entityById(base, id)
    const l = entityById(local, id)
    const r = entityById(remote, id)

    if (entityJson(b) !== entityJson(l)) {
      if (l !== undefined) result.push(l)
      continue
    }

    if (entityJson(b) !== entityJson(r)) {
      if (r !== undefined) {
        result.push(r)
      } else if (entityJson(b) !== entityJson(l)) {
        // Remoto apagou, mas há alteração local — mantém local (recriação).
        if (l !== undefined) result.push(l)
      }
      // Remoto apagou e local = base — descarta (ex.: reset do banco).
      continue
    }

    if (l !== undefined) result.push(l)
  }

  return result
}

function mergeEmitentes(base: string[], local: string[], remote: string[]): string[] {
  const baseSet = new Set(base)
  const localChanged =
    base.length !== local.length || local.some((nome) => !baseSet.has(nome))

  if (localChanged) {
    return [...new Set([...local, ...remote])]
  }

  return [...new Set([...remote, ...base])]
}

export function mergePersistedData(
  base: PersistedData,
  local: PersistedData,
  remote: PersistedData,
): PersistedData {
  return {
    notas: mergeNotaFiscal(base.notas, local.notas, remote.notas),
    movimentos: mergeEntityList(base.movimentos, local.movimentos, remote.movimentos),
    notasCanceladas: mergeEntityList(base.notasCanceladas, local.notasCanceladas, remote.notasCanceladas),
    emitentes: mergeEmitentes(base.emitentes, local.emitentes, remote.emitentes),
  }
}
