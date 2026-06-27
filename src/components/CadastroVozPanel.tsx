import { useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useVoiceProfileEnrollment } from '../hooks/useVoiceProfileEnrollment'
import { VOICE_COMMAND_EXAMPLES } from '../lib/parseVoiceCommand'
import type { VoicePrefs } from '../lib/voicePrefs'
import { DEFAULT_WAKE_PHRASE } from '../lib/voicePrefs'
import type { VoiceProfile } from '../lib/voiceProfile'

type Props = {
  prefs: VoicePrefs
  voiceProfile: VoiceProfile | null
  supported: boolean
  assistantActive: boolean
  onPrefsChange: (patch: Partial<VoicePrefs>) => void
  onVoiceProfileChange: (profile: VoiceProfile | null) => void
  onTestWakePhrase: (spoken: string) => boolean
}

export function CadastroVozPanel({
  prefs,
  voiceProfile,
  supported,
  assistantActive,
  onPrefsChange,
  onVoiceProfileChange,
  onTestWakePhrase,
}: Props) {
  const [calibrando, setCalibrando] = useState(false)
  const [calibMsg, setCalibMsg] = useState<string | null>(null)
  const [calibErro, setCalibErro] = useState<string | null>(null)
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null)
  const [samplesRecorded, setSamplesRecorded] = useState(0)
  const { listening, start, stop } = useSpeechRecognition()
  const enrollment = useVoiceProfileEnrollment({
    onProfileComplete: (profile) => {
      onVoiceProfileChange(profile)
      onPrefsChange({ calibrated: true })
      setEnrollMsg('Voz individual cadastrada com sucesso.')
      setSamplesRecorded(0)
    },
  })

  const wake = prefs.wakePhrase || DEFAULT_WAKE_PHRASE
  const vozCadastrada = voiceProfile != null
  const amostrasRestantes = enrollment.requiredSamples - samplesRecorded

  function handleAtivarVoz() {
    setCalibErro(null)
    if (prefs.voiceLocked && !vozCadastrada) {
      setCalibErro('Cadastre sua voz individual antes de ativar (3 amostras abaixo).')
      return
    }
    onPrefsChange({ enabled: true })
  }

  function handleDesativarVoz() {
    if (listening) {
      stop()
      setCalibrando(false)
    }
    setCalibMsg(null)
    onPrefsChange({ enabled: false })
  }

  async function handleGravarAmostra() {
    setEnrollMsg(null)
    setCalibErro(null)
    const features = await enrollment.recordSample()
    if (!features) return

    const next = samplesRecorded + 1
    setSamplesRecorded(next)
    if (next < enrollment.requiredSamples) {
      setEnrollMsg(
        `Amostra ${next}/${enrollment.requiredSamples} gravada. Fale "${wake}" na próxima.`,
      )
    }
  }

  function handleRemoverVoz() {
    enrollment.clearProfile()
    onVoiceProfileChange(null)
    onPrefsChange({ enabled: false, calibrated: false })
    setSamplesRecorded(0)
    setEnrollMsg(null)
    setCalibErro(null)
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
          setCalibMsg(`Reconhecido: "${text.trim()}" — frase confirmada.`)
        } else {
          setCalibErro(
            `Não reconheceu "${wake}". Fale exatamente a frase de ativação e tente de novo.`,
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
          Cadastre <strong>sua voz</strong>, depois fale <strong>{wake}</strong> e o comando. O
          sistema só responde à voz cadastrada com a frase de ativação.
        </p>

        {!supported && (
          <p className="error">
            Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.
          </p>
        )}

        <div
          className={`cadastro-voz-badge${assistantActive ? ' cadastro-voz-badge--on' : ' cadastro-voz-badge--off'}`}
          role="status"
        >
          {assistantActive ? 'Voz ativa — escutando' : 'Voz desativada'}
        </div>

        <div className="cadastro-voz-controles">
          <button
            type="button"
            className="btn success"
            disabled={!supported || prefs.enabled || calibrando || enrollment.recording}
            onClick={handleAtivarVoz}
          >
            Ativar voz
          </button>
          <button
            type="button"
            className="btn danger-outline"
            disabled={!supported || !prefs.enabled}
            onClick={handleDesativarVoz}
          >
            Desativar voz
          </button>
        </div>

        {assistantActive && (
          <p className="cadastro-voz-status cadastro-voz-status--on">
            Microfone ativo — diga &quot;{wake}&quot; com sua voz e fale o comando.
          </p>
        )}

        {!assistantActive && supported && (
          <p className="muted cadastro-voz-status-hint">
            {vozCadastrada
              ? `Toque em Ativar voz e fale "${wake}" com a voz cadastrada.`
              : `Cadastre sua voz abaixo antes de ativar.`}
          </p>
        )}

        <label className="cadastro-voz-field">
          <span>Frase de ativação</span>
          <input
            type="text"
            className="input-nf"
            value={prefs.wakePhrase}
            disabled={!supported || assistantActive}
            onChange={(e) =>
              onPrefsChange({ wakePhrase: e.target.value, calibrated: false })
            }
            placeholder={DEFAULT_WAKE_PHRASE}
          />
        </label>
      </div>

      <div className="sidebar-block cadastro-voz-individual">
        <h4 className="cadastro-voz-subtitle">Cadastro de voz individual</h4>
        <p className="muted cadastro-voz-intro">
          Grave <strong>{enrollment.requiredSamples} amostras</strong> falando &quot;{wake}&quot; em
          voz normal. Só essa voz poderá ativar o painel.
        </p>

        <div
          className={`cadastro-voz-badge${vozCadastrada ? ' cadastro-voz-badge--on' : ' cadastro-voz-badge--off'}`}
        >
          {vozCadastrada
            ? `Voz cadastrada (${voiceProfile?.sampleCount ?? 3} amostras)`
            : samplesRecorded > 0
              ? `Gravando… ${samplesRecorded}/${enrollment.requiredSamples}`
              : 'Nenhuma voz cadastrada'}
        </div>

        {!vozCadastrada && samplesRecorded > 0 && samplesRecorded < enrollment.requiredSamples && (
          <p className="muted cadastro-voz-enroll-progress">
            Faltam {amostrasRestantes} amostra(s). Fale &quot;{wake}&quot; a cada gravação.
          </p>
        )}

        <button
          type="button"
          className={`btn full ${enrollment.recording ? 'danger-outline' : 'primary'}`}
          disabled={!supported || assistantActive || vozCadastrada}
          onClick={handleGravarAmostra}
        >
          {enrollment.recording
            ? 'Gravando… fale agora'
            : vozCadastrada
              ? 'Voz já cadastrada'
              : samplesRecorded === 0
                ? `Gravar amostra 1/${enrollment.requiredSamples}`
                : `Gravar amostra ${samplesRecorded + 1}/${enrollment.requiredSamples}`}
        </button>

        {vozCadastrada && (
          <button type="button" className="btn danger-outline full cadastro-voz-remove" onClick={handleRemoverVoz}>
            Remover voz cadastrada
          </button>
        )}

        {assistantActive && (
          <p className="muted cadastro-voz-calib-hint">
            Desative a voz antes de cadastrar ou alterar a voz individual.
          </p>
        )}

        {enrollMsg && <p className="cadastro-voz-ok">{enrollMsg}</p>}
        {enrollment.error && <p className="error">{enrollment.error}</p>}
      </div>

      <div className="sidebar-block">
        <button
          type="button"
          className={`btn full btn-sm ${calibrando ? 'danger-outline' : ''}`}
          disabled={!supported || !prefs.wakePhrase.trim() || assistantActive}
          onClick={handleCalibrar}
        >
          {calibrando ? 'Testando frase… toque para cancelar' : 'Testar frase de ativação (texto)'}
        </button>
        {calibMsg && <p className="cadastro-voz-ok">{calibMsg}</p>}
        {calibErro && <p className="error">{calibErro}</p>}
      </div>

      <div className="sidebar-block">
        <h4 className="cadastro-voz-subtitle">Comandos disponíveis</h4>
        <p className="muted cadastro-voz-comandos-hint">
          Com a voz cadastrada, fale <strong>{wake}</strong> e em seguida o comando.
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
