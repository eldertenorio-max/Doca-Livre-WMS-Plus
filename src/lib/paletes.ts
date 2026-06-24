import type { NfeItem } from '../types'

export function parsePaletesInput(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.floor(n)
}

export function paletesLimiteItem(item: NfeItem | null | undefined): number {
  const n = item?.paletes
  if (n == null || n <= 0) return 0
  return n
}

export function paletesRestantes(limite: number, selecionados: number): number {
  if (limite <= 0) return 0
  return Math.max(0, limite - selecionados)
}

export function podeAdicionarEndereco(limite: number, selecionados: number): boolean {
  if (limite <= 0) return false
  return selecionados < limite
}
