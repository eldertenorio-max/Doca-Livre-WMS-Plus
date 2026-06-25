import type { NfeItem } from '../types'

/** Unidades de medida de peso na NF-e. */
export function isUnidadePeso(unidade: string): boolean {
  const u = unidade.trim().toUpperCase()
  return u === 'KG' || u === 'KGM' || u === 'QUILO' || u === 'QUILOGRAMA'
}

/** Peso por caixa indicado na descrição (ex.: "CX 20KG", "CX20KG"). */
export function kgPorCaixaFromDescricao(descricao: string): number | null {
  const m =
    descricao.match(/\bCX\s*(\d+(?:[.,]\d+)?)\s*KG\b/i) ??
    descricao.match(/\bCX(\d+(?:[.,]\d+)?)\s*KG\b/i)
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  return n > 0 ? n : null
}

/** Peso em kg do item quando a NF informa qCom/uCom em KG. */
export function pesoKgItem(item: NfeItem): number | undefined {
  if (item.pesoLiquido != null) return item.pesoLiquido
  if (item.pesoBruto != null) return item.pesoBruto
  if (isUnidadePeso(item.unidade) && item.quantidade > 0) return item.quantidade
  return undefined
}

function caixasFromPesoKg(item: NfeItem): number | null {
  const kgCx = kgPorCaixaFromDescricao(item.descricao)
  if (!kgCx) return null
  const peso = pesoKgItem(item)
  if (peso == null || peso <= 0) return null
  const caixas = peso / kgCx
  if (caixas < 1 || Math.abs(caixas - Math.round(caixas)) > 0.02) return null
  return Math.round(caixas)
}

/** Quantidade comercial para estoque/saída (caixas quando a NF traz peso em KG). */
export function quantidadeEstoqueItem(item: NfeItem): number {
  if (!isUnidadePeso(item.unidade)) return item.quantidade

  const caixas = caixasFromPesoKg(item)
  if (caixas != null) return caixas

  if (item.valorUnitario != null && item.valorUnitario > 0 && item.valorTotal != null && item.valorTotal > 0) {
    const porValor = item.valorTotal / item.valorUnitario
    if (porValor > 0 && porValor < item.quantidade * 0.95) {
      const diffRel = (item.quantidade - porValor) / item.quantidade
      if (diffRel > 0.05) return porValor
    }
  }

  return item.quantidade
}

/** Unidade exibida na saída/estoque (CX quando convertido a partir de KG). */
export function unidadeEstoqueItem(item: NfeItem): string {
  if (!isUnidadePeso(item.unidade)) return item.unidade
  if (caixasFromPesoKg(item) != null) return 'CX'
  return item.unidade
}
