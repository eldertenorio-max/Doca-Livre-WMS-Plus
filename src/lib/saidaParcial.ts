import { enderecosDaNf } from './movimentos'
import { patchNfeItemQuantidade } from './desmembrarItem'
import { isUnidadePeso, quantidadeEstoqueItem } from './nfeUnidades'
import type { AddressId, MovimentoItemSnapshot, NfeItem, NotaFiscal } from '../types'

export type SaidaItemDraft = {
  itemIndex: number
  quantidadeSaida: number
}

export type SaidaPaleteDraft = {
  addressId: AddressId
  itemIndex: number
  quantidadeCaixas: number
}

export type SaidaPaleteCalculo = {
  addressId: AddressId
  itemIndex: number
  quantidadeCaixas: number
  quantidadeEstoque: number
  quantidadeSobra: number
  unidade: string
  pesoBrutoSaida?: number
  pesoLiquidoSaida?: number
  valorTotalSaida?: number
  liberaPalete: boolean
}

function ratio(qtd: number, total: number): number {
  if (total <= 0) return 0
  return qtd / total
}

/** Paletes ainda não confirmados na saída em andamento. */
export function paletesDisponiveisNf(
  nf: NotaFiscal,
  confirmados: SaidaPaleteDraft[],
): number {
  const confirmadosSet = new Set(confirmados.map((p) => p.addressId))
  return enderecosDaNf(nf).filter((a) => !confirmadosSet.has(a)).length
}

export function paletesDisponiveisItem(
  item: NfeItem,
  confirmados: SaidaPaleteDraft[],
): number {
  const confirmadosSet = new Set(confirmados.map((p) => p.addressId))
  return item.allocatedAddresses.filter((a) => !confirmadosSet.has(a)).length
}

export function sobraItem(
  item: NfeItem,
  confirmados: SaidaPaleteDraft[],
): number {
  const qtd = quantidadeEstoqueItem(item)
  const saido = confirmados
    .filter((p) => p.itemIndex === item.index)
    .reduce((s, p) => s + p.quantidadeCaixas, 0)
  return Math.max(0, qtd - saido)
}

