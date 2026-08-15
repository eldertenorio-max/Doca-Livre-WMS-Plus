import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import type { VoicePrefs } from '../lib/voicePrefs'

export type IaChatLine = {
  id: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
}

type Props = {
  prefs: VoicePrefs
  messages: IaChatLine[]
  sending: boolean
  onPrefsChange: (patch: Partial<VoicePrefs>) => void
  onSend: (text: string) => void | Promise<void>
}

export function IaDocaLivrePanel({ prefs, messages, sending, onPrefsChange, onSend }: Props) {
  const [draft, setDraft] = useState('')
  const [micErro, setMicErro] = useState<string | null>(null)
  const [showCfg, setShowCfg] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { listening, supported, start, stop, interimTranscript } = useSpeechRecognition()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending, listening])

  async function submitText(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setDraft('')
    await onSend(trimmed)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void submitText(draft)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submitText(draft)
    }
  }

  function toggleMic() {
    if (!supported || sending) return
    if (listening) {
      stop()
      return
    }
    start(
      (spoken) => {
        setMicErro(null)
        void submitText(spoken)
      },
      (err) => {
        setMicErro(err)
      },
      { extended: true, maxDurationMs: 20000 },
    )
  }

  const hasKey = Boolean(prefs.geminiApiKey?.trim())

  return (
    <div className="ia-doca">
      <header className="ia-doca-head">
        <div>
          <h3 className="ia-doca-title">IA DOCA LIVRE</h3>
          <p className="ia-doca-sub">Digite ou fale. Eu executo as telas e tarefas do WMS Plus.</p>
        </div>
        <button
          type="button"
          className="ia-doca-cfg-btn"
          onClick={() => setShowCfg((v) => !v)}
        >
          {showCfg ? 'Fechar config' : 'Chave Gemini'}
        </button>
      </header>

      {showCfg ? (
        <div className="ia-doca-cfg">
          <label className="cadastro-voz-field">
            <span>Chave Gemini (Google AI Studio)</span>
            <input
              type="password"
              className="input-nf"
              value={prefs.geminiApiKey}
              onChange={(e) => onPrefsChange({ geminiApiKey: e.target.value.trim(), aiInterpretation: true })}
              placeholder="Cole a chave aqui"
              autoComplete="off"
            />
          </label>
          <p className="muted cadastro-voz-field-hint">
            Sem a chave a IA só entende frases simples. Com a chave ela conversa e opera o sistema.
          </p>
        </div>
      ) : null}

      {!hasKey && !showCfg ? (
        <p className="ia-doca-warn">Cole a chave Gemini em “Chave Gemini” para a IA executar as tarefas.</p>
      ) : null}
      {micErro ? <p className="ia-doca-warn">{micErro}</p> : null}

      <div className="ia-doca-thread" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="ia-doca-welcome">
            Oi. Sou a IA Doca Livre. Peça o que quiser no Plus, por exemplo:
            <ul>
              <li>abre o painel</li>
              <li>tem leite no estoque?</li>
              <li>busca a nota 20835</li>
              <li>abre a saída da NF 12345</li>
              <li>mostra o financeiro</li>
            </ul>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`ia-doca-bubble ia-doca-bubble--${m.role}${m.pending ? ' ia-doca-bubble--pending' : ''}`}
            >
              {m.pending ? <span className="ia-doca-dots" aria-label="Pensando">● ● ●</span> : m.content}
            </div>
          ))
        )}
        {listening && interimTranscript ? (
          <div className="ia-doca-bubble ia-doca-bubble--user ia-doca-bubble--interim">{interimTranscript}</div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form className="ia-doca-composer" onSubmit={handleSubmit}>
        <textarea
          className="ia-doca-input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite ou fale o que deseja no WMS…"
          disabled={sending}
        />
        <div className="ia-doca-actions">
          <button
            type="button"
            className={`ia-doca-mic${listening ? ' ia-doca-mic--on' : ''}`}
            onClick={toggleMic}
            disabled={!supported || sending}
            title={supported ? (listening ? 'Parar de ouvir' : 'Falar') : 'Áudio não suportado neste navegador'}
          >
            {listening ? 'Parar' : 'Falar'}
          </button>
          <button type="submit" className="ia-doca-send" disabled={sending || !draft.trim()}>
            {sending ? '…' : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  )
}
