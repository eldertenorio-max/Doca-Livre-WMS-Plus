import { useCallback, useEffect, useState } from 'react'
import {
  ENTRADA_CAMPOS_LIST,
  getStoredEntradaCampos,
  storeEntradaCampos,
  type EntradaCampoId,
  type EntradaCamposConfig,
} from '../lib/entradaCampos'

export function useEntradaCamposConfig() {
  const [config, setConfig] = useState<EntradaCamposConfig>(() => getStoredEntradaCampos())
  const [draft, setDraft] = useState<EntradaCamposConfig>(() => getStoredEntradaCampos())
  const [savedHint, setSavedHint] = useState(false)

  useEffect(() => {
    if (!savedHint) return
    const t = window.setTimeout(() => setSavedHint(false), 2000)
    return () => window.clearTimeout(t)
  }, [savedHint])

  const toggleDraft = useCallback((id: EntradaCampoId) => {
    setDraft((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const saveDraft = useCallback(() => {
    setConfig(draft)
    storeEntradaCampos(draft)
    setSavedHint(true)
  }, [draft])

  const resetDraft = useCallback(() => {
    setDraft(config)
  }, [config])

  const dirty = ENTRADA_CAMPOS_LIST.some((c) => draft[c.id] !== config[c.id])

  return {
    config,
    draft,
    savedHint,
    dirty,
    toggleDraft,
    saveDraft,
    resetDraft,
  }
}
