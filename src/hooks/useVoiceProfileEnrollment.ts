import { useCallback, useRef, useState } from 'react'
import {
  VOICE_ENROLLMENT_SAMPLES,
  buildVoiceProfile,
  storeVoiceProfile,
  type VoiceProfile,
} from '../lib/voiceProfile'
import { extractVoiceFeatures, recordVoiceSample } from '../lib/voiceFeatures'

type Options = {
  onProfileComplete?: (profile: VoiceProfile) => void
}

export function useVoiceProfileEnrollment(options: Options = {}) {
  const [recording, setRecording] = useState(false)
  const [samples, setSamples] = useState<number[][]>([])
  const [error, setError] = useState<string | null>(null)
  const onCompleteRef = useRef(options.onProfileComplete)
  onCompleteRef.current = options.onProfileComplete

  const reset = useCallback(() => {
    setSamples([])
    setError(null)
  }, [])

  const recordSample = useCallback(async () => {
    setError(null)
    setRecording(true)
    try {
      const blob = await recordVoiceSample(3200)
      const features = await extractVoiceFeatures(blob)
      if (features.every((v) => v === 0)) {
        setError('Não detectei voz. Fale mais perto do microfone.')
        return null
      }

      let completed: VoiceProfile | null = null
      setSamples((prev) => {
        const next = [...prev, features]
        if (next.length >= VOICE_ENROLLMENT_SAMPLES) {
          completed = buildVoiceProfile(next)
          storeVoiceProfile(completed)
        }
        return next.length >= VOICE_ENROLLMENT_SAMPLES ? [] : next
      })

      if (completed) {
        onCompleteRef.current?.(completed)
      }

      return features
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gravar amostra.')
      return null
    } finally {
      setRecording(false)
    }
  }, [])

  const clearProfile = useCallback(() => {
    storeVoiceProfile(null)
    reset()
  }, [reset])

  return {
    recording,
    samples,
    sampleCount: samples.length,
    requiredSamples: VOICE_ENROLLMENT_SAMPLES,
    error,
    recordSample,
    clearProfile,
    reset,
  }
}
