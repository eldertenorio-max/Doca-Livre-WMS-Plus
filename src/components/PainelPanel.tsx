import { useMemo } from 'react'
import {
  PAINEL_GRAFICOS_FIXOS,
  filtrarMovimentos,
  resumoPeriodo,
  type PainelFiltros,
} from '../lib/painelAnalytics'
import type { MovimentoRegistro, NotaFiscal } from '../types'
import { PainelGraficoCard } from './PainelGraficoCard'

type Props = {
  filtros: PainelFiltros
  movimentos: MovimentoRegistro[]
  notas: NotaFiscal[]
  onFiltrosChange: (patch: Partial<PainelFiltros>) => void
}

export function PainelPanel({ filtros, movimentos, notas, onFiltrosChange }: Props) {
  const filtrados = useMemo(() => filtrarMovimentos(movimentos, filtros), [movimentos, filtros])
  const resumo = resumoPeriodo(filtros, filtrados.length)

  return (
    <>
      <div className="sidebar-block">
        <p className="muted painel-intro">
          Indicadores do histórico de movimentos. Ajuste o período abaixo para refinar os gráficos.
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

      <div className="sidebar-block painel-sidebar-graficos">
        {PAINEL_GRAFICOS_FIXOS.map((id) => (
          <PainelGraficoCard
            key={id}
            id={id}
            filtros={filtros}
            movimentos={movimentos}
            notas={notas}
          />
        ))}
      </div>
    </>
  )
}
