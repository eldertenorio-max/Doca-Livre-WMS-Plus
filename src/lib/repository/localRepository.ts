import type { AppState, PersistedData } from '../../types'
import type { EnderecamentoRepository } from './types'

const DATA_KEY = 'ultrafrio-enderecamento-v2'
const LEGACY_KEY = 'ultrafrio-enderecamento-v1'
const UI_KEY = 'ultrafrio-ui-prefs-v1'

function loadBundle(): PersistedData {
  try {
    const raw = localStorage.getItem(DATA_KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!raw) return { notas: [], movimentos: [] }
    const parsed = JSON.parse(raw) as Partial<PersistedData & AppState>
    return {
      notas: parsed.notas ?? [],
      movimentos: parsed.movimentos ?? [],
    }
  } catch {
    return { notas: [], movimentos: [] }
  }
}

function loadUiFromLegacy(): Pick<AppState, 'activeNfId' | 'activeItemIndex'> {
  const raw = localStorage.getItem(UI_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Pick<AppState, 'activeNfId' | 'activeItemIndex'>
    } catch {
      /* ignore */
    }
  }
  return { activeNfId: null, activeItemIndex: null }
}

export const localRepository: EnderecamentoRepository = {
  mode: 'local',

  async loadData() {
    return loadBundle()
  },

  async saveData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
  },

  loadUiPrefs() {
    return loadUiFromLegacy()
  },

  saveUiPrefs(prefs) {
    localStorage.setItem(UI_KEY, JSON.stringify(prefs))
  },
}
