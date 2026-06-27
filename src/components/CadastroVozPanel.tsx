import { useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { VOICE_COMMAND_EXAMPLES } from '../lib/parseVoiceCommand'
import type { VoicePrefs } from '../lib/voicePrefs'
import { DEFAULT_WAKE_PHRASE } from '../lib/voicePrefs'

type Props = {
  prefs: VoicePrefs
  supported: boolean
  assistantActive: boolean
  onPrefsChange: (patch: Partial<VoicePrefs>) => void
  onTestWakePhrase: (spoken: string) => boolean
}

export function CadastroVozPanel({
  prefs,
  supported,
  assistantActive,
  onPrefsChange,
  onTestWakePhrase,
}: Props) {
  const [calibrando, setCalibrando] = useState(false)
  const [calibMsg, setCalibMsg] = useState<string | null>(null)
  const [calibErro, setCalibErro] = useState<string | null>(null)
  const { listening, start, stop } = useSpeechRecognition()

  function handleToggleEnabled() {
    onPrefsChange({ enabled: !prefs.enabled })
  }

  function handleCalibrar() {
    setCalibMsg(null)
    setCalibErro(null)
    if (listening) {
      stop()
      setCalibrando(false)
      return
    }
    setCalibrando(true)
    start(
      (text) => {
        setCalibrando(false)
        if (onTestWakePhrase(text)) {
          onPrefsChange({ calibrated: true })
          setCalibMsg(`Reconhecido: "${text.trim()}" — cadastro confirmado.`)
        } else {
          setCalibErro(
            `Não reconheceu "${prefs.wakePhrase}". Fale exatamente a frase de ativação e tente de novo.`,
          )
        }
      },
      (err) => {
        setCalibrando(false)
        setCalibErro(err)
      },
    )
  }

  return (
    <>
      <div className="sidebar-block">
        <h3 className="cadastro-voz-title">Assistente de voz</h3>
        <p className="muted cadastro-voz-intro">
          Ative o assistente, fale <strong>{prefs.wakePhrase || DEFAULT_WAKE_PHRASE}</strong> e em
          seguida o que deseja ver ou fazer no sistema — abrir abas, consultar estoque, filtrar o
          painel, buscar NF e mais.
        </p>

        {!supported && (
          <p className="error">
            Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.
          </p>
        )}

        <label className="cadastro-voz-toggle">
          <input
            type="checkbox"
            checked={prefs.enabled}
            disabled={!supported}
            onChange={handleToggleEnabled}
          />
          <span>Assistente ativo (escuta contínua)</span>
        </label>

        {assistantActive && (
          <p className="cadastro-voz-status cadastro-voz-status--on">
            Microfone ativo — diga &quot;{prefs.wakePhrase}&quot; e fale o comando.
          </p>
        )}

        <label className="cadastro-voz-field">
          <span>Frase de ativação</span>
          <input
            type="text"
            className="input-nf"
            value={prefs.wakePhrase}
            disabled={!supported}
            onChange={(e) =>
              onPrefsChange({ wakePhrase: e.target.value, calibrated: false })
            }
            placeholder={DEFAULT_WAKE_PHRASE}
          />
        </label>

        <button
          type="button"
          className={`btn full ${calibrando ? 'danger-outline' : 'primary'}`}
          disabled={!supported || !prefs.wakePhrase.trim()}
          onClick={handleCalibrar}
        >
          {calibrando ? 'Gravando… toque para cancelar' : 'Cadastrar / testar frase de ativação'}
        </button>

        {prefs.calibrated && !calibErro && (
          <p className="cadastro-voz-ok">Frase de ativação cadastrada.</p>
        )}
        {calibMsg && <p className="cadastro-voz-ok">{calibMsg}</p>}
        {calibErro && <p className="error">{calibErro}</p>}
      </div>

      <div className="sidebar-block">
        <h4 className="cadastro-voz-subtitle">Comandos disponíveis</h4>
        <p className="muted cadastro-voz-comandos-hint">
          Sempre comece com <strong>{prefs.wakePhrase || DEFAULT_WAKE_PHRASE}</strong> ou fale tudo
          numa frase só.
        </p>
        <ul className="cadastro-voz-comandos">
          {VOICE_COMMAND_EXAMPLES.map((ex) => (
            <li key={ex.frase}>
              <strong>{ex.frase}</strong>
              <span>{ex.descricao}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
