import { useMemo } from 'react'
import {
  PAINEL_GRAFICOS_SUGESTOES,
  filtrarMovimentos,
  resumoPeriodo,
  type PainelFiltros,
  type PainelGraficoId,
} from '../lib/painelAnalytics'
import type { MovimentoRegistro } from '../types'

type Props = {
  filtros: PainelFiltros
  graficosAtivos: PainelGraficoId[]
  movimentos: MovimentoRegistro[]
  onFiltrosChange: (patch: Partial<PainelFiltros>) => void
  onAdicionarGrafico: (id: PainelGraficoId) => void
  onRemoverGrafico: (id: PainelGraficoId) => void
  onLimparGraficos: () => void
}

export function PainelPanel({
  filtros,
  graficosAtivos,
  movimentos,
  onFiltrosChange,
  onAdicionarGrafico,
  onRemoverGrafico,
  onLimparGraficos,
}: Props) {
  const filtrados = useMemo(() => filtrarMovimentos(movimentos, filtros), [movimentos, filtros])
  const resumo = resumoPeriodo(filtros, filtrados.length)

  const sugestoesDisponiveis = PAINEL_GRAFICOS_SUGESTOES.filter((g) => !graficosAtivos.includes(g.id))

  return (
    <>
      <div className="sidebar-block">
        <p className="muted painel-intro">
          Defina o período e adicione gráficos ao painel principal. Os dados vêm do histórico de
          movimentos.
        </p>

        <fieldset className="painel-filtros">
          <legend className="painel-filtros-title">Período</legend>

          <label className="painel-filtro-campo">
            <span>Data início</span>
            <input
              type="date"
              className="input-nf"
              value={filtros.dataInicio}
              onChange={(e) => onFiltrosChange({ dataInicio: e.target.value })}
            />
          </label>
          <label className="painel-filtro-campo">
            <span>Hora início</span>
            <input
              type="time"
              className="input-nf"
              value={filtros.horaInicio}
              onChange={(e) => onFiltrosChange({ horaInicio: e.target.value })}
            />
          </label>
          <label className="painel-filtro-campo">
            <span>Data fim</span>
            <input
              type="date"
              className="input-nf"
              value={filtros.dataFim}
              onChange={(e) => onFiltrosChange({ dataFim: e.target.value })}
            />
          </label>
          <label className="painel-filtro-campo">
            <span>Hora fim</span>
            <input
              type="time"
              className="input-nf"
              value={filtros.horaFim}
              onChange={(e) => onFiltrosChange({ horaFim: e.target.value })}
            />
          </label>
        </fieldset>

        <p className="muted painel-resumo">{resumo}</p>
      </div>

      {graficosAtivos.length > 0 && (
        <div className="sidebar-block">
          <div className="painel-ativo-head">
            <h3 className="nf-section-title nf-section-title--sm">No painel ({graficosAtivos.length})</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onLimparGraficos}>
              Limpar
            </button>
          </div>
          <ul className="painel-ativo-list">
            {graficosAtivos.map((id) => {
              const meta = PAINEL_GRAFICOS_SUGESTOES.find((g) => g.id === id)
              return (
                <li key={id} className="painel-ativo-item">
                  <span>{meta?.titulo ?? id}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onRemoverGrafico(id)}
                    aria-label={`Remover ${meta?.titulo}`}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="sidebar-block">
        <h3 className="nf-section-title nf-section-title--sm">Sugestões de gráficos</h3>
        {sugestoesDisponiveis.length === 0 ? (
          <p className="muted">Todos os gráficos sugeridos já estão no painel.</p>
        ) : (
          <ul className="painel-sugestoes">
            {sugestoesDisponiveis.map((g) => (
              <li key={g.id} className="painel-sugestao-card">
                <div className="painel-sugestao-body">
                  <strong>{g.titulo}</strong>
                  <p className="muted">{g.descricao}</p>
                  <span className="painel-sugestao-tag">{labelCategoria(g.categoria)}</span>
                </div>
                <button
                  type="button"
                  className="btn primary btn-sm painel-sugestao-add"
                  onClick={() => onAdicionarGrafico(g.id)}
                >
                  Adicionar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function labelCategoria(c: 'movimentacao' | 'estoque' | 'operacao'): string {
  if (c === 'movimentacao') return 'Movimentação'
  if (c === 'estoque') return 'Estoque'
  return 'Operação'
}
