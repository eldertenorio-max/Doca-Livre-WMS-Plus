import { useCallback, useEffect, useRef, useState } from 'react'
import {
  normalizeVoiceText,
  stripWakePhrase,
  wakePhraseMatches,
} from '../lib/voiceNormalize'

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionResultEvent) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionResultEvent = {
  results: {
    [index: number]: { [index: number]: { transcript: string }; isFinal?: boolean }
    length: number
  }
}

type SpeechRecognitionErrorEvent = {
  error: string
}

export type VoiceAssistantPhase = 'off' | 'ouvindo' | 'armado' | 'executando'

const ARMED_TIMEOUT_MS = 8000

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

type Options = {
  enabled: boolean
  wakePhrase: string
  onCommandText: (text: string) => void
  onError?: (message: string) => void
}

export function useVoiceAssistant({ enabled, wakePhrase, onCommandText, onError }: Options) {
  const [supported, setSupported] = useState(false)
  const [phase, setPhase] = useState<VoiceAssistantPhase>('off')
  const [liveText, setLiveText] = useState('')
  const [lastHint, setLastHint] = useState<string | null>(null)

  const recRef = useRef<SpeechRecognitionInstance | null>(null)
  const runningRef = useRef(false)
  const armedRef = useRef(false)
  const armedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCommandTextRef = useRef(onCommandText)
  const onErrorRef = useRef(onError)
  const wakePhraseRef = useRef(wakePhrase)

  useEffect(() => {
    onCommandTextRef.current = onCommandText
  }, [onCommandText])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    wakePhraseRef.current = wakePhrase
  }, [wakePhrase])

  const clearArmedTimer = useCallback(() => {
    if (armedTimerRef.current) {
      clearTimeout(armedTimerRef.current)
      armedTimerRef.current = null
    }
  }, [])

  const disarm = useCallback(() => {
    armedRef.current = false
    clearArmedTimer()
    setPhase('ouvindo')
    setLastHint('Diga "ok estoque" para comandar')
  }, [clearArmedTimer])

  const arm = useCallback(() => {
    armedRef.current = true
    clearArmedTimer()
    setPhase('armado')
    setLastHint('Ouvindo comando…')
    armedTimerRef.current = setTimeout(() => {
      disarm()
    }, ARMED_TIMEOUT_MS)
  }, [clearArmedTimer, disarm])

  const dispatchCommand = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setPhase('executando')
      setLiveText(trimmed)
      onCommandTextRef.current(trimmed)
      disarm()
    },
    [disarm],
  )

  const processTranscript = useCallback(
    (raw: string, isFinal: boolean) => {
      const wake = wakePhraseRef.current
      if (wakePhraseMatches(raw, wake)) {
        const remainder = stripWakePhrase(raw, wake)
        arm()
        if (remainder) {
          dispatchCommand(remainder)
        }
        return
      }

      if (armedRef.current && isFinal) {
        dispatchCommand(normalizeVoiceText(raw))
      }
    },
    [arm, dispatchCommand],
  )

  const stopRecognition = useCallback(() => {
    runningRef.current = false
    recRef.current?.abort()
    recRef.current = null
    clearArmedTimer()
    armedRef.current = false
    setPhase('off')
    setLiveText('')
  }, [clearArmedTimer])

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      onErrorRef.current?.('Reconhecimento de voz não disponível neste navegador.')
      return
    }

    recRef.current?.abort()
    const rec = new Ctor()
    recRef.current = rec
    rec.lang = 'pt-BR'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.continuous = true

    rec.onresult = (ev) => {
      let interim = ''
      let final = ''
      for (let i = 0; i < ev.results.length; i++) {
        const result = ev.results[i]
        const piece = result?.[0]?.transcript ?? ''
        if (result?.isFinal) final += piece
        else interim += piece
      }
      const preview = (interim || final).trim()
      setLiveText(preview)
      if (final.trim()) {
        processTranscript(final, true)
      } else if (interim.trim() && armedRef.current) {
        setPhase('armado')
      }
    }

    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed') {
        onErrorRef.current?.('Permita o microfone para usar o assistente de voz.')
        stopRecognition()
        return
      }
      if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
        onErrorRef.current?.('Erro no microfone. Tentando reconectar…')
      }
    }

    rec.onend = () => {
      if (!runningRef.current) return
      try {
        rec.start()
      } catch {
        /* reinicia no próximo ciclo */
      }
    }

    runningRef.current = true
    armedRef.current = false
    setPhase('ouvindo')
    setLastHint(`Diga "${wakePhraseRef.current}" e fale o comando`)
    rec.start()
  }, [processTranscript, stopRecognition])

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() != null)
  }, [])

  useEffect(() => {
    if (enabled && supported) {
      startRecognition()
    } else {
      stopRecognition()
    }
    return () => stopRecognition()
  }, [enabled, supported, startRecognition, stopRecognition])

  const testPhrase = useCallback(
    (spoken: string): boolean => wakePhraseMatches(spoken, wakePhraseRef.current),
    [],
  )

  return {
    supported,
    phase,
    liveText,
    lastHint,
    testPhrase,
    stop: stopRecognition,
  }
}
