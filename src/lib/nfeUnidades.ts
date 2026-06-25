import type { NfeItem } from '../types'

/** Unidades de medida de peso na NF-e. */
export function isUnidadePeso(unidade: string): boolean {
  const u = unidade.trim().toUpperCase()
  return u === 'KG' || u === 'KGM' || u === 'QUILO' || u === 'QUILOGRAMA'
}

/** Quantidade comercial para estoque/saída (corrige NF com qCom em KG e contagem em outra unidade). */
export function quantidadeEstoqueItem(item: NfeItem): number {
  if (item.valorUnitario != null && item.valorUnitario > 0 && item.valorTotal != null && item.valorTotal > 0) {
    const porValor = item.valorTotal / item.valorUnitario
    if (porValor > 0 && porValor < item.quantidade * 0.95) {
      const diffRel = (item.quantidade - porValor) / item.quantidade
      if (diffRel > 0.05) return porValor
    }
  }
  return item.quantidade
}
