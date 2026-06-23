import { useMemo, useState } from 'react'
import { CAMARAS } from '../layout/camaras'

type Props = {
  selectedCamaras: number[]
  onToggleCamara: (id: number) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export function ImprimirPanel({
  selectedCamaras,
  onToggleCamara,
  onSelectAll,
  onClearAll,
}: Props) {
  const [orientacao, setOrientacao] = useState<'landscape' | 'portrait'>('landscape')
  const totalFolhas = useMemo(() => {
    return CAMARAS.filter((c) => selectedCamaras.includes(c.id)).reduce((s, c) => s + c.ruas.length, 0)
  }, [selectedCamaras])

  function handlePrint() {
    const styleId = 'print-page-style'
    let el = document.getElementById(styleId) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = styleId
      document.head.appendChild(el)
    }
    el.textContent = `@page { size: A4 ${orientacao}; margin: 12mm; }`
    window.print()
  }

  return (
    <div className="imprimir-panel">
      <p className="muted">
        Gera o layout em branco para impressão. Cada rua ocupa uma folha inteira — ideal para frente e verso
        (Rua 1 na frente, Rua 2 no verso).
      </p>

      <div className="sidebar-block">
        <div className="imprimir-toolbar">
          <h4>Câmaras</h4>
          <div className="imprimir-toolbar-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onSelectAll}>
              Todas
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClearAll}>
              Limpar
            </button>
          </div>
        </div>

        <ul className="imprimir-cam-list">
          {CAMARAS.map((cam) => {
            const checked = selectedCamaras.includes(cam.id)
            return (
              <li key={cam.id}>
                <label className="imprimir-cam-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleCamara(cam.id)}
                  />
                  <span>
                    <strong>Câmara {cam.id}</strong>
                    <span className="muted"> · {cam.ruas.length} ruas ({cam.ruas.map((r) => `R${r.rua}`).join(' + ')})</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="sidebar-block">
        <h4>Orientação</h4>
        <div className="imprimir-orientacao">
          <label className="imprimir-orient-item">
            <input
              type="radio"
              name="print-orient"
              checked={orientacao === 'landscape'}
              onChange={() => setOrientacao('landscape')}
            />
            Paisagem (recomendado)
          </label>
          <label className="imprimir-orient-item">
            <input
              type="radio"
              name="print-orient"
              checked={orientacao === 'portrait'}
              onChange={() => setOrientacao('portrait')}
            />
            Retrato
          </label>
        </div>
      </div>

      <div className="sidebar-block imprimir-duplex-box">
        <h4>Frente e verso</h4>
        <p className="muted">
          Na impressora, ative <strong>impressão duplex</strong> (frente e verso) com virar pela borda longa.
          As páginas saem em pares: Rua 1 e Rua 2 da mesma câmara.
        </p>
      </div>

      <button
        type="button"
        className="btn primary full"
        disabled={selectedCamaras.length === 0}
        onClick={handlePrint}
      >
        Imprimir layout ({totalFolhas} folha{totalFolhas !== 1 ? 's' : ''})
      </button>
    </div>
  )
}
