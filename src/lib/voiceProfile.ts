export type VoiceProfile = {
  features: number[]
  sampleCount: number
  createdAt: string
}

export const VOICE_PROFILE_KEY = 'ultrafrio-voice-profile'
export const VOICE_MATCH_THRESHOLD = 0.62
export const VOICE_ENROLLMENT_SAMPLES = 3

export function getStoredVoiceProfile(): VoiceProfile | null {
  try {
    const raw = localStorage.getItem(VOICE_PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as VoiceProfile
    if (!Array.isArray(parsed.features) || parsed.features.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

export function storeVoiceProfile(profile: VoiceProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(VOICE_PROFILE_KEY, JSON.stringify(profile))
    } else {
      localStorage.removeItem(VOICE_PROFILE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function averageFeatureVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return []
  const len = vectors[0].length
  const sum = new Array(len).fill(0)
  for (const v of vectors) {
    for (let i = 0; i < len; i++) sum[i] += v[i] ?? 0
  }
  return sum.map((x) => x / vectors.length)
}

export function buildVoiceProfile(samples: number[][]): VoiceProfile {
  return {
    features: averageFeatureVectors(samples),
    sampleCount: samples.length,
    createdAt: new Date().toISOString(),
  }
}