export function parseQuantidadeSaida(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return 0
  const n = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Caixas atribuídas a cada palete do item (média quando há vários paletes). */
export function caixasPorPalete(item: NfeItem): number {
  const qtd = quantidadeEstoqueItem(item)
  const n = item.allocatedAddresses.length
  if (n <= 0) return qtd
  return qtd / n
}

function quantidadeTotalItens(items: NfeItem[]): number {
  return items.reduce((s, it) => s + it.quantidade, 0)
}

/** Peso bruto total do item — proporcional à qtd. na NF (transporte). */
export function pesoBrutoTotalItem(nf: NotaFiscal, item: NfeItem): number | undefined {
  const qtdTotal = quantidadeTotalItens(nf.items)
  if (nf.pesoBruto != null && qtdTotal > 0) {
    return nf.pesoBruto * (item.quantidade / qtdTotal)
  }
  if (item.pesoBruto != null) return item.pesoBruto
  return undefined
}

/** Peso líquido total do item — proporcional ao peso bruto ou valor na NF. */
export function pesoLiquidoTotalItem(nf: NotaFiscal, item: NfeItem): number | undefined {
  if (item.pesoLiquido != null) return item.pesoLiquido

  const pesoBruto = pesoBrutoTotalItem(nf, item)
  if (nf.pesoLiquido != null && pesoBruto != null && nf.pesoBruto != null && nf.pesoBruto > 0) {
    return nf.pesoLiquido * (pesoBruto / nf.pesoBruto)
  }

  if (isUnidadePeso(item.unidade) && item.quantidade > 0) {
    return item.quantidade
  }

  if (nf.pesoLiquido != null && item.valorTotal != null && item.valorTotal > 0) {
    const valorItens = nf.items.reduce((s, it) => s + (it.valorTotal ?? 0), 0)
    if (valorItens > 0) {
      return nf.pesoLiquido * (item.valorTotal / valorItens)
    }
  }

  const qtdTotal = quantidadeTotalItens(nf.items)
  if (nf.pesoLiquido != null && qtdTotal > 0 && nf.items.every((it) => it.unidade === item.unidade)) {
    return nf.pesoLiquido * (item.quantidade / qtdTotal)
  }

  return undefined
}

/** @deprecated Use pesoLiquidoTotalItem */
export function pesoLiquidoItem(nf: NotaFiscal, item: NfeItem): number | undefined {
  return pesoLiquidoTotalItem(nf, item)
}

export function caixasJaSaidasItem(
  itemIndex: number,
  paletes: SaidaPaleteDraft[],
  excetoAddressId?: AddressId,
): number {
  return paletes
    .filter((p) => p.itemIndex === itemIndex && p.addressId !== excetoAddressId)
    .reduce((s, p) => s + p.quantidadeCaixas, 0)
}

export function calcularSaidaPalete(
  nf: NotaFiscal,
  item: NfeItem,
  addressId: AddressId,
  quantidadeCaixas: number,
  paletesConfirmados: SaidaPaleteDraft[],
): SaidaPaleteCalculo | null {
  if (!item.allocatedAddresses.includes(addressId)) return null
  if (quantidadeCaixas <= 0) return null

  const qtdItem = quantidadeEstoqueItem(item)
  const jaSaido = caixasJaSaidasItem(item.index, paletesConfirmados)
  const disponivel = qtdItem - jaSaido
  if (quantidadeCaixas > disponivel + 1e-9) return null

  const quantidadeSobra = qtdItem - jaSaido - quantidadeCaixas
  const r = ratio(quantidadeCaixas, qtdItem)
  const pesoBrutoTotal = pesoBrutoTotalItem(nf, item)
  const pesoLiquidoTotal = pesoLiquidoTotalItem(nf, item)
  const capPalete = caixasPorPalete(item)
  const liberaPalete =
    quantidadeSobra <= 1e-9 || quantidadeCaixas >= capPalete - 1e-6

  return {
    addressId,
    itemIndex: item.index,
    quantidadeCaixas,
    quantidadeEstoque: qtdItem,
    quantidadeSobra,
    unidade: item.unidade,
    ...(pesoBrutoTotal != null ? { pesoBrutoSaida: pesoBrutoTotal * r } : {}),
    ...(pesoLiquidoTotal != null ? { pesoLiquidoSaida: pesoLiquidoTotal * r } : {}),
    ...(item.valorTotal != null
      ? { valorTotalSaida: item.valorTotal * r }
      : item.valorUnitario != null
        ? { valorTotalSaida: item.valorUnitario * quantidadeCaixas }
        : {}),
    liberaPalete,
  }
}

export type TotaisSaidaItem = {
  caixas: number
  pesoBruto: number
  pesoLiquido: number
  valor: number
  sobra: number
}

export type SaidaResumoPalete = {
  addressId: AddressId
  quantidadeCaixas: number
  pesoBruto?: number
  pesoLiquido?: number
  valor?: number
}

export type SaidaResumoItem = {
  itemIndex: number
  codigo: string
  descricao: string
  unidade: string
  paletes: SaidaResumoPalete[]
  caixas: number
  pesoBruto: number
  pesoLiquido: number
  valor: number
}

export type ResumoSaidaNf = {
  itens: SaidaResumoItem[]
  totalPaletes: number
  totalCaixas: number
  pesoBruto: number
  pesoLiquido: number
  valor: number
}

export function totaisSaidaItem(
  nf: NotaFiscal,
  item: NfeItem,
  paletesConfirmados: SaidaPaleteDraft[],
): TotaisSaidaItem {
  const drafts = paletesConfirmados.filter((p) => p.itemIndex === item.index)
  let caixas = 0
  let pesoBruto = 0
  let pesoLiquido = 0
  let valor = 0
  for (const p of drafts) {
    const c = calcularSaidaPalete(nf, item, p.addressId, p.quantidadeCaixas, [])
    if (!c) continue
    caixas += p.quantidadeCaixas
    pesoBruto += c.pesoBrutoSaida ?? 0
    pesoLiquido += c.pesoLiquidoSaida ?? 0
    valor += c.valorTotalSaida ?? 0
  }
  return {
    caixas,
    pesoBruto,
    pesoLiquido,
    valor,
    sobra: sobraItem(item, paletesConfirmados),
  }
}

export function resumoSaidaNf(
  nf: NotaFiscal,
  paletesConfirmados: SaidaPaleteDraft[],
): ResumoSaidaNf {
  const byItem = new Map<number, SaidaPaleteDraft[]>()
  for (const p of paletesConfirmados) {
    const list = byItem.get(p.itemIndex) ?? []
    list.push(p)
    byItem.set(p.itemIndex, list)
  }

  const itens: SaidaResumoItem[] = []
  let totalPaletes = 0
  let totalCaixas = 0
  let pesoBruto = 0
  let pesoLiquido = 0
  let valor = 0

  for (const [itemIndex, drafts] of byItem) {
    const item = nf.items.find((it) => it.index === itemIndex)
    if (!item) continue

    const paletes: SaidaResumoPalete[] = drafts.map((p) => {
      const c = calcularSaidaPalete(nf, item, p.addressId, p.quantidadeCaixas, [])
      return {
        addressId: p.addressId,
        quantidadeCaixas: p.quantidadeCaixas,
        ...(c?.pesoBrutoSaida != null ? { pesoBruto: c.pesoBrutoSaida } : {}),
        ...(c?.pesoLiquidoSaida != null ? { pesoLiquido: c.pesoLiquidoSaida } : {}),
        ...(c?.valorTotalSaida != null ? { valor: c.valorTotalSaida } : {}),
      }
    })

    const t = totaisSaidaItem(nf, item, paletesConfirmados)
    itens.push({
      itemIndex,
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      paletes,
      caixas: t.caixas,
      pesoBruto: t.pesoBruto,
      pesoLiquido: t.pesoLiquido,
      valor: t.valor,
    })
    totalPaletes += drafts.length
    totalCaixas += t.caixas
    pesoBruto += t.pesoBruto
    pesoLiquido += t.pesoLiquido
    valor += t.valor
  }

  itens.sort((a, b) => a.itemIndex - b.itemIndex)

  return {
    itens,
    totalPaletes,
    totalCaixas,
    pesoBruto,
    pesoLiquido,
    valor,
  }
}

export function consolidarDraftsPorItem(paletes: SaidaPaleteDraft[]): SaidaItemDraft[] {
  const map = new Map<number, number>()
  for (const p of paletes) {
    map.set(p.itemIndex, (map.get(p.itemIndex) ?? 0) + p.quantidadeCaixas)
  }
  return [...map.entries()].map(([itemIndex, quantidadeSaida]) => ({
    itemIndex,
    quantidadeSaida,
  }))
}

export function enderecosALiberar(
  nf: NotaFiscal,
  paletes: SaidaPaleteDraft[],
): AddressId[] {
  const liberar: AddressId[] = []
  for (const p of paletes) {
    const item = nf.items.find((it) => it.index === p.itemIndex)
    if (!item) continue
    const jaSaido = caixasJaSaidasItem(item.index, paletes, p.addressId)
    const disponivel = item.quantidade - jaSaido
    const cap = Math.min(disponivel, caixasPorPalete(item))
    if (p.quantidadeCaixas >= cap - 1e-6) liberar.push(p.addressId)
  }
  return liberar
}

export function sobrasPorItem(
  items: NfeItem[],
  paletes: SaidaPaleteDraft[],
): Record<number, number> {
  const saido = new Map<number, number>()
  for (const p of paletes) {
    saido.set(p.itemIndex, (saido.get(p.itemIndex) ?? 0) + p.quantidadeCaixas)
  }
  const sobras: Record<number, number> = {}
  for (const item of items) {
    const qtd = quantidadeEstoqueItem(item)
    sobras[item.index] = Math.max(0, qtd - (saido.get(item.index) ?? 0))
  }
  return sobras
}

export function aplicarSaidaPaletes(nf: NotaFiscal, paletes: SaidaPaleteDraft[]): NotaFiscal {
  const itemDrafts = consolidarDraftsPorItem(paletes)
  const liberar = new Set(enderecosALiberar(nf, paletes))
  return aplicarSaidaParcial(nf, itemDrafts, [...liberar])
}

export function aplicarSaidaParcial(
  nf: NotaFiscal,
  saidas: SaidaItemDraft[],
  addressIds: AddressId[],
): NotaFiscal {
  const saidaMap = new Map(saidas.map((s) => [s.itemIndex, s.quantidadeSaida]))
  const pickAddr = new Set(addressIds)

  const items = nf.items
    .map((it) => {
      const qSaida = saidaMap.get(it.index) ?? 0
      if (qSaida <= 0) return it

      const qtdItem = quantidadeEstoqueItem(it)
      const sobraQtd = qtdItem - qSaida
      const addresses = it.allocatedAddresses.filter((a) => !pickAddr.has(a))

      if (sobraQtd <= 0) {
        return {
          ...it,
          quantidade: 0,
          allocatedAddresses: addresses,
          ...(it.valorTotal != null ? { valorTotal: 0 } : {}),
          ...(it.pesoBruto != null ? { pesoBruto: 0 } : {}),
        }
      }

      return patchNfeItemQuantidade({ ...it, allocatedAddresses: addresses }, sobraQtd)
    })
    .filter((it) => it.quantidade > 0 || it.allocatedAddresses.length > 0)

  return { ...nf, items }
}

export function snapshotSaidaPaletes(
  nf: NotaFiscal,
  paletes: SaidaPaleteDraft[],
): MovimentoItemSnapshot[] {
  const liberar = new Set(enderecosALiberar(nf, paletes))
  const snapshots: MovimentoItemSnapshot[] = []

  for (const p of paletes) {
    const item = nf.items.find((it) => it.index === p.itemIndex)
    if (!item) continue
    const calc = calcularSaidaPalete(nf, item, p.addressId, p.quantidadeCaixas, [])
    if (!calc) continue

    snapshots.push({
      itemIndex: item.index,
      codigo: item.codigo,
      descricao: item.descricao,
      quantidade: p.quantidadeCaixas,
      unidade: item.unidade,
      addressIds: [p.addressId],
      paletes: liberar.has(p.addressId) ? 1 : 0,
      quantidadeSaida: p.quantidadeCaixas,
      quantidadeSobra: calc.quantidadeSobra,
      ...(calc.pesoBrutoSaida != null ? { pesoBruto: calc.pesoBrutoSaida } : {}),
      ...(calc.pesoLiquidoSaida != null ? { pesoLiquido: calc.pesoLiquidoSaida } : {}),
      ...(calc.valorTotalSaida != null ? { valorTotal: calc.valorTotalSaida } : {}),
      ...(item.up ? { up: item.up } : {}),
      ...(item.lote ? { lote: item.lote } : {}),
      ...(item.dataFabricacao ? { dataFabricacao: item.dataFabricacao } : {}),
      ...(item.dataValidade ? { dataValidade: item.dataValidade } : {}),
    })
  }

  return snapshots
}

export function snapshotSaidaItens(
  nf: NotaFiscal,
  saidas: SaidaItemDraft[],
  addressIds: AddressId[],
): MovimentoItemSnapshot[] {
  const pick = new Set(addressIds)
  const saidaMap = new Map(saidas.map((s) => [s.itemIndex, s.quantidadeSaida]))
  const snapshots: MovimentoItemSnapshot[] = []

  for (const it of nf.items) {
    const qSaida = saidaMap.get(it.index) ?? 0
    if (qSaida <= 0) continue
    const ids = it.allocatedAddresses.filter((a) => pick.has(a))
    snapshots.push({
      itemIndex: it.index,
      codigo: it.codigo,
      descricao: it.descricao,
      quantidade: qSaida,
      unidade: it.unidade,
      addressIds: ids,
      paletes: ids.length,
      quantidadeSaida: qSaida,
      quantidadeSobra: it.quantidade - qSaida,
      ...(it.up ? { up: it.up } : {}),
      ...(it.lote ? { lote: it.lote } : {}),
      ...(it.dataFabricacao ? { dataFabricacao: it.dataFabricacao } : {}),
      ...(it.dataValidade ? { dataValidade: it.dataValidade } : {}),
    })
  }

  return snapshots
}
