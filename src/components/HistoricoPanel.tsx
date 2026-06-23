import { useState } from 'react'
import type { MovimentoRegistro } from '../types'
import { formatAddressLabel } from '../layout/camaras'

type Props = {
  movimentos: MovimentoRegistro[]
  onExcluir: (id: string) => void
}

export function HistoricoPanel({ movimentos, onExcluir }: Props) {
  const [confirmar, setConfirmar] = useState<MovimentoRegistro | null>(null)

  function handleConfirmar() {
    if (!confirmar) return
    onExcluir(confirmar.id)
    setConfirmar(null)
  }

  if (movimentos.length === 0) {
    return <p className="muted">Nenhum registro de entrada ou saída ainda.</p>
  }

  return (
    <>
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
                  className="hist-delete"
                  title={mov.tipo === 'entrada' ? 'Excluir entrada' : 'Excluir saída'}
                  onClick={() => setConfirmar(mov)}
                >
                  <TrashIcon />
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
                <p className="hist-hint">Excluir remove apenas o registro do histórico.</p>
              )}
            </li>
          )
        })}
      </ul>

      {confirmar && (
        <div className="confirm-backdrop" onClick={() => setConfirmar(null)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <h4>Excluir {confirmar.tipo === 'entrada' ? 'entrada' : 'saída'}?</h4>
            <p>
              NF <strong>{confirmar.nfNumero}</strong>
            </p>
            {confirmar.tipo === 'entrada' ? (
              <p className="confirm-warn">
                As posições ocupadas serão liberadas e a NF será removida do sistema.
              </p>
            ) : (
              <p className="muted">
                O registro será removido do histórico. As posições no estoque não serão alteradas.
              </p>
            )}
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmar}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 13h10l1-13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatDate(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString('pt-BR')
}
