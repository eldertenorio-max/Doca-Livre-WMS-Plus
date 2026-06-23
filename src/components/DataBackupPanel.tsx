import { useRef, useState, type ChangeEvent } from 'react'
import type { PersistedData } from '../types'

type Props = {
  onExport: () => PersistedData
  onImport: (data: PersistedData) => void
}

export function DataBackupPanel({ onExport, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [importErro, setImportErro] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<PersistedData | null>(null)

  function handleExport() {
    const data = onExport()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `ultrafrio-backup-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportErro(null)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<PersistedData>
        if (!parsed || !Array.isArray(parsed.notas)) {
          setImportErro('Arquivo inválido.')
          return
        }
        setConfirmar({
          notas: parsed.notas ?? [],
          movimentos: parsed.movimentos ?? [],
          notasCanceladas: parsed.notasCanceladas ?? [],
        })
      } catch {
        setImportErro('Não foi possível ler o arquivo.')
      }
    }
    reader.readAsText(file)
  }

  function confirmarImportacao() {
    if (!confirmar) return
    onImport(confirmar)
    setConfirmar(null)
  }

  return (
    <div className="data-backup">
      <p className="data-backup-title">Backup</p>
      <div className="data-backup-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleExport}>
          Exportar
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>
          Importar
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleFile}
        />
      </div>
      {importErro && <p className="error">{importErro}</p>}

      {confirmar && (
        <div className="confirm-backdrop" onClick={() => setConfirmar(null)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <h4>Importar backup?</h4>
            <p>
              {confirmar.notas.length} NF(s), {confirmar.movimentos.length} movimento(s) e{' '}
              {confirmar.notasCanceladas.length} cancelada(s) substituirão os dados atuais.
            </p>
            <p className="confirm-warn">Esta ação não pode ser desfeita automaticamente.</p>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmarImportacao}>
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
