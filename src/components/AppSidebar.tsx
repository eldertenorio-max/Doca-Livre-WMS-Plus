import { CollapsibleSidebarSection, type SidebarSectionId } from './CollapsibleSidebarSection'
import { CadastroVozPanel } from './CadastroVozPanel'
import { ConsultaEstoquePanel } from './ConsultaEstoquePanel'
import { CanceladasPanel } from './CanceladasPanel'
import { EditarPosicaoPanel } from './EditarPosicaoPanel'
import { EntradaPanel } from './EntradaPanel'
import { HistoricoPanel } from './HistoricoPanel'
import { ImprimirPanel } from './ImprimirPanel'
import { PainelPanel } from './PainelPanel'
import { SaidaPanel } from './SaidaPanel'
import { ThemeToggle } from './ThemeToggle'
import { SidebarLayoutControl } from './SidebarLayoutControl'
import { useSidebarExpand } from '../hooks/useSidebarExpand'
import type { SidebarMode } from '../lib/sidebarMode'
import type { Theme } from '../lib/theme'
import { type ComponentProps } from 'react'

type Props = {
  saving: boolean
  persistError: string | null
  theme: Theme
  onToggleTheme: () => void
  sidebarMode: SidebarMode
  onSidebarModeChange: (mode: SidebarMode) => void
  openSection: SidebarSectionId | null
  onOpenSectionChange: (id: SidebarSectionId | null) => void
  entrada: ComponentProps<typeof EntradaPanel>
  saida: ComponentProps<typeof SaidaPanel>
  editar: ComponentProps<typeof EditarPosicaoPanel>
  consulta: ComponentProps<typeof ConsultaEstoquePanel>
  historico: ComponentProps<typeof HistoricoPanel>
  painel: ComponentProps<typeof PainelPanel>
  canceladas: ComponentProps<typeof CanceladasPanel>
  imprimir: ComponentProps<typeof ImprimirPanel>
  cadastroVoz: ComponentProps<typeof CadastroVozPanel>
  onBeforeLeaveEntrada?: (proceed: () => void) => void
}

export function AppSidebar({
  saving,
  persistError,
  theme,
  onToggleTheme,
  sidebarMode,
  onSidebarModeChange,
  openSection,
  onOpenSectionChange,
  entrada,
  saida,
  editar,
  consulta,
  historico,
  painel,
  canceladas,
  imprimir,
  cadastroVoz,
  onBeforeLeaveEntrada,
}: Props) {
  function sectionOpenChange(id: SidebarSectionId, open: boolean) {
    if (open && id === 'painel') {
      onSidebarModeChange('fullscreen')
    }
    onOpenSectionChange(open ? id : null)
  }

  const guardOtherSection = (nextOpen: boolean, proceed: () => void) => {
    if (!nextOpen || !onBeforeLeaveEntrada) {
      proceed()
      return
    }
    onBeforeLeaveEntrada(proceed)
  }

  const guardEntradaSection = (nextOpen: boolean, proceed: () => void) => {
    if (nextOpen || !onBeforeLeaveEntrada) {
      proceed()
      return
    }
    onBeforeLeaveEntrada(proceed)
  }

  const { expanded, sidebarRef, onSidebarPointerDown, onMouseEnter, onMouseLeave } =
    useSidebarExpand(sidebarMode)

  const wide = expanded
  const pinnedOpen = sidebarMode === 'open' || sidebarMode === 'fullscreen'

  return (
    <aside
      ref={sidebarRef}
      className={[
        'sidebar',
        `sidebar--mode-${sidebarMode}`,
        wide ? 'sidebar--wide' : '',
        expanded && sidebarMode === 'collapsed' ? 'sidebar--expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={!pinnedOpen && !expanded ? 'Clique para abrir o menu' : undefined}
      onPointerDown={onSidebarPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="sidebar-layout">
      <div className="sidebar-body">
      <div className="sidebar-block sidebar-header">
        <div className="sidebar-header-brand">
          <img
            src="/logo-ultrafrio-vertical-azul.svg"
            alt=""
            aria-hidden
            className="sidebar-logo sidebar-logo--compact"
          />
          <img
            src="/logo-ultrafrio-horizontal-azul.svg"
            alt="Ultrafrio"
            className="sidebar-logo sidebar-logo--full"
          />
          <h1 className="app-brand-title">
            <span className="app-brand-title__main">Stock System</span>
            <span className="app-brand-title__light">Light</span>
          </h1>
        </div>
        <p className="muted">Ultrafrio · entrada e saída por NF-e</p>
        {saving && <p className="saving-hint">Salvando…</p>}
        {persistError && <p className="error">{persistError}</p>}
      </div>

      <CollapsibleSidebarSection
        id="consulta"
        title="Consulta estoque"
        open={openSection === 'consulta'}
        onOpenChange={(open) => sectionOpenChange('consulta', open)}
        onBeforeToggle={guardOtherSection}
      >
        <ConsultaEstoquePanel {...consulta} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection
        id="entrada"
        title="Entrada"
        open={openSection === 'entrada'}
        onOpenChange={(open) => sectionOpenChange('entrada', open)}
        onBeforeToggle={guardEntradaSection}
      >
        <EntradaPanel {...entrada} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection
        id="saida"
        title="Saída"
        open={openSection === 'saida'}
        onOpenChange={(open) => sectionOpenChange('saida', open)}
        onBeforeToggle={guardOtherSection}
      >
        <SaidaPanel {...saida} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection
        id="editar"
        title="Movimentação"
        open={openSection === 'editar'}
        onOpenChange={(open) => sectionOpenChange('editar', open)}
        onBeforeToggle={guardOtherSection}
      >
        <EditarPosicaoPanel {...editar} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection
        id="canceladas"
        title="NF cancelada"
        open={openSection === 'canceladas'}
        onOpenChange={(open) => sectionOpenChange('canceladas', open)}
        onBeforeToggle={guardOtherSection}
      >
        <CanceladasPanel {...canceladas} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection
        id="historico"
        title="Histórico"
        open={openSection === 'historico'}
        onOpenChange={(open) => sectionOpenChange('historico', open)}
        onBeforeToggle={guardOtherSection}
      >
        <HistoricoPanel {...historico} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection
        id="painel"
        title="Painel"
        open={openSection === 'painel'}
        onOpenChange={(open) => sectionOpenChange('painel', open)}
        onBeforeToggle={guardOtherSection}
      >
        <PainelPanel {...painel} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection
        id="cadastroVoz"
        title="Cadastro de voz"
        open={openSection === 'cadastroVoz'}
        onOpenChange={(open) => sectionOpenChange('cadastroVoz', open)}
        onBeforeToggle={guardOtherSection}
      >
        <CadastroVozPanel {...cadastroVoz} />
      </CollapsibleSidebarSection>

      <CollapsibleSidebarSection
        id="imprimir"
        title="Mapa"
        open={openSection === 'imprimir'}
        onOpenChange={(open) => sectionOpenChange('imprimir', open)}
        onBeforeToggle={guardOtherSection}
      >
        <ImprimirPanel {...imprimir} />
      </CollapsibleSidebarSection>
      </div>

      <div
        className="sidebar-bottom-bar"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <SidebarLayoutControl mode={sidebarMode} onChange={onSidebarModeChange} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      </div>
    </aside>
  )
}
