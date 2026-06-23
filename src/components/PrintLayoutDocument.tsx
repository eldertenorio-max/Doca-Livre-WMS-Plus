import {
  CAMARAS,
  NIVEIS,
  cellKind,
  makeAddressId,
  portaOverlayStyle,
  type CamaraConfig,
  type RuaConfig,
} from '../layout/camaras'

const CELL_GAP = 0

/** A4 paisagem com margem 5mm — área útil para o grid no corpo da folha. */
const PRINT_BODY_WIDTH_MM = 287
const PRINT_BODY_HEIGHT_MM = 186

function printGridMetrics(colunas: number, cellSize: number) {
  const labelW = Math.max(9, Math.round(cellSize * 0.52))
  const headerH = Math.max(6, Math.round(cellSize * 0.42))
  const gapsW = (colunas - 1) * CELL_GAP
  const gapsH = (NIVEIS.length - 1) * CELL_GAP
  const gridW = labelW + 3 + colunas * cellSize + gapsW
  const gridH = headerH + NIVEIS.length * cellSize + gapsH
  return { labelW, headerH, gridW, gridH }
}

function computePrintCellSize(colunas: number): number {
  const gapsW = (colunas - 1) * CELL_GAP
  const gapsH = (NIVEIS.length - 1) * CELL_GAP
  const overheadW = 12

  let cell = (PRINT_BODY_WIDTH_MM - overheadW - gapsW) / colunas

  for (let i = 0; i < 4; i++) {
    const { headerH } = printGridMetrics(colunas, cell)
    const byHeight = (PRINT_BODY_HEIGHT_MM - headerH - gapsH) / NIVEIS.length
    if (byHeight >= cell) break
    cell = byHeight
  }

  while (printGridMetrics(colunas, cell).gridW > PRINT_BODY_WIDTH_MM && cell > 10) {
    cell = Math.round((cell - 0.1) * 10) / 10
  }

  return Math.max(10, Math.round(cell * 10) / 10)
}

function printAxisFont(cellSize: number): number {
  return Math.max(12, Math.min(18, Math.round(cellSize * 0.72)))
}

type Props = {
  camaraIds: number[]
}

function PrintRuaGrid({ camaraId, config, cellSize }: { camaraId: number; config: RuaConfig; cellSize: number }) {
  const { labelW, headerH } = printGridMetrics(config.colunas, cellSize)
  const axisFont = printAxisFont(cellSize)
  const portaFont = Math.max(10, Math.round(cellSize * 0.48))

  return (
    <div className="print-rua-grid">
      <div
        className="print-col-headers"
        style={{
          marginLeft: labelW + 3,
          gridTemplateColumns: `repeat(${config.colunas}, ${cellSize}mm)`,
          gap: `${CELL_GAP}mm`,
        }}
      >
        {Array.from({ length: config.colunas }, (_, i) => (
          <span key={i} className="print-axis" style={{ width: `${cellSize}mm`, fontSize: axisFont }}>
            {i + 1}
          </span>
        ))}
      </div>

      <div className="print-rua-body" style={{ paddingTop: headerH }}>
        <div className="print-row-labels" style={{ width: labelW, gap: `${CELL_GAP}mm` }}>
          {NIVEIS.map((nivel) => (
            <span
              key={nivel}
              className="print-axis print-axis--row"
              style={{ height: `${cellSize}mm`, lineHeight: `${cellSize}mm`, fontSize: axisFont }}
            >
              {nivel}
            </span>
          ))}
        </div>

        <div className="print-cells-area">
          <div className="print-cells-stack" style={{ gap: `${CELL_GAP}mm` }}>
            {NIVEIS.map((nivel) => (
              <div
                key={nivel}
                className="print-cells-row"
                style={{
                  gridTemplateColumns: `repeat(${config.colunas}, ${cellSize}mm)`,
                  gap: `${CELL_GAP}mm`,
                }}
              >
                {Array.from({ length: config.colunas }, (_, i) => {
                  const col = i + 1
                  const kind = cellKind(
                    col,
                    nivel,
                    config.colunas,
                    config.porta,
                    config.semNivel5Inexistente !== false,
                  )
                  return (
                    <div
                      key={makeAddressId(camaraId, config.rua, nivel, col)}
                      className={`print-cell print-cell--${kind}`}
                      style={{ width: `${cellSize}mm`, height: `${cellSize}mm` }}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {config.porta && (
            <div
              className="print-porta-label"
              style={{
                ...portaOverlayStyleMm(config.porta, cellSize, CELL_GAP),
                fontSize: portaFont,
              }}
            >
              PORTA
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function portaOverlayStyleMm(
  porta: NonNullable<RuaConfig['porta']>,
  cellMm: number,
  gapMm: number,
): { left: string; top: string; width: string; height: string } {
  const base = portaOverlayStyle(porta, cellMm, gapMm)
  return {
    left: `${base.left}mm`,
    top: `${base.top}mm`,
    width: `${base.width}mm`,
    height: `${base.height}mm`,
  }
}

function PrintPage({ cam, rua, pageIndex, totalPages }: { cam: CamaraConfig; rua: RuaConfig; pageIndex: number; totalPages: number }) {
  const cellSize = computePrintCellSize(rua.colunas)
  const isRua1 = rua.rua === cam.ruas[0]?.rua
  const versoRua = cam.ruas.find((r) => r.rua !== rua.rua)

  return (
    <section className="print-page">
      <header className="print-page-header">
        <div>
          <h1>Câmara {cam.id}</h1>
          <p className="print-page-sub">{cam.tipo} · Rua {rua.rua}</p>
        </div>
        <div className="print-page-meta">
          <span>Ultrafrio — Layout de endereçamento</span>
          <span>
            Folha {pageIndex + 1} de {totalPages}
          </span>
        </div>
      </header>

      <div className="print-page-body">
        <PrintRuaGrid camaraId={cam.id} config={rua} cellSize={cellSize} />
      </div>

      <footer className="print-page-footer">
        <div className="print-legend">
          <span><i className="print-swatch print-swatch--disp" /> Posição</span>
          <span><i className="print-swatch print-swatch--porta" /> Porta</span>
          <span><i className="print-swatch print-swatch--nv5" /> Nív. 5 inexistente</span>
        </div>
        {isRua1 && versoRua && (
          <p className="print-duplex-hint">
            Impressão frente e verso: esta folha = <strong>Rua {rua.rua}</strong> (frente) · verso ={' '}
            <strong>Rua {versoRua.rua}</strong>
          </p>
        )}
        {!isRua1 && (
          <p className="print-duplex-hint">
            Verso da folha anterior — <strong>Rua {rua.rua}</strong>
          </p>
        )}
      </footer>
    </section>
  )
}

export function PrintLayoutDocument({ camaraIds }: Props) {
  const pages: { cam: CamaraConfig; rua: RuaConfig }[] = []

  for (const cam of CAMARAS) {
    if (!camaraIds.includes(cam.id)) continue
    for (const rua of cam.ruas) {
      pages.push({ cam, rua })
    }
  }

  if (pages.length === 0) return null

  return (
    <div className="print-document" aria-hidden>
      {pages.map(({ cam, rua }, i) => (
        <PrintPage key={`${cam.id}-r${rua.rua}`} cam={cam} rua={rua} pageIndex={i} totalPages={pages.length} />
      ))}
    </div>
  )
}
