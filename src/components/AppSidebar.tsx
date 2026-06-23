import type { AppTab } from '../types'
import { EntradaPanel } from './EntradaPanel'
import { HistoricoPanel } from './HistoricoPanel'
import { SaidaPanel } from './SaidaPanel'
import type { ComponentProps } from 'react'

type Props = {
  tab: AppTab
  onTabChange: (tab: AppTab) => void
  saving: boolean
  persistError: string | null
  entrada: ComponentProps<typeof EntradaPanel>
  saida: ComponentProps<typeof SaidaPanel>
  historico: ComponentProps<typeof HistoricoPanel>
}

const TABS: { id: AppTab; label: string }[] = [
  { id: 'entrada', label: 'Entrada' },
  { id: 'saida', label: 'Saída' },
  { id: 'historico', label: 'Histórico' },
]

export function AppSidebar({ tab, onTabChange, saving, persistError, entrada, saida, historico }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-block">
        <h1>Endereçamento</h1>
        <p className="muted">Ultrafrio · entrada e saída por NF-e</p>
        {saving && <p className="saving-hint">Salvando…</p>}
        {persistError && <p className="error">{persistError}</p>}
      </div>

      <nav className="tab-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-btn ${tab === t.id ? 'tab-btn--active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'entrada' && <EntradaPanel {...entrada} />}
      {tab === 'saida' && <SaidaPanel {...saida} />}
      {tab === 'historico' && <HistoricoPanel {...historico} />}
    </aside>
  )
}
