import type { VoiceAssistantPhase } from '../hooks/useVoiceAssistant'

type Props = {
  phase: VoiceAssistantPhase
  liveText: string
  lastHint: string | null
  feedback: string | null
  wakePhrase: string
  onCancel: () => void
}

export function VoiceAssistantHUD({
  phase,
  liveText,
  lastHint,
  feedback,
  wakePhrase,
  onCancel,
}: Props) {
  if (phase === 'off') return null

  const label =
    phase === 'ouvindo'
      ? `Escutando "${wakePhrase}"…`
      : phase === 'armado'
        ? 'Aguardando comando…'
        : phase === 'executando'
          ? 'Executando…'
          : ''

  return (
    <div className="voice-assistant-hud" role="status" aria-live="polite">
      <div className="voice-assistant-hud-inner">
        <span className={`voice-assistant-hud-dot voice-assistant-hud-dot--${phase}`} aria-hidden />
        <div className="voice-assistant-hud-body">
          <strong className="voice-assistant-hud-title">{label}</strong>
          {liveText && <p className="voice-assistant-hud-live">{liveText}</p>}
          {feedback && <p className="voice-assistant-hud-feedback">{feedback}</p>}
          {!liveText && !feedback && lastHint && (
            <p className="voice-assistant-hud-hint muted">{lastHint}</p>
          )}
        </div>
        {phase === 'armado' && (
          <span className="voice-assistant-hud-waves" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="voice-assistant-hud-wave"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </span>
        )}
        <button
          type="button"
          className="voice-assistant-hud-cancel"
          onClick={onCancel}
          aria-label="Cancelar escuta de voz"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
