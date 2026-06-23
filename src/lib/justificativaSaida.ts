import type { JustificativaSaidaId } from '../types'

export type { JustificativaSaidaId }

export const JUSTIFICATIVAS_SAIDA: { id: JustificativaSaidaId; label: string }[] = [
  { id: 'venda', label: 'Venda' },
  { id: 'transferencia', label: 'Transferência' },
  { id: 'descarga', label: 'Descarga' },
  { id: 'devolucao_remessa', label: 'Devolução de remessa' },
  { id: 'acerto_estoque', label: 'Acerto de estoque' },
  { id: 'revenda', label: 'Revenda' },
]

export function labelJustificativaSaida(id: JustificativaSaidaId | undefined): string | null {
  if (!id) return null
  return JUSTIFICATIVAS_SAIDA.find((j) => j.id === id)?.label ?? id
}
