import { PainelGraficoCard } from './PainelGraficoCard'
import { resumoPeriodo, filtrarMovimentos, type PainelFiltros, type PainelGraficoId } from '../lib/painelAnalytics'
import type { MovimentoRegistro, NotaFiscal } from '../types'

type Props = {
  filtros: PainelFiltros
  graficosAtivos: PainelGraficoId[]
  movimentos: MovimentoRegistro[]
  notas: NotaFiscal[]
}

export function PainelDashboard({ filtros, graficosAtivos, movimentos, notas }: Props) {
  const filtrados = filtrarMovimentos(movimentos, filtros)

  if (graficosAtivos.length === 0) {
    return (
      <div className="painel-dashboard painel-dashboard--empty">
        <div className="painel-dashboard-empty-inner">
          <h2>Painel analítico</h2>
          <p className="muted">
            Escolha um ou mais gráficos na barra lateral para montar seu painel. Use os filtros de
            data e hora para refinar o período.
          </p>
          <p className="muted painel-resumo">{resumoPeriodo(filtros, filtrados.length)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="painel-dashboard">
      <header className="painel-dashboard-head">
        <div>
          <h2>Painel analítico</h2>
          <p className="muted painel-resumo">{resumoPeriodo(filtros, filtrados.length)}</p>
        </div>
      </header>
      <div className="painel-dashboard-grid">
        {graficosAtivos.map((id) => (
          <PainelGraficoCard
            key={id}
            id={id}
            filtros={filtros}
            movimentos={movimentos}
            notas={notas}
          />
        ))}
      </div>
    </div>
  )
}
