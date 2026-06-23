import type { StorageMode } from '../lib/repository/types'

type Props = {
  mode: StorageMode
  migrated?: boolean
}

export function StorageBanner({ mode, migrated }: Props) {
  if (mode === 'supabase') {
    return (
      <div className="storage-banner storage-banner--cloud">
        <CloudIcon />
        <span>
          {migrated
            ? 'Dados deste navegador foram enviados para a nuvem.'
            : 'Dados sincronizados na nuvem (Supabase).'}
        </span>
      </div>
    )
  }

  return (
    <div className="storage-banner storage-banner--local">
      <LocalIcon />
      <span>
        Os dados ficam <strong>só neste navegador</strong>. Em outro PC ou navegador eles não aparecem.
        Use <strong>Exportar backup</strong> abaixo ou configure o Supabase no Render.
      </span>
    </div>
  )
}

function CloudIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 18h11a4 4 0 0 0 0-8 5 5 0 0 0-9.8-1.2A3.5 3.5 0 0 0 7 18z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LocalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
