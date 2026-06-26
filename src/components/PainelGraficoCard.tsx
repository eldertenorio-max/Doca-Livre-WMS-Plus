import {
  dadosGrafico,
  tituloGrafico,
  tipoVisualGrafico,
  type PainelFiltros,
  type PainelGraficoId,
  type PainelSerie,
} from '../lib/painelAnalytics'
import type { MovimentoRegistro, NotaFiscal } from '../types'

type Props = {
  id: PainelGraficoId
  filtros: PainelFiltros
  movimentos: MovimentoRegistro[]
  notas: NotaFiscal[]
  onRemover?: () => void
}

export function PainelGraficoCard({ id, filtros, movimentos, notas, onRemover }: Props) {
  const series = dadosGrafico(id, movimentos, notas, filtros)
  const tipo = tipoVisualGrafico(id)
  const total = series.reduce((s, x) => s + x.value, 0)
  const vazio = total === 0

  return (
    <article className="painel-grafico-card">
      <header className="painel-grafico-head">
        <h3>{tituloGrafico(id)}</h3>
        {onRemover && (
          <button type="button" className="btn btn-ghost btn-sm painel-grafico-remove" onClick={onRemover}>
            Remover
          </button>
        )}
      </header>
      {vazio ? (
        <p className="muted painel-grafico-vazio">Sem dados no período selecionado.</p>
      ) : tipo === 'donut' ? (
        <DonutChart series={series} />
      ) : tipo === 'line' ? (
        <LineChart series={series} />
      ) : tipo === 'grouped-bar' ? (
        <GroupedBarChart series={series} />
      ) : (
        <BarChart series={series} horizontal />
      )}
    </article>
  )
}

function BarChart({ series, horizontal = false }: { series: PainelSerie[]; horizontal?: boolean }) {
  const max = Math.max(...series.map((s) => s.value), 1)
  return (
    <ul className={`painel-bar-chart${horizontal ? ' painel-bar-chart--horizontal' : ''}`}>
      {series.map((s) => (
        <li key={s.label}>
          <span className="painel-bar-label" title={s.label}>
            {s.label}
          </span>
          <div className="painel-bar-track">
            <div
              className="painel-bar-fill"
              style={{
                width: `${(s.value / max) * 100}%`,
                background: s.cor ?? 'var(--accent, #3b82f6)',
              }}
            />
          </div>
          <span className="painel-bar-val">{s.value}</span>
        </li>
      ))}
    </ul>
  )
}

function GroupedBarChart({ series }: { series: PainelSerie[] }) {
  const dias = [...new Set(series.map((s) => s.label.split(' · ')[0]))]
  const max = Math.max(...series.map((s) => s.value), 1)

  return (
    <div className="painel-grouped-chart">
      <ul className="painel-grouped-legend">
        <li><span className="painel-legend-swatch" style={{ background: '#22c55e' }} /> Entrada</li>
        <li><span className="painel-legend-swatch" style={{ background: '#f59e0b' }} /> Saída</li>
      </ul>
      <div className="painel-grouped-bars">
        {dias.map((dia) => {
          const ent = series.find((s) => s.label.startsWith(`${dia} · Ent`))?.value ?? 0
          const sai = series.find((s) => s.label.startsWith(`${dia} · Sai`))?.value ?? 0
          return (
            <div key={dia} className="painel-grouped-col">
              <div className="painel-grouped-stack">
                <div
                  className="painel-grouped-bar painel-grouped-bar--ent"
                  style={{ height: `${(ent / max) * 100}%` }}
                  title={`Entradas: ${ent}`}
                />
                <div
                  className="painel-grouped-bar painel-grouped-bar--sai"
                  style={{ height: `${(sai / max) * 100}%` }}
                  title={`Saídas: ${sai}`}
                />
              </div>
              <span className="painel-grouped-label">{dia}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LineChart({ series }: { series: PainelSerie[] }) {
  if (series.length === 0) return null
  const max = Math.max(...series.map((s) => s.value), 1)
  const w = 100
  const h = 48
  const step = series.length > 1 ? w / (series.length - 1) : 0
  const points = series
    .map((s, i) => {
      const x = series.length === 1 ? w / 2 : i * step
      const y = h - (s.value / max) * (h - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="painel-line-chart">
      <svg viewBox={`0 0 ${w} ${h + 8}`} preserveAspectRatio="none" className="painel-line-svg">
        <polyline
          fill="none"
          stroke={series[0]?.cor ?? '#6366f1'}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
      </svg>
      <ul className="painel-line-labels">
        {series.filter((_, i) => i % Math.ceil(series.length / 6 || 1) === 0).map((s) => (
          <li key={s.label}>{s.label}</li>
        ))}
      </ul>
    </div>
  )
}

function DonutChart({ series }: { series: PainelSerie[] }) {
  const total = series.reduce((s, x) => s + x.value, 0) || 1
  let acc = 0
  const stops = series.map((s) => {
    const start = (acc / total) * 100
    acc += s.value
    const end = (acc / total) * 100
    return `${s.cor ?? '#888'} ${start}% ${end}%`
  })

  return (
    <div className="painel-donut-wrap">
      <div
        className="painel-donut"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
        aria-hidden
      >
        <div className="painel-donut-hole">
          <strong>{total}</strong>
          <span>total</span>
        </div>
      </div>
      <ul className="painel-donut-legend">
        {series.map((s) => (
          <li key={s.label}>
            <span className="painel-legend-swatch" style={{ background: s.cor }} />
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
