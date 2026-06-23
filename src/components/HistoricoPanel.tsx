import type { MovimentoRegistro } from '../types'
import { formatAddressLabel } from '../layout/camaras'

type Props = {
  movimentos: MovimentoRegistro[]
  onExcluir: (id: string) => void
}

export function HistoricoPanel({ movimentos, onExcluir }: Props) {
  if (movimentos.length === 0) {
    return (
      <div className="sidebar-block">
        <p className="muted">Nenhum registro de entrada ou saída ainda.</p>
      </div>
    )
  }

  return (
    <div className="sidebar-block">
      <h3>Histórico</h3>
      <ul className="hist-list">
        {movimentos.map((mov) => {
          const totalEnd = mov.itens.reduce((s, it) => s + it.addressIds.length, 0)
          return (
            <li key={mov.id} className={`hist-card hist-card--${mov.tipo}`}>
              <div className="hist-head">
                <span className={`hist-tipo hist-tipo--${mov.tipo}`}>
                  {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </span>
                <button
                  type="button"
                  className="nf-remove"
                  title="Excluir registro"
                  onClick={() => onExcluir(mov.id)}
                >
                  ×
                </button>
              </div>
              <strong>NF {mov.nfNumero}</strong>
              <p className="muted hist-emitente">{mov.emitente || '—'}</p>
              <p className="muted">
                {formatDate(mov.createdAt)} · {mov.itens.length} item(ns) · {totalEnd} end.
              </p>
              <ul className="addr-mini">
                {mov.itens.flatMap((it) =>
                  it.addressIds.map((a) => (
                    <li key={`${mov.id}-${it.itemIndex}-${a}`}>
                      {it.codigo} — {formatAddressLabel(a)}
                    </li>
                  )),
                )}
              </ul>
              {mov.tipo === 'entrada' && (
                <p className="hist-hint">Excluir libera todas as posições desta entrada.</p>
              )}
              {mov.tipo === 'saida' && (
                <p className="hist-hint">Excluir restaura as posições desta saída.</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function formatDate(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString('pt-BR')
}
