import { useCallback, useEffect, useRef, useState } from 'react'
import { getRepository, getStorageMode, type EnderecamentoRepository } from '../lib/repository'
import { localRepository } from '../lib/repository/localRepository'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { prepareLoadedData } from '../lib/persistence'
import type { AppState, PersistedData } from '../types'
import type { StorageMode } from '../lib/repository/types'

const emptyState: AppState = {
  notas: [],
  notasCanceladas: [],
  movimentos: [],
  activeNfId: null,
  activeItemIndex: null,
}

function pickRepository(): EnderecamentoRepository {
  return isSupabaseConfigured() ? getRepository() : localRepository
}

export function useEnderecamentoStore() {
  const repoRef = useRef<EnderecamentoRepository>(pickRepository())
  const [state, setState] = useState<AppState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storageMode, setStorageMode] = useState<StorageMode>(getStorageMode())
  const [migratedFromLocal, setMigratedFromLocal] = useState(false)
  const skipSave = useRef(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      let repo = pickRepository()
      repoRef.current = repo
      setStorageMode(repo.mode)

      try {
        const remote = await repo.loadData()
        const { data, migratedFromLocal: migrated } = prepareLoadedData(remote, {
          allowLocalMigration: repo.mode === 'supabase',
        })
        const ui = repo.loadUiPrefs()

        if (migrated && repo.mode === 'supabase') {
          await repo.saveData({
            notas: data.notas,
            movimentos: data.movimentos,
            notasCanceladas: data.notasCanceladas,
          })
        }

        if (!cancelled) {
          setState({ ...data, ...ui })
          setMigratedFromLocal(migrated)
          setError(null)
        }
        return
      } catch {
        if (repo.mode === 'supabase') {
          repo = localRepository
          repoRef.current = repo
          setStorageMode('local')
          try {
            const { data } = prepareLoadedData(await repo.loadData())
            const ui = repo.loadUiPrefs()
            if (!cancelled) {
              setState({ ...data, ...ui })
              setMigratedFromLocal(false)
              setError('Nuvem indisponível — usando dados deste navegador.')
            }
            return
          } catch (e) {
            if (!cancelled) {
              setError(e instanceof Error ? e.message : 'Erro ao carregar dados.')
            }
            return
          }
        }
        if (!cancelled) setError('Erro ao carregar dados.')
      } finally {
        if (!cancelled) {
          skipSave.current = false
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback(async (next: AppState) => {
    let repo = repoRef.current
    setSaving(true)
    try {
      await repo.saveData({
        notas: next.notas,
        movimentos: next.movimentos,
        notasCanceladas: next.notasCanceladas,
      })
      repo.saveUiPrefs({
        activeNfId: next.activeNfId,
        activeItemIndex: next.activeItemIndex,
      })
      setError(null)
    } catch {
      if (repo.mode === 'supabase') {
        repo = localRepository
        repoRef.current = repo
        setStorageMode('local')
        try {
          await repo.saveData({
            notas: next.notas,
            movimentos: next.movimentos,
            notasCanceladas: next.notasCanceladas,
          })
          repo.saveUiPrefs({
            activeNfId: next.activeNfId,
            activeItemIndex: next.activeItemIndex,
          })
          setError('Nuvem indisponível — dados salvos só neste navegador.')
          return
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Erro ao salvar dados.')
          return
        }
      }
      setError('Erro ao salvar dados.')
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    if (skipSave.current || loading) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void persist(state)
    }, 400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state, loading, persist])

  const updateState = useCallback((updater: AppState | ((prev: AppState) => AppState)) => {
    setState((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }, [])

  const importBackup = useCallback((data: PersistedData) => {
    const normalized = prepareLoadedData(data).data
    setState({
      ...normalized,
      activeNfId: null,
      activeItemIndex: null,
    })
    setMigratedFromLocal(false)
  }, [])

  const exportBackup = useCallback((): PersistedData => {
    return {
      notas: state.notas,
      movimentos: state.movimentos,
      notasCanceladas: state.notasCanceladas,
    }
  }, [state.notas, state.movimentos, state.notasCanceladas])

  return {
    state,
    setState: updateState,
    loading,
    saving,
    error,
    storageMode,
    migratedFromLocal,
    clearError: () => setError(null),
    importBackup,
    exportBackup,
  }
}
