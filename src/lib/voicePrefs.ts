export type VoicePrefs = {
  enabled: boolean
  wakePhrase: string
  calibrated: boolean
}

export const VOICE_PREFS_KEY = 'ultrafrio-voice-prefs'
export const DEFAULT_WAKE_PHRASE = 'ok estoque'

export function defaultVoicePrefs(): VoicePrefs {
  return {
    enabled: false,
    wakePhrase: DEFAULT_WAKE_PHRASE,
    calibrated: false,
  }
}

export function getStoredVoicePrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(VOICE_PREFS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VoicePrefs>
      return {
        ...defaultVoicePrefs(),
        ...parsed,
        wakePhrase: (parsed.wakePhrase ?? DEFAULT_WAKE_PHRASE).trim() || DEFAULT_WAKE_PHRASE,
      }
    }
  } catch {
    /* ignore */
  }
  return defaultVoicePrefs()
}

export function storeVoicePrefs(prefs: VoicePrefs) {
  try {
    localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}
