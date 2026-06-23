import { CollapsibleSidebarSection } from './CollapsibleSidebarSection'
import { CanceladasPanel } from './CanceladasPanel'
import { DataBackupPanel } from './DataBackupPanel'
import { EditarPosicaoPanel } from './EditarPosicaoPanel'
import { EntradaPanel } from './EntradaPanel'
import { HistoricoPanel } from './HistoricoPanel'
import { SaidaPanel } from './SaidaPanel'
import { StorageBanner } from './StorageBanner'
import { ThemeToggle } from './ThemeToggle'
import type { StorageMode } from '../lib/repository/types'
import type { PersistedData } from '../types'
import type { Theme } from '../lib/theme'
import type { ComponentProps } from 'react'

type Props = {
  saving: boolean
  persistError: string | null
  storageMode: StorageMode
  migratedFromLocal: boolean
  onExportBackup: () => PersistedData
  onImportBackup: (data: PersistedData) => void
  theme: Theme
  onToggleTheme: () => void
  entrada: ComponentProps<typeof EntradaPanel>
  saida: ComponentProps<typeof SaidaPanel>
  editar: ComponentProps<typeof EditarPosicaoPanel>
  historico: ComponentProps<typeof HistoricoPanel>
  canceladas: ComponentProps<typeof CanceladasPanel>
}

export function AppSidebar({
  saving,
  persistError,
  storageMode,
  migratedFromLocal,
  onExportBackup,
  onImportBackup,
  theme,
  onToggleTheme,
  entrada,
  saida,
  editar,
  historico,
  canceladas,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-block sidebar-header">
        <img
          src="/logo-ultrafrio-horizontal-azul.svg"
          alt="Ultrafrio"
          className="sidebar-logo"
        />
        <h1>Endereçamento</h1>
        <p className="muted">Ultrafrio · entrada e saída por NF-e</p>
        {saving && <p className="saving-hint">Salvando…</p>}
        {persistError && <p className="error">{persistError}</p>}
        <StorageBanner mode={storageMode} migrated={migratedFromLocal} />
      </div>

      <CollapsibleSidebarSection id="entrada" title="Entrada">
        <EntradaPanel {...entrada} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection id="saida" title="Saída">
        <SaidaPanel {...saida} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection id="editar" title="Editar posição">
        <EditarPosicaoPanel {...editar} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection id="canceladas" title="NF cancelada">
        <CanceladasPanel {...canceladas} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection id="historico" title="Histórico">
        <HistoricoPanel {...historico} />
      </CollapsibleSidebarSection>

      <div className="sidebar-footer">
        <DataBackupPanel onExport={onExportBackup} onImport={onImportBackup} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </aside>
  )
}
