import { itemEnderecamentoCompleto } from './paletes'
import type { NotaFiscal } from '../types'

export function podeExcluirItemNf(nf: NotaFiscal, itemIndex: number): boolean {
  if (nf.items.length <= 1) return false
  return nf.items.some((it) => it.index === itemIndex)
}

export function excluirItemNotaFiscal(nf: NotaFiscal, itemIndex: number): NotaFiscal | null {
  if (!podeExcluirItemNf(nf, itemIndex)) return null

  const items = nf.items.filter((it) => it.index !== itemIndex)
  let status = nf.status

  if (status === 'em_andamento' && items.every(itemEnderecamentoCompleto)) {
    status = 'concluida'
  }

  return { ...nf, items, status }
}
