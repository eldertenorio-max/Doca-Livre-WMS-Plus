/** Normaliza transcript de voz para comparação e parsing. */
export function normalizeVoiceText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[·.,;!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function wakePhraseMatches(transcript: string, wakePhrase: string): boolean {
  const norm = normalizeVoiceText(transcript)
  const wake = normalizeVoiceText(wakePhrase)
  if (!wake) return false
  return norm.includes(wake)
}

export function stripWakePhrase(transcript: string, wakePhrase: string): string {
  const norm = normalizeVoiceText(transcript)
  const wake = normalizeVoiceText(wakePhrase)
  if (!wake) return norm
  const idx = norm.indexOf(wake)
  if (idx < 0) return norm
  return norm.slice(idx + wake.length).trim()
}
