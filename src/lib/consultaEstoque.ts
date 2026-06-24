import type { AddressId, NotaFiscal } from '../types'
import { normNumero } from './nfDuplicate'

export type ConsultaEstoqueFiltros = {
  nfNumero: string
  item: string
  remetente: string
  lote: string
}

export type ConsultaEstoqueResultado = {
  addressId: AddressId
  nfId: string
  nfNumero: string
  emitente: string
  itemIndex: number
  codigo: string
  descricao: string
  lote?: string
  up?: string
}

export const CONSULTA_FILTROS_VAZIOS: ConsultaEstoqueFiltros = {
  nfNumero: '',
  item: '',
  remetente: '',
  lote: '',
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

function nfNumeroCoincide(nfNumero: string, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  const normNf = normNumero(nfNumero)
  const normQ = normNumero(q)
  return normNf.includes(normQ) || normNf === normQ || nfNumero.toLowerCase().includes(norm(q))
}

export function temFiltroConsulta(filtros: ConsultaEstoqueFiltros): boolean {
  return Object.values(filtros).some((v) => v.trim().length > 0)
}

export function buscarEstoque(
  notas: NotaFiscal[],
  filtros: ConsultaEstoqueFiltros,
): ConsultaEstoqueResultado[] {
  const nfQ = norm(filtros.nfNumero)
  const itemQ = norm(filtros.item)
  const remQ = norm(filtros.remetente)
  const loteQ = norm(filtros.lote)

  if (!nfQ && !itemQ && !remQ && !loteQ) return []

  const results: ConsultaEstoqueResultado[] = []

  for (const nf of notas) {
    if (remQ && !nf.emitente.toLowerCase().includes(remQ)) continue
    if (nfQ && !nfNumeroCoincide(nf.numero, filtros.nfNumero)) continue

    for (const item of nf.items) {
      if (item.allocatedAddresses.length === 0) continue
      if (itemQ) {
        const codigo = item.codigo.toLowerCase()
        const descricao = item.descricao.toLowerCase()
        if (!codigo.includes(itemQ) && !descricao.includes(itemQ)) continue
      }
      if (loteQ && !(item.lote ?? '').toLowerCase().includes(loteQ)) continue

      for (const addressId of item.allocatedAddresses) {
        results.push({
          addressId,
          nfId: nf.id,
          nfNumero: nf.numero,
          emitente: nf.emitente,
          itemIndex: item.index,
          codigo: item.codigo,
          descricao: item.descricao,
          ...(item.lote ? { lote: item.lote } : {}),
          ...(item.up ? { up: item.up } : {}),
        })
      }
    }
  }

  return results
}
